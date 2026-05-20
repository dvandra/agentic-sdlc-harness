# Design Document: Resource Optimization Operator (ROO)

## Context

Enterprise OpenShift Container Platform (OCP) clusters managed via Advanced Cluster Management (ACM) lack a unified, AI-driven, closed-loop resource optimization system. Today's tooling — VPA, HPA, KEDA, Cluster Resource Override, Cost Management Operator — addresses individual concerns but leaves critical gaps:

- No **forecasting** or **historical pattern recognition** for proactive scaling
- No **GPU-aware** right-sizing (MIG partitions, time-slicing, inference vs training)
- No **VM-aware** optimization (KubeVirt vCPU/memory/NUMA/balloon)
- No **auto-correction with rollback** based on SLO burn-rate
- No **multi-cluster federated learning** across ACM-managed fleets
- No unified **FinOps-weighted** recommendation engine

ROO fills these gaps as a Kubernetes-native operator that integrates into the existing ACM/COO/MCOA dependency chain.

## Impact Map Reference

See: `docs/impact-maps/roo-impact-map.md`

## Design Decisions

### Decision 1: Operator-native vs External SaaS Platform

**Options considered:**
1. **External SaaS** (Densify, CAST AI, StormForge) — Fast to deploy, but vendor lock-in, limited OCP-native integration, air-gap incompatible, no GPU/VM specialization
2. **Kubernetes-native Operator** (ROO) — Full OLM lifecycle, CRD-driven, ACM policy propagation, air-gap friendly, extensible

**Chosen**: Option 2 — Kubernetes-native Operator  
**Rationale**: Aligns with Kubernetes operator ecosystem patterns (ACM→MCO, MCOA→COO), enables air-gap deployment, deep integration with OCP primitives, and allows federated learning across ACM hub-spoke topology.

### Decision 2: ML Serving Architecture

**Options considered:**
1. **Embedded ML in operator binary** — Simple deployment, but limits model size and update frequency
2. **KServe / OpenShift AI model serving** — Knative-based, canary deployment, multi-model, scales independently

**Chosen**: Option 2 — KServe on OpenShift AI  
**Rationale**: Decouples model lifecycle from operator lifecycle; supports GPU-accelerated inference for complex forecasting models; enables A/B testing of recommendation models.

### Decision 3: Hub-Spoke vs Flat Architecture

**Options considered:**
1. **Flat** — Each cluster runs full ROO stack independently
2. **Hub-Spoke** — AI engine on hub, lightweight agents on spokes, federated learning

**Chosen**: Option 2 — Hub-Spoke via ACM  
**Rationale**: Federated learning improves model quality across fleet; centralized policy governance; cost-efficient (one ML platform vs N); matches ACM operational model.

### Decision 4: Execution Safety Model

**Options considered:**
1. **Direct mutation** — Operator patches resources immediately
2. **GitOps PR-based** — Recommendations become PRs to GitOps repos
3. **Tiered automation** — Confidence/risk-based: auto-apply (high confidence, low risk), human-review (medium), block (low confidence or critical)

**Chosen**: Option 3 — Tiered Automation  
**Rationale**: Builds trust progressively; high-confidence changes (e.g., 10% CPU request reduction on a stateless web app) auto-apply; risky changes (MachineConfig, GPU MIG reconfig) require human approval. Optional GitOps integration for organizations requiring it.

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACM HUB CLUSTER                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              ROO Hub Controller                          │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐            │       │
│  │  │ Policy   │ │ Global   │ │ Experiment   │            │       │
│  │  │ Distrib. │ │ Aggreg.  │ │ Orchestrator │            │       │
│  │  └──────────┘ └──────────┘ └──────────────┘            │       │
│  └──────────────────────────────────────────────────────────┘       │
│                          │                                          │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              ML Platform (KServe / OpenShift AI)         │       │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐             │       │
│  │  │ Forecast  │ │ Anomaly   │ │ GPU/VM    │             │       │
│  │  │ Models    │ │ Detection │ │ Optimizers│             │       │
│  │  └───────────┘ └───────────┘ └───────────┘             │       │
│  └──────────────────────────────────────────────────────────┘       │
│                          │                                          │
│  ┌───────────┐  ┌────────────────┐  ┌──────────────┐               │
│  │ Thanos    │  │ MCOA Global    │  │ Cost Mgmt    │               │
│  │ Query     │  │ View           │  │ Aggregation  │               │
│  └───────────┘  └────────────────┘  └──────────────┘               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ gRPC/HTTPS + CR sync
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  SPOKE A      │  │  SPOKE B      │  │  SPOKE C      │
│               │  │               │  │               │
│ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │
│ │ROO Agent  │ │  │ │ROO Agent  │ │  │ │ROO Agent  │ │
│ │ ┌───────┐ │ │  │ │ ┌───────┐ │ │  │ │ ┌───────┐ │ │
│ │ │Collect│ │ │  │ │ │Collect│ │ │  │ │ │Collect│ │ │
│ │ │Score  │ │ │  │ │ │Score  │ │ │  │ │ │Score  │ │ │
│ │ │Execute│ │ │  │ │ │Execute│ │ │  │ │ │Execute│ │ │
│ │ └───────┘ │ │  │ │ └───────┘ │ │  │ │ └───────┘ │ │
│ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │
│               │  │               │  │               │
│ COO + VPA +   │  │ COO + VPA +   │  │ COO + VPA +   │
│ GPU Op +      │  │ KEDA +        │  │ KubeVirt +    │
│ Prometheus    │  │ Prometheus    │  │ Prometheus    │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Layered Architecture Detail

#### Layer 1: Data Collection

| Source | Metrics | Integration |
|--------|---------|-------------|
| Prometheus/Thanos | CPU, memory, network, disk IOPS | ServiceMonitor/PodMonitor via COO |
| MCOA | Multi-cluster federated metrics | Thanos receive path on hub |
| DCGM Exporter | GPU utilization, memory, power, ECC, throttle | GPU Operator auto-deploys |
| KubeVirt metrics | vCPU steal/ready, balloon, NUMA, migration | OpenShift Virtualization |
| Cloud billing APIs | On-demand/spot pricing, RI coverage | External Secrets + cloud SDK |
| Cost Management Operator | Namespace-level cost allocation | CostManagementMetricsConfig CR |
| Application exporters | Custom business metrics (queue depth, etc.) | User-defined ServiceMonitor |

#### Layer 2: Intelligence (AI/ML Engine)

**Historical Analysis Engine:**
- Analyzes 7/14/30/90-day resource usage patterns per container/VM
- Identifies workload classes: steady-state, bursty, periodic, event-driven
- Computes percentile-based resource envelopes (P95, P99, P99.9)
- Detects day-of-week, time-of-day, month-end, fiscal-close seasonality

**Real-Time Recommendation Engine:**
- Sliding-window feature extraction (5m, 15m, 1h, 6h)
- Online scoring against deployed models
- Sub-second latency for autoscaling decisions
- Differential recommendations (delta from current → proposed)

**Forecasting Engine:**
- **Short-term (minutes→hours):** EWMA + TCN for autoscaling pre-warming
- **Medium-term (days→weeks):** Prophet/SARIMA with event regressors for right-sizing
- **Long-term (months→quarters):** Gradient-boosted models for capacity planning + procurement

**Anomaly Detection:**
- Robust z-score + seasonal decomposition on CPU throttling, OOM precursors, queue depth
- Bayesian changepoint detection tied to rollout events (ArgoCD/Flux annotations)
- GPU-specific: thermal throttling, ECC error rate, NVLink degradation

**GPU Optimization Model:**
- MIG partition recommendations based on SM utilization + memory watermark
- Time-slicing configuration (# contexts, scheduling policy)
- Inference batch-size tuning vs latency SLO
- Training checkpoint I/O overlap optimization

**VM Optimization Model:**
- vCPU right-sizing factoring steal-time and ready-queue metrics
- Memory balloon target based on guest working-set (requires guest agent)
- NUMA topology alignment scoring
- Live migration feasibility assessment (dirty-page rate, device attachments)

#### Layer 3: Decision Engine

**Confidence Scoring:**
- Multi-factor: data sufficiency (coverage of time windows), model agreement (ensemble consensus), historical accuracy of similar recommendations
- Score range: 0.0 → 1.0, thresholds configurable per `ResourceOptimizationPolicy`

**Risk Assessment:**
- Workload criticality (labels/annotations + namespace classification)
- Change magnitude (% delta from current resources)
- Blast radius (# pods affected, # dependent services)
- Time-of-day risk factor (business hours vs maintenance windows)

**Policy Engine:**
- Organizational constraints: min/max resource bounds, golden ratios, compliance
- Cost optimization vs performance optimization weighting
- Namespace/team-level overrides
- Integration with OPA/Gatekeeper for validation

**Approval Workflows:**

| Confidence | Risk | Action |
|-----------|------|--------|
| ≥ 0.92 | Low | Auto-apply |
| 0.75 – 0.92 | Low-Medium | Human review (Slack/PagerDuty/ITSM) |
| < 0.75 | Any | Block (recommend only) |
| Any | High/Critical | Human review mandatory |
| Any | Any | Block if `ClusterOperator` Degraded/Progressing |

#### Layer 4: Execution Engine

**VPA Integration:**
- Create/update `VerticalPodAutoscaler` CRs with computed recommendations
- Respect `updatePolicy` modes (Off/Initial/Recreate/Auto)
- In-place resize where OCP version supports it

**HPA Tuning:**
- Adjust `minReplicas`, `maxReplicas`, target utilization percentages
- Recommend custom metrics targets based on queue-depth forecasts
- Coordinate VPA+HPA to avoid conflict (VPA sets requests, HPA scales replicas)

**Resource Quota Management:**
- Adjust namespace `ResourceQuota` based on aggregate workload recommendations
- Update `LimitRange` defaults to match recommended baselines
- `ClusterResourceQuota` adjustments via ACM policy propagation

**Node Pool Optimization:**
- Scale `MachineSet` replicas based on capacity forecasts
- Recommend instance type changes (cloud) via `MachineSet` spec patches
- Spot/preemptible node pool expansion for fault-tolerant workloads

**GPU Reallocation:**
- Patch GPU Operator `ClusterPolicy` for MIG/time-slicing changes
- Reschedule workloads to optimally-partitioned GPUs
- Coordinate with node drain for MIG reconfiguration

**VM Resource Adjustment:**
- Patch `VirtualMachine` spec for CPU/memory changes
- Trigger `VirtualMachineInstanceMigration` for live changes
- Adjust balloon targets via guest agent interface

**Rollback Engine:**
- Pre-change snapshot stored as ConfigMap/Secret
- SLO burn-rate monitoring post-change (configurable observation window)
- Automatic rollback if error budget exceeds threshold
- Rollback cascade for multi-step actions (reverse order)

#### Layer 5: Feedback Loop

- Track recommendation accuracy: predicted vs actual resource usage post-change
- Model retraining triggers: accuracy drift > threshold, new workload class detected
- A/B testing: split traffic between recommendation strategies
- Drift detection: alert when applied resources diverge from recommendation over time

### Operator Dependency Chain

```
ACM (Hub)
├── MCOA (Multicluster Observability)
│   └── depends on: COO (Cluster Observability Operator)
│
├── ROO (Resource Optimization Operator)
│   ├── REQUIRED: COO (metrics collection, Perses dashboards)
│   ├── REQUIRED: VPA Operator (vertical scaling execution)
│   ├── REQUIRED: Prometheus / Monitoring stack
│   ├── OPTIONAL: KEDA (event-driven scaling)
│   ├── CONDITIONAL: NVIDIA GPU Operator (when GPU nodes exist)
│   ├── CONDITIONAL: OpenShift Virtualization (when VMs exist)
│   ├── OPTIONAL: Cost Management Operator (FinOps weighting)
│   ├── OPTIONAL: Node Tuning Operator (NUMA/performance profiles)
│   └── OPTIONAL: Gatekeeper Operator (policy validation)
│
├── MCO (Machine Config Operator) — node-level changes
└── Cost Management Operator — financial allocation
```

### CRD API Design

**API Group:** `optimization.openshift.io`

#### ResourceOptimizationPolicy (Cluster-scoped)

Defines global optimization rules, SLO guardrails, automation levels.

```yaml
apiVersion: optimization.openshift.io/v1alpha1
kind: ResourceOptimizationPolicy
metadata:
  name: default
spec:
  targetClusterSelector:
    matchLabels:
      roo.example.com/tier: production
  automationProfile: AutoApplyConservative
  confidenceThresholds:
    autoApplyMin: 0.92
    humanReviewMin: 0.75
  riskCaps:
    maxMemoryDeltaPercent: 25
    maxCpuDeltaMillicores: 500
  constraints:
    minCpuMillicores: 50
    maxCpuMillicores: 32000
    minMemoryBytes: 268435456
    maxMemoryBytes: 128849018880
  costWeighting:
    enabled: true
  sloHooks:
    prometheusQueries:
      burnRate5m: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))'
    maxErrorBudgetBurn: 0.02
  gpu:
    allowMigReconfigure: false
    allowTimeSlicing: true
  virtualization:
    allowLiveMigrateForResize: true
```

#### OptimizationProfile (Cluster-scoped)

Workload class definitions mapping to model selection and feature windows.

```yaml
apiVersion: optimization.openshift.io/v1alpha1
kind: OptimizationProfile
metadata:
  name: ml-training-gpu
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: trainer
  hints:
    workloadClass: MLTraining
  models:
    forecast: "tcn-gpu-forecast-v3"
    anomaly: "robust-zscore-gpu"
    gpuOptimizer: "mig-recommender-v2"
  featureWindows:
    short: 6h
    medium: 14d
    long: 90d
```

#### ResourceRecommendation (Namespaced)

Individual typed recommendations bound to a workload.

```yaml
apiVersion: optimization.openshift.io/v1alpha1
kind: ResourceRecommendation
metadata:
  name: api-checkout-7d4fk
  namespace: checkout
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  profileRef:
    name: web-default
  horizon: MediumTerm
  recommendation:
    containers:
      - name: api
        resources:
          requests:
            cpu: "1200m"
            memory: "768Mi"
          limits:
            cpu: "2"
            memory: "1Gi"
status:
  phase: PendingApproval
  confidence:
    score: 0.88
  risk:
    level: Low
```

#### ResourceForecast (Namespaced)

Time-series predictions as first-class API objects.

```yaml
apiVersion: optimization.openshift.io/v1alpha1
kind: ResourceForecast
metadata:
  name: api-weekly
  namespace: checkout
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  horizons:
    - name: short
      lookahead: 2h
      step: 1m
    - name: medium
      lookahead: 14d
      step: 1h
status:
  lastSuccessfulSync: "2026-05-16T11:55:00Z"
```

#### OptimizationAction (Namespaced)

Immutable execution intent with rollback capability.

```yaml
apiVersion: optimization.openshift.io/v1alpha1
kind: OptimizationAction
metadata:
  name: apply-api-recommendation-001
  namespace: checkout
spec:
  recommendationRef:
    name: api-checkout-7d4fk
  executionPlan:
    steps:
      - type: PatchVPA
        vpaName: api-vpa
      - type: PatchHPA
        hpaName: api-hpa
        patch:
          minReplicas: 5
          maxReplicas: 50
    rollbackOnSLOBreach: true
status:
  phase: Succeeded
  preSnapshot:
    configMapRef: roo-snapshot-pre-api-001
  postValidation:
    latencyP95DeltaPercent: -3.1
    oomKillsDelta: 0
  rollback:
    triggered: false
```

### Data Flow

#### Real-Time Recommendation Flow

```
Prometheus/DCGM/KubeVirt
       │
       ▼
  ROO Spoke Agent
  (feature extraction: 5m/15m/1h/6h windows)
       │
       ▼
  KServe Inference Service
  (model scoring + uncertainty quantification)
       │
       ▼
  Policy Engine
  (confidence check → risk assessment → SLO validation)
       │
       ├── Auto-apply ────► OptimizationAction CR ──► VPA/HPA/Quota patch
       ├── Human review ──► ResourceRecommendation (PendingApproval)
       └── Block ─────────► ResourceRecommendation (RecommendOnly)
```

#### Forecasting Pipeline

```
Thanos Long-Term Store
       │
       ▼
  Feature Batch Jobs (CronJob, 6h cadence)
  (recording rules + aggregations)
       │
       ├──► Short-term: EWMA + TCN → HPA pre-warming signals
       ├──► Medium-term: Prophet/SARIMA → ResourceRecommendation
       └──► Long-term: GBM → Capacity planning reports
              │
              ▼
       ResourceForecast CRs
       (series URI → object storage)
```

#### Auto-Correction & Rollback State Machine

```
[Planned] → [PreSnapshot] → [Executing] → [PostCheck]
                                              │
                              ┌───────────────┤
                              ▼               ▼
                        [RolledBack]     [Succeeded]
                              │
                              ▼
                         [Failed]
```

### Multi-Cluster Architecture via ACM

**Hub responsibilities:**
- Global model training and serving (KServe/OpenShift AI)
- Policy distribution via ACM governance
- Cross-cluster placement optimization
- Federated learning aggregation
- Fleet-wide capacity planning and FinOps reporting

**Spoke agent responsibilities:**
- Local metrics collection and feature extraction
- Online scoring against hub-distributed models
- Local policy evaluation and enforcement
- Action execution with rollback
- Gradient/statistics upload for federated learning

**Federated Learning Pattern:**
- Spokes compute sufficient statistics on local time windows
- Hub aggregates into global model with per-cluster calibration layer
- Model revisions distributed as OCI artifacts or ConfigMaps
- Privacy-preserving: raw metrics never leave the spoke

---

## Technology Stack

| Concern | Technology | Rationale |
|---------|-----------|-----------|
| Operator framework | operator-sdk (Go) + kubebuilder | Standard for Kubernetes operators, FIPS-friendly, strong OLM lifecycle |
| ML Serving | KServe on OpenShift AI | Knative-based autoscaling, canary, multi-model serving |
| Batch Training | Kubeflow Pipelines + MLflow | GitOps-able training pipelines, artifact versioning |
| Time-series DB | Thanos (via MCOA) | Aligns with ACM multicluster observability stack |
| Stream Processing | Kafka (AMQ Streams) | Feature vector streaming, action audit trail |
| Policy Engine | OPA via Gatekeeper Operator | Enterprise standard, ConstraintTemplate extensibility |
| Dashboards | Perses via COO | Matches COO/MCOA direction, consistent UX |
| GPU Telemetry | NVIDIA DCGM Exporter | Industry standard, GPU Operator auto-deploys |
| VM Telemetry | KubeVirt infra metrics + node-exporter | NUMA-aware VM sizing |
| Secrets | External Secrets Operator | Cloud billing keys without long-lived secrets in ROO |

---

## Implementation Plan

1. **Phase 0 — Read-Only Recommendations** — can start immediately
   - Deploy ROO spoke agent with Prometheus integration
   - Implement VPA-style recommender with historical percentile analysis
   - Perses dashboards via COO for recommendation visualization
   - No execution; `ResourceRecommendation` CRs in `RecommendOnly` status

2. **Phase 1 — Conservative Auto-Apply** — depends on Phase 0 validation
   - Policy engine with confidence/risk scoring
   - VPA alignment mode (recommendations match VPA recommender)
   - HPA parameter nudges within tight caps (±10%)
   - Rollback engine with SLO burn-rate gates

3. **Phase 2 — FinOps Integration** — can parallelize with Phase 1
   - Cost Management Operator integration
   - Cost-weighted recommendations (optimize $/request, not just utilization)
   - Cross-cluster placement hints via ACM
   - Capacity planning forecasts (long-term models)

4. **Phase 3 — GPU & VM Optimization** — depends on Phase 1
   - DCGM integration for GPU workload profiling
   - MIG partition and time-slicing recommendations
   - KubeVirt VM right-sizing with live migration
   - NUMA topology optimization
   - Domain-specific ML models for GPU/VM workloads

5. **Phase 4 — Federated Learning & Experimentation** — depends on Phase 2+3
   - Hub-spoke federated model training
   - A/B testing of recommendation strategies via `Experiment` CRDs
   - Self-improving models with outcome tracking
   - Global fleet optimization across ACM-managed clusters

---

## Rollback Strategy

1. Every `OptimizationAction` captures a pre-change snapshot (stored as ConfigMap)
2. Post-change SLO monitoring with configurable observation window (default: 15m)
3. Automatic rollback if error budget burn exceeds `maxErrorBudgetBurn` threshold
4. Multi-step rollbacks execute in reverse order
5. Failed rollbacks trigger PagerDuty/ITSM escalation
6. All actions are idempotent and re-entrant via server-side apply

---

## Security Considerations

- ROO spoke agents use least-privilege ServiceAccounts scoped to optimization CRDs + target workload resources
- Hub-spoke communication via mTLS (ACM agent framework)
- Cloud billing credentials managed via External Secrets Operator, never stored in ROO CRs
- Audit trail: every auto-apply generates Kubernetes Event + Kafka audit message
- Multi-tenant isolation: spoke agents cannot access cross-namespace metrics without explicit RBAC
- etcd safety: large data (forecast series, SHAP explanations) stored in object storage, CRs hold URI references only

---

## Performance Impact

- Spoke agent memory: ~128Mi baseline + ~50Mi per 100 monitored workloads
- Prometheus query load: recording rules pre-aggregate; ROO queries aggregated metrics, not raw series
- KServe inference: <100ms P99 for single recommendation scoring
- Action execution: sequential steps with configurable inter-step delays for observability
- Forecast batch jobs: scheduled off-peak, resource-limited via Job resource requests

---

## Appendix A: Existing ACM Right-Sizing Metrics (Grounded in Real Code)

Analysis of the actual multicluster-observability-operator and multicluster-observability-addon codebases reveals the exact metrics and architecture ROO should leverage.

### Current Right-Sizing Migration: MCO → MCOA

As of MCOA PR #449/#471/#475, right-sizing is migrating from MCO's Policy-based approach to MCOA's ManifestWork-based approach. The key commit (`b21c48f`) adds `internal/analytics/rightsizing/` module to MCOA with:

- **RuleBuilder** (`rulebuilder.go`): Shared utility with `Rule()` (namespace-level with optional label join) and `ClusterRule()` methods
- **Namespace PrometheusRule generator** (`namespace/prometheusrule.go`): 4 rule groups
- **Virtualization PrometheusRule generator** (`virtualization/prometheusrule.go`): 4 rule groups
- **ScrapeConfig generator** (`scrapeconfig.go`): Federation from spoke to hub
- **ADC integration** (`options.go`): `platformNamespaceRightSizing` and `platformVirtualizationRightSizing` keys

### Exact Metrics from `metrics_allowlist.yaml`

**Container/Namespace Right-Sizing (`acm_rs:`):**

| Metric | Level | What it measures |
|--------|-------|-----------------|
| `acm_rs:namespace:cpu_request_hard` | Namespace | ResourceQuota hard limit for CPU requests |
| `acm_rs:namespace:cpu_request` | Namespace | Actual CPU requests from pods |
| `acm_rs:namespace:cpu_usage` | Namespace | Actual CPU usage (sum_irate) |
| `acm_rs:namespace:cpu_recommendation` | Namespace | Recommended CPU = max_usage * (recommendationPercentage/100) |
| `acm_rs:namespace:memory_request_hard` | Namespace | ResourceQuota hard limit for memory requests |
| `acm_rs:namespace:memory_request` | Namespace | Actual memory requests from pods |
| `acm_rs:namespace:memory_usage` | Namespace | Working set bytes |
| `acm_rs:namespace:memory_recommendation` | Namespace | Recommended memory |
| `acm_rs:cluster:cpu_*` | Cluster | Same metrics aggregated at cluster level |
| `acm_rs:cluster:memory_*` | Cluster | Same metrics aggregated at cluster level |

**VM Right-Sizing (`acm_rs_vm:`):**

| Metric | Level | What it measures |
|--------|-------|-----------------|
| `acm_rs_vm:namespace:cpu_request` | Namespace | vCPU count from `kubevirt_vmi_vcpu_seconds_total` |
| `acm_rs_vm:namespace:cpu_usage` | Namespace | VM CPU usage rate from `kubevirt_vmi_cpu_usage_seconds_total` |
| `acm_rs_vm:namespace:cpu_recommendation` | Namespace | Recommended VM CPU |
| `acm_rs_vm:namespace:memory_request` | Namespace | VM memory from `kubevirt_vm_resource_requests{resource="memory"}` |
| `acm_rs_vm:namespace:memory_usage` | Namespace | `kubevirt_vmi_memory_available_bytes - kubevirt_vmi_memory_usable_bytes` |
| `acm_rs_vm:namespace:memory_recommendation` | Namespace | Recommended VM memory |
| `acm_rs_vm:cluster:*` | Cluster | Same metrics aggregated at cluster level |

### Source PromQL Expressions (from actual codebase)

**Namespace CPU Usage (5m window):**
```promql
max_over_time(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{
    namespace!~"openshift.*", container!=""}) by (namespace)[5m:])
```

**Namespace Memory Usage (5m window):**
```promql
max_over_time(sum(container_memory_working_set_bytes{
    namespace!~"openshift.*", container!=""}) by (namespace)[5m:])
```

**Recommendation Formula (1d aggregation):**
```promql
max_over_time(acm_rs:namespace:cpu_usage:5m[1d]) * (110/100)
```
Default `recommendationPercentage` = 110 (configurable via ConfigMap `rs-namespace-config`)

**VM CPU Usage (5m window):**
```promql
max_over_time(sum(rate(kubevirt_vmi_cpu_usage_seconds_total{
    namespace!~"openshift.*"}[5m:])) by (name,namespace)[5m:])
```

**VM Memory Usage (5m window):**
```promql
max_over_time(sum(kubevirt_vmi_memory_available_bytes{namespace!~"openshift.*"} -
    kubevirt_vmi_memory_usable_bytes{namespace!~"openshift.*"}) by (name,namespace)[5m:])
```

### Architecture Pattern ROO Should Leverage

```
ADC (AddOnDeploymentConfig)
  → platformNamespaceRightSizing=enabled
  → platformVirtualizationRightSizing=enabled
      ↓
MCOA OptionsBuilder reads ADC keys
  → Checks Placement for cluster selection
  → Generates PrometheusRules + ScrapeConfig
      ↓
Helm chart renders into ManifestWork
  → Addon framework deploys to spoke cluster
      ↓
Spoke Prometheus evaluates recording rules
  → 5m rules: high-resolution snapshots
  → 1d rules (eval every 15m): aggregated with profile/aggregation labels
      ↓
ScrapeConfig federates acm_rs_* metrics to hub Thanos
  → /federate endpoint with match[] params
  → labeldrop: managed_cluster, id
      ↓
Hub dashboards (Grafana/Perses) query Thanos
  → Runtime aggregation across 5/10/30/60/90/120 days
```

### What ROO Can Leverage Directly

1. **All `acm_rs:*` and `acm_rs_vm:*` metrics** — These are already federated to the hub. ROO's ML models can consume them as-is for historical analysis and forecasting.
2. **The RuleBuilder pattern** — ROO can extend it to add `acm_roo:*` metrics (e.g., forecasted values, confidence scores, GPU metrics).
3. **The ScrapeConfig federation pattern** — ROO can add its own ScrapeConfig for GPU/custom metrics.
4. **The Placement-based cluster selection** — ROO can reuse the same pattern for targeting optimization to specific clusters.
5. **The ConfigMap-based configuration** — ROO can follow the same `rs-*-config` pattern for its own `roo-*-config` ConfigMaps.

### Gaps ROO Must Fill

| Gap | Current State | ROO Addition |
|-----|--------------|--------------|
| Forecasting | None — only max_over_time aggregation | ML models predicting future resource demand |
| Recommendation intelligence | Static percentage (110% of peak) | Dynamic confidence-scored recommendations based on workload patterns |
| GPU metrics | Not in `acm_rs:*` metrics | Add `acm_roo:gpu:*` via DCGM exporter integration |
| Auto-correction | None — dashboard-only | Closed-loop execution via VPA/HPA patches |
| Anomaly detection | None | Statistical + ML anomaly detection on `acm_rs:*` time series |
| Cost weighting | Not integrated | Combine with Cost Management Operator data |
| Per-container granularity | Namespace-level only | Container-level recommendations |

### Additional Allowlisted Metrics Available for ROO

From the `metrics_allowlist.yaml`, ROO can also leverage these already-federated metrics:

**Container-level (via dynamic collection on SNO or always-on otherwise):**
- `container_cpu_cfs_periods_total` / `container_cpu_cfs_throttled_periods_total` — CPU throttling detection
- `container_memory_cache` / `container_memory_rss` / `container_memory_swap` / `container_memory_working_set_bytes` — Memory breakdown
- `kube_pod_container_resource_limits` / `kube_pod_container_resource_requests` — Current requests/limits

**KubeVirt-specific (already allowlisted):**
- `kubevirt_vmi_vcpu_delay_seconds_total` — vCPU scheduling delay (steal time proxy)
- `kubevirt_vmi_vcpu_wait_seconds_total` — vCPU wait time
- `kubevirt_vmi_memory_cached_bytes` / `kubevirt_vmi_memory_swap_*` — Memory details
- `kubevirt_vmi_storage_iops_*` / `kubevirt_vmi_storage_*_traffic_bytes_total` — Disk I/O
- `kubevirt_vmi_network_*` — Network I/O
- `kubevirt_vmi_migration_*` — Migration tracking

**Cluster capacity:**
- `cluster:capacity_cpu_cores:sum` / `cluster:capacity_memory_bytes:sum`
- `kube_node_status_allocatable` / `kube_node_status_capacity`
- `machine_cpu_cores` / `machine_memory_bytes`

---

## Appendix B: Chatbot Plugin for ROO Dashboard

### Concept: AI-Powered Optimization Assistant

An interactive chatbot embedded in the ROO dashboard (Perses or OCP Console) that allows users to ask natural-language questions about their cluster resource optimization.

### Architecture: Leveraging OpenShift Lightspeed Pattern

The `openshift/lightspeed-console` project provides the exact pattern we need:

- **Dynamic plugin** that injects a floating chat popover into the OCP Console
- **Plugin proxy** for backend API calls (avoids CORS, leverages console auth)
- **Kubernetes context attachment** — users can attach resource YAML, logs, events

ROO should implement a similar pattern with two deployment options:

#### Option 1: OCP Console Dynamic Plugin (Primary)

```
┌─────────────────────────────────────────┐
│  OCP Console                            │
│  ┌─────────────────────────────────┐    │
│  │  ROO Console Plugin             │    │
│  │  (webpack module federation)    │    │
│  │                                 │    │
│  │  ┌──────────┐  ┌────────────┐  │    │
│  │  │ Dashboard │  │ Chat       │  │    │
│  │  │ Views     │  │ Popover    │  │    │
│  │  └──────────┘  └─────┬──────┘  │    │
│  └───────────────────────┼─────────┘    │
│                          │ plugin proxy  │
└──────────────────────────┼──────────────┘
                           │
              ┌────────────▼────────────┐
              │  ROO Backend API        │
              │  /v1/chat               │
              │  /v1/recommendations    │
              │  /v1/forecasts          │
              ├─────────────────────────┤
              │  LLM Integration        │
              │  ┌──────────────────┐   │
              │  │ RAG Pipeline     │   │
              │  │ (Prometheus +    │   │
              │  │  CRD context)    │   │
              │  └──────────────────┘   │
              └─────────────────────────┘
```

#### Option 2: Perses Panel Plugin (for COO-integrated dashboards)

Using Perses plugin architecture (React + rsbuild + module federation):
- Custom **Panel plugin** that renders a chat interface within a Perses dashboard
- Backend CUE schema for validation
- Queries ROO backend API directly

### Chatbot Capabilities

**Questions it can answer using ROO's models:**

| Category | Example Questions |
|----------|-----------------|
| **Right-sizing** | "Which namespaces are most over-provisioned?" / "What should the CPU request be for deployment X?" |
| **Forecasting** | "Will we need more capacity next month?" / "What's the predicted peak for Black Friday?" |
| **Cost** | "How much can we save by applying all recommendations?" / "Which team is spending the most?" |
| **Anomaly** | "Why did memory spike in namespace Y last night?" / "Are there any unusual resource patterns?" |
| **GPU** | "Which GPU workloads could use MIG instead of full GPUs?" / "What's our GPU utilization across the fleet?" |
| **VM** | "Which VMs are over-allocated on memory?" / "Can we safely reduce vCPUs on VM Z?" |
| **Actions** | "Apply the top 5 safe recommendations" / "Show me the rollback history for namespace Y" |
| **Explain** | "Why is this recommendation confidence only 75%?" / "What data was used for this forecast?" |

### RAG Pipeline Design

```
User Question
     │
     ▼
┌─────────────────────┐
│ Intent Classifier    │
│ (LLM or fine-tuned)  │
└─────────┬───────────┘
          │
     ┌────┴────┐
     ▼         ▼
┌─────────┐ ┌──────────────────┐
│ PromQL  │ │ CRD Context      │
│ Builder │ │ Retriever        │
│         │ │                  │
│ Generate│ │ ResourceRec CRs  │
│ queries │ │ Forecast CRs     │
│ from    │ │ Action CRs       │
│ intent  │ │ Policy CRs       │
└────┬────┘ └────────┬─────────┘
     │               │
     ▼               ▼
┌─────────────────────────┐
│ Thanos/Prometheus Query │
│ + CRD Data Merge        │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────┐
│ Response Generator   │
│ (LLM with context)   │
│                     │
│ - Natural language  │
│ - Charts/tables     │
│ - Action buttons    │
└─────────────────────┘
```

### LLM Backend Options

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **OLS Integration** | Extend OpenShift Lightspeed with ROO-specific tools | Reuses existing OLS infra, SSO | Coupling to OLS roadmap |
| **Dedicated LLM** | ROO-specific model served via KServe | Full control, specialized fine-tuning | More infrastructure |
| **Hybrid** | OLS for general questions, ROO models for optimization-specific | Best of both worlds | More complex routing |

Recommended: **Hybrid** — register ROO as a "tool" that OLS can invoke (aligning with the LLM tool-calling pattern), while also providing a standalone chat endpoint for Perses dashboards.

---

**STATUS**: AWAITING HUMAN REVIEW

