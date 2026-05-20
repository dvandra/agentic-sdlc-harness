# Repository Impact Map

## Feature

Resource Optimization Operator (ROO) — A fully automated, AI-driven resource optimization system for OCP clusters managed via ACM, covering containers, GPUs, and VMs with forecasting, real-time recommendations, and auto-correction.

## Source

Architecture exploration: right-sizing and resource optimization for OCP clusters via ACM operator ecosystem, including GPU and Virtualization workloads.

## Codebase Analysis Method

Grounded analysis of actual operator codebases and OCP ecosystem:
- **multicluster-observability-operator**: Read `metrics_allowlist.yaml` — identified all 24 `acm_rs:*` and `acm_rs_vm:*` right-sizing metrics plus 50+ base metrics (KubeVirt, container, node, cluster capacity)
- **multicluster-observability-addon**: Analyzed full `internal/analytics/rightsizing/` module including RuleBuilder, namespace/virtualization PrometheusRule generators, ScrapeConfig federation, ADC integration
- **right-sizing repo**: Identified 3-stage recommendation architecture (PrometheusRules → federation → Grafana aggregation)
- **OCP Console**: Analyzed dynamic plugin pattern for chatbot integration (webpack module federation, plugin proxy, context attachment)
- **perses/perses**: Analyzed plugin architecture (React + rsbuild + module federation, 5 plugin types including Panel)
- ACM operator dependency patterns (ACM→MCO, MCOA→COO via OLM CSV `spec.customresourcedefinitions.required`)
- NVIDIA GPU Operator CRDs (`ClusterPolicy nvidia.com/v1`) and DCGM exporter metrics
- OpenShift Virtualization (KubeVirt) APIs and live migration patterns

## Impact Map

### roo-operator (New Repository)

**Module**: `operators/roo`
**Confidence**: High

Changes:
- `cmd/manager/main.go` — Operator entrypoint, controller registration
- `api/v1alpha1/` — CRD type definitions (ResourceOptimizationPolicy, ResourceRecommendation, OptimizationProfile, ResourceForecast, OptimizationAction)
- `controllers/recommendation/` — Recommendation reconciler: watch workloads, query metrics, score, create ResourceRecommendation CRs
- `controllers/forecast/` — Forecasting reconciler: batch feature extraction, model inference, create ResourceForecast CRs
- `controllers/action/` — Action reconciler: execute approved recommendations, snapshot/rollback
- `controllers/policy/` — Policy reconciler: merge global + namespace policies, evaluate confidence/risk thresholds
- `pkg/metrics/` — Prometheus/Thanos query client, DCGM metric adapter, KubeVirt metric adapter
- `pkg/ml/` — KServe inference client, feature engineering, model versioning
- `pkg/execution/` — VPA/HPA/Quota/MachineSet/GPU/VM patchers with rollback
- `config/crd/` — CRD manifests generated from api/ types
- `config/rbac/` — RBAC manifests for spoke agent ServiceAccount
- `bundle/` — OLM bundle: CSV with required CRD dependencies (VPA, COO), optional dependencies (GPU Operator, KubeVirt)

Existing patterns to follow:
- `internal/analytics/rightsizing/rulebuilder.go` in MCOA — Reference for PrometheusRule construction (`Rule()`, `ClusterRule()`, `RuleWithLabels()`)
- `internal/analytics/rightsizing/scrapeconfig.go` in MCOA — Reference for ScrapeConfig federation to hub (`/federate` with `match[]` params)
- `internal/analytics/rightsizing/builder.go` in MCOA — Reference for `BuildNamespaceFilter()`, `BuildLabelJoin()`, ConfigMap parsing
- `internal/addon/options.go` in MCOA — Reference for ADC key-based feature gating (`platformNamespaceRightSizing`, `platformVirtualizationRightSizing`)
- `metrics_allowlist.yaml` in MCO — Reference for metric allowlisting and recording rules
- `internal/analytics/rightsizing/types.go` in MCOA — Reference for ConfigMap data structures (`RSPrometheusRuleConfig`, `RSConfigMapData`, `DefaultRecommendationPercentage=110`)
- `openshift/lightspeed-console` — Reference for OCP Console dynamic plugin with chat popover (webpack module federation, plugin proxy pattern)
- `VerticalPodAutoscaler` in `autoscaling.k8s.io` — Reference for recommendation CRD shape and recommender architecture
- `ClusterPolicy` in `nvidia.com/v1` — Reference for GPU Operator integration pattern
- `VirtualMachine` in KubeVirt API — Reference for VM resource mutation and migration triggers
- ACM `ConfigurationPolicy` — Reference for hub-to-spoke policy propagation pattern

Dependencies affected:
- COO (Cluster Observability Operator) — ROO consumes Perses dashboards and monitoring stack
- VPA Operator — ROO creates/updates VerticalPodAutoscaler CRs for execution
- NVIDIA GPU Operator — ROO reads DCGM metrics and patches ClusterPolicy for MIG/time-slicing
- OpenShift Virtualization — ROO patches VirtualMachine specs and triggers migrations
- Cost Management Operator — ROO reads CostManagementMetricsConfig for FinOps weighting
- MCOA — ROO hub controller queries federated Thanos for cross-cluster analysis; **reuses existing `acm_rs:*` and `acm_rs_vm:*` metrics** as base signals
- KServe / OpenShift AI — ROO deploys and queries ML inference services
- OpenShift Lightspeed (OLS) — ROO registers as a tool for chatbot integration; alternatively provides standalone chat API

### roo-console-plugin (New Repository)

**Module**: `console-plugin/`
**Confidence**: High

Changes:
- `src/components/ChatPopover/` — Chat popover component (follows `openshift/lightspeed-console` pattern)
- `src/components/Dashboard/` — ROO dashboard views (recommendations, forecasts, actions)
- `src/api/` — ROO backend API client (recommendations, chat, forecasts)
- `src/rag/` — Intent classifier, PromQL builder, CRD context retriever
- `plugin-manifest.json` — OCP Console dynamic plugin manifest
- `webpack.config.ts` — Module federation configuration

Existing patterns to follow:
- `openshift/lightspeed-console` — Full OCP Console chatbot plugin implementation
- `openshift/console-plugin-template` — Standard dynamic plugin scaffolding
- Perses plugin SDK — For optional Perses panel plugin variant

Dependencies affected:
- OCP Console — Dynamic plugin registration
- ROO Backend API — Chat endpoint, recommendation queries
- OpenShift Lightspeed (optional) — Tool registration for hybrid approach

### roo-ml-models (New Repository)

**Module**: `models/`
**Confidence**: Medium

Changes:
- `models/forecast/` — Time-series forecasting models (TCN, Prophet, SARIMA)
- `models/anomaly/` — Anomaly detection models (robust z-score, Bayesian changepoint)
- `models/gpu-optimizer/` — MIG partition recommender, time-slicing optimizer
- `models/vm-optimizer/` — vCPU/memory/NUMA right-sizing model
- `pipelines/` — Kubeflow training pipelines
- `serving/` — KServe InferenceService manifests

Dependencies affected:
- KServe runtime — Model serving infrastructure
- Thanos — Training data source
- MLflow — Experiment tracking and model registry

### roo-dashboards (New Repository or submodule)

**Module**: `dashboards/`
**Confidence**: High

Changes:
- `dashboards/perses/` — Perses dashboard definitions for ROO optimization cockpit
- `dashboards/console-plugin/` — OCP console dynamic plugin for ROO recommendations view (optional)
- `prometheus-rules/` — Recording rules for feature pre-aggregation

Dependencies affected:
- COO / Perses Operator — Dashboard rendering
- OCP Console — Dynamic plugin registration

## Risks & Open Questions

- [ ] **VPA + HPA coordination:** VPA and HPA can conflict; ROO must implement conflict resolution (VPA adjusts requests, HPA scales replicas on utilization of those requests)
- [ ] **In-place pod resize:** Available in newer Kubernetes/OCP versions; ROO should detect capability and prefer in-place over restart
- [ ] **GPU MIG reconfiguration requires node drain:** MIG profile changes are disruptive; ROO must coordinate with MCO drain/reboot policies
- [ ] **KubeVirt guest agent dependency:** VM memory working-set metrics require guest agent; fallback to hypervisor-view metrics is less accurate
- [ ] **Federated learning privacy:** Some organizations may restrict cross-cluster data sharing; need configurable aggregation levels
- [ ] **etcd pressure from CRs:** High cardinality of ResourceRecommendation CRs at scale; need garbage collection and archival strategy
- [ ] **Model drift in production:** Forecasting models degrade over time; need automated drift detection and retraining triggers
- [ ] **Air-gap deployment:** ML model distribution in disconnected environments requires OCI artifact mirroring
- [ ] **OLM dependency resolution:** Complex dependency chain (COO + VPA + optional GPU/KubeVirt) may cause OLM resolver issues; test with operator-sdk scorecard
- [ ] **Multi-cloud cost normalization:** Different cloud providers have different billing models; cost weighting needs pluggable cost adapters
- [ ] **MCOA right-sizing coexistence:** ROO must coexist with MCOA's existing `acm_rs:*` metrics — consume them, don't replace them. Should ROO add its own `acm_roo:*` recording rules or extend MCOA's?
- [ ] **Recommendation granularity gap:** Current `acm_rs:*` metrics are namespace-level only; ROO needs per-container recommendations but the allowlist doesn't federate container-level `acm_rs:*` metrics
- [ ] **Chatbot LLM backend:** Which LLM approach? Extend OLS with ROO tools (coupling), dedicated model (infra cost), or hybrid? Need to evaluate latency and accuracy trade-offs
- [ ] **Chatbot action safety:** If chatbot can trigger OptimizationActions, need strict RBAC and confirmation flows to prevent accidental auto-apply from natural language

## Proposed Task Breakdown

1. CRD API design and validation webhooks — roo-operator — L
2. Spoke agent: Leverage existing `acm_rs:*`/`acm_rs_vm:*` metrics from MCOA — roo-operator — M
3. Spoke agent: Prometheus/Thanos metrics client (extend beyond `acm_rs:*` for container-level + GPU) — roo-operator — M
4. Spoke agent: Recommendation controller (CPU/memory, per-container) — roo-operator — L
5. Spoke agent: VPA/HPA execution adapters — roo-operator — M
6. Spoke agent: Rollback engine with SLO gates — roo-operator — M
7. Policy engine: Confidence/risk scoring — roo-operator — M
8. Hub controller: Policy distribution via ACM — roo-operator — M
9. Hub controller: Federated learning aggregation — roo-operator — L
10. Forecasting models: Short/medium/long-term — roo-ml-models — L
11. Anomaly detection models — roo-ml-models — M
12. GPU optimization: DCGM integration + MIG recommender — roo-operator + roo-ml-models — L
13. VM optimization: KubeVirt integration + right-sizing (extend `acm_rs_vm:*`) — roo-operator + roo-ml-models — L
14. Perses dashboards: Optimization cockpit — roo-dashboards — M
15. OCP Console dynamic plugin: ROO dashboard views — roo-console-plugin — M
16. Chatbot: Chat popover (OLS-pattern) with ROO backend integration — roo-console-plugin — L
17. Chatbot: RAG pipeline (intent classifier, PromQL builder, CRD context) — roo-operator — L
18. OLM bundle and lifecycle: CSV, scorecard, upgrade graph — roo-operator — M
19. E2E testing: Chaos engineering for auto-correction — roo-operator — L

---

**STATUS**: AWAITING HUMAN REVIEW
<!-- Do not proceed to task creation until this is approved -->

