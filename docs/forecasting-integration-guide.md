# Forecasting Integration Guide

> A comprehensive, presentation-ready guide on how forecasting is integrated into ACM Right-Sizing, how models are enabled, and how the pluggable provider architecture works — all built using an Agentic AI SDLC process.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [How Forecasting Is Integrated](#how-forecasting-is-integrated)
3. [Model Architecture](#model-architecture)
4. [Pluggable Provider System](#pluggable-provider-system)
5. [Data Privacy Guarantees](#data-privacy-guarantees)
6. [Dashboard Integration](#dashboard-integration)
7. [How We Built This: Agentic AI SDLC](#how-we-built-this-agentic-ai-sdlc)
8. [Key Takeaways](#key-takeaways)

---

## Executive Summary

The ACM Right-Sizing Prediction Engine adds **AI-powered resource forecasting** to OpenShift multicluster observability. It predicts future CPU, memory, GPU, and VM resource usage across all managed clusters — enabling proactive capacity planning instead of reactive troubleshooting.

**Key capabilities:**
- Multi-model ensemble forecasting (Holt-Winters, STL decomposition, Autoregressive)
- Covers 4 dimensions: Namespace, Workload/Pod, GPU, and Virtualization (VM)
- Zero data exfiltration with the default builtin provider
- User-pluggable model support (ONNX, External API, Custom Endpoint)
- Anomaly detection via model component disagreement
- Integrated directly into Perses dashboards with Forecast vs Actual panels

---

## How Forecasting Is Integrated

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. METRICS COLLECTION (Managed Clusters)                           │
│    PrometheusRules record acm_rs:* metrics on each spoke cluster   │
│    → Federated to hub via ScrapeConfig /federate endpoint          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. THANOS STORAGE (Hub Cluster)                                    │
│    Historical metrics stored in Thanos (7+ days)                   │
│    Queried via Thanos Query Frontend                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. TRAINING CONTROLLER (Hub — MCOA Addon Manager)                  │
│    Runs every trainingIntervalHours (default: 1h)                  │
│    Queries Thanos for historical usage data per cluster/namespace   │
│    Trains ensemble model → persists state in ConfigMap shards      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. FORECAST EXPORTER (Hub — MCOA Addon Manager)                    │
│    Prometheus Collector registered on /metrics endpoint             │
│    On every scrape: loads model state → queries recent data →      │
│    runs short-horizon forecast → emits acm_rs:prediction_* gauges  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. PROMETHEUS SCRAPE + THANOS (Hub)                                │
│    ServiceMonitor scrapes addon-manager /metrics                   │
│    Prediction metrics flow into Thanos                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. PERSES DASHBOARDS (Hub)                                         │
│    Forecast vs Actual panels in every RS dashboard                  │
│    Anomaly detection scores, model accuracy, ensemble weights      │
│    CPU/Memory Forecast columns in namespace quota tables            │
└─────────────────────────────────────────────────────────────────────┘
```

### Configuration Entry Point

Everything starts with the `MultiClusterObservability` CR:

```yaml
apiVersion: observability.open-cluster-management.io/v1beta2
kind: MultiClusterObservability
metadata:
  name: observability
spec:
  capabilities:
    platform:
      analytics:
        namespaceRightSizingRecommendation:
          enabled: true
        prediction:
          enabled: true
          provider:
            type: builtin        # or: onnx, external, custom
          config:
            trainingIntervalHours: 1
            historyDays: 7
```

### How the Config Flows

1. **MCO Operator** reads `prediction` spec from the CR
2. Syncs to **AddOnDeploymentConfig** (ADC) with key-value pairs
3. **MCOA Addon Manager** reads ADC keys at startup
4. Starts the **Training Controller** goroutine if prediction is enabled
5. Registers the **Forecast Exporter** as a Prometheus Collector

---

## Model Architecture

### Multi-Model Ensemble

The builtin provider uses three complementary statistical models:

| Model | Technique | Strength |
|-------|-----------|----------|
| **Holt-Winters** | Triple exponential smoothing | Captures trend + seasonality with minimal parameters |
| **STL** | Seasonal-Trend-Loess decomposition | Robust to outliers, separates signal components |
| **AR(p)** | Autoregressive with BIC order selection | Captures short-term temporal dependencies |

### How Ensemble Weighting Works

1. Each model is trained on 80% of the data, validated on the remaining 20%
2. Validation error measured as **MAPE** (Mean Absolute Percentage Error)
3. Ensemble weights are **inverse-MAPE**: lower error → higher weight
4. Weights update only when improvement exceeds 5% (stability guard)
5. Final forecast = weighted combination of all three model predictions

### Anomaly Detection

The engine detects anomalies via **component disagreement**:
- If all three models predict similar values → normal
- If models strongly disagree → anomalous (score approaches 1.0)
- Score = normalized standard deviation of model predictions

### What Gets Forecasted

| Dimension | Metrics | Labels |
|-----------|---------|--------|
| **Namespace** | `acm_rs:prediction_forecast_cpu`, `_memory` | namespace |
| **Workload** | `acm_rs:prediction_forecast_workload_cpu`, `_memory` | namespace, workload |
| **GPU** | `acm_rs:prediction_forecast_gpu_utilization`, `_memory` | namespace |
| **VM** | `acm_rs:prediction_forecast_vm_cpu`, `_memory` | namespace, workload |

Plus: `anomaly_score`, `model_accuracy`, `ensemble_weight` for each dimension.

---

## Pluggable Provider System

### Architecture

```
              ┌────────────────────────┐
              │   Provider Interface   │
              │   Train() + Forecast() │
              └────────┬───────────────┘
                       │
        ┌──────────────┼──────────────┐──────────────┐
        ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Builtin  │  │  ONNX    │  │ External │  │  Custom  │
  │ (Go)     │  │ (Model)  │  │  (API)   │  │(Endpoint)│
  │          │  │          │  │          │  │          │
  │ HW+STL   │  │ Customer │  │ Vendor   │  │ Customer │
  │ +AR(p)   │  │ .onnx    │  │ API Key  │  │ Server   │
  │          │  │ on-disk  │  │ Secret   │  │ URL      │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
  No network     No network    Consent req   Consent if
  Pure Go math   On-cluster    API key       not svc.local
```

### Provider Types

| Provider | Data Privacy | Configuration | Use Case |
|----------|-------------|---------------|----------|
| **builtin** | Zero exfiltration | None needed | Default — works out of the box |
| **onnx** | On-cluster only | ConfigMap with .onnx model | Customer-trained models |
| **external** | Requires consent | Secret with API key | Vendor prediction services |
| **custom** | Consent unless svc.local | Endpoint URL | Customer model servers |

### How Users Plug In Their Own Model

```yaml
# Option A: ONNX model from ConfigMap
prediction:
  enabled: true
  provider:
    type: onnx
    onnxModelConfigMapRef:
      name: my-forecast-model

# Option B: Custom model server (cluster-internal)
prediction:
  enabled: true
  provider:
    type: custom
    customEndpointURL: "http://forecast-svc.ml.svc.cluster.local:8080"

# Option C: External vendor API
prediction:
  enabled: true
  provider:
    type: external
    externalAPIKeySecretRef:
      name: vendor-api-key
    dataExfiltrationConsent: true  # Required!
```

---

## Data Privacy Guarantees

| Layer | Builtin | ONNX | External | Custom |
|-------|---------|------|----------|--------|
| Network calls | None | None | Yes (consent) | Depends |
| Data leaves cluster | Never | Never | Yes (consent) | Depends |
| NetworkPolicy | egress: [] | egress: [] | Scoped | Scoped |
| Consent required | No | No | Yes | If not svc.local |
| Audit metrics | Tracked | Tracked | Tracked | Tracked |

---

## Dashboard Integration

### What's New in the Dashboards

1. **Forecast Stat Panels** — CPU Forecast and Memory Forecast alongside existing Recommendation/Usage/Request/Utilization stats
2. **Forecast Table Columns** — CPU Forecast and Memory Forecast columns in the namespace quota tables
3. **Forecast vs Actual Charts** — Time-series panels comparing predicted vs observed values
4. **Anomaly Detection** — Composite anomaly score panel per namespace
5. **Model Accuracy** — MAPE-based accuracy metric displayed per namespace

### Dashboard Coverage

| Dashboard | Forecast Panels |
|-----------|----------------|
| **Namespace Overview** | CPU/Memory Forecast stats, table columns, Forecast vs Actual charts, Anomaly, Accuracy |
| **Workload/Pod** | Namespace-level stats, Workload Forecast vs Actual charts |
| **GPU Utilization** | GPU Util/Memory Forecast vs Actual charts |
| **VM Virtualization** | VM CPU/Memory Forecast vs Actual charts |

---

## How We Built This: Agentic AI SDLC

This entire prediction engine was designed, implemented, tested, and deployed using an **Agentic AI Software Development Lifecycle** — a structured, human-supervised AI workflow.

### The 5-Phase Process

```
Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
Impact Map  ──▶  Task Creation ──▶ Implementation ──▶  Testing   ──▶  CI Fix
                                                                       │
    ▲               ▲                                                  │
    │               │                                                  │
 Human           Human                                              Loop
 Review          Review                                            until
                                                                   green
```

### Skills Used

| Skill | Phase | What It Does |
|-------|-------|--------------|
| `@impact-map` | 1 | Scans real codebases, identifies affected files/modules, produces grounded impact map |
| `@task-creator` | 2 | Converts approved impact map into structured tasks with real file paths and patterns |
| `@developer` | 3 | Implements tasks following the plan exactly — no architectural freelancing |
| `@tester` | 4 | Writes unit, integration, and E2E tests matching acceptance criteria |
| `@ci-fixer` | 5 | Diagnoses CI failures, fixes lint/build/test issues, loops until green |
| `@babysit` | 5 | Monitors PR, resolves conflicts, triages review comments |

### Agent Types Used

| Agent Type | Capability | When Used |
|------------|-----------|-----------|
| `generalPurpose` | Full read/write access | Implementation, complex fixes |
| `explore` | Read-only codebase scanning | Impact mapping, code analysis |
| `shell` | Command execution | Build, test, deploy |
| `ci-investigator` | CI log analysis | Diagnosing pipeline failures |

### Example: How a Skill Works

**`@impact-map` skill in action:**

```
Input:  "Add AI-powered forecasting to right-sizing"
        
Step 1: Scan MCO repo → find PlatformAnalyticsSpec, ADC sync, CRD definitions
Step 2: Scan MCOA repo → find rightsizing module, Perses panels, scrape config
Step 3: Map dependencies → Thanos, Prometheus, ConfigMaps
Step 4: Identify patterns → RuleBuilder, ScrapeConfig, ADC keys

Output: docs/impact-maps/prediction-engine.md
        ├── 2 repos affected (MCO + MCOA)
        ├── 15 files to modify
        ├── 8 files to create
        ├── 5 risks identified
        └── 12 tasks proposed

→ HUMAN CHECKPOINT: "This impact map requires your review."
```

**`@developer` skill in action:**

```
Input:  docs/tasks/task-03-builtin-provider.md

Step 1: Read all files in "Files to Modify"
Step 2: Read reference patterns (RuleBuilder, existing providers)
Step 3: Implement Holt-Winters, STL, AR(p) models
Step 4: Create ensemble with inverse-MAPE weighting
Step 5: Write tests for each model + ensemble
Step 6: Self-review against acceptance criteria
Step 7: Commit with: feat(prediction): add builtin provider

→ All acceptance criteria checked ✓
```

### What Made This Approach Work

1. **Grounded in Real Code** — Every plan referenced actual file paths, function signatures, and existing patterns
2. **Human Checkpoints** — Architect reviewed and approved the impact map before any code was written
3. **Structured Tasks** — Each implementation task had explicit acceptance criteria and test requirements
4. **Iterative Debugging** — The CI fixer skill iterated through lint, build, and deployment issues automatically
5. **Multi-Agent Coordination** — Parallel agents handled MCO and MCOA repos simultaneously

---

## Key Takeaways

### For Product Presentation

1. **Proactive, Not Reactive** — Forecasting predicts future resource needs before capacity issues arise
2. **Zero Data Risk** — Default builtin model runs pure math in-process, no network calls
3. **Customer Choice** — Pluggable providers let customers bring their own models (ONNX, API, custom server)
4. **Complete Coverage** — Forecasts for all 4 dimensions: Namespace, Workload, GPU, VM
5. **Integrated Experience** — Forecasts appear directly in existing Perses dashboards alongside actual data
6. **AI-Built with AI** — Developed using structured Agentic AI SDLC with human oversight at every phase

### Technical Highlights

- **3 statistical models** (HW, STL, AR) combined via inverse-MAPE ensemble
- **4 forecast dimensions** covering containers, GPU, and VMs
- **14 prediction metrics** exported and available in Thanos
- **6 Perses dashboard sections** enhanced with forecast panels
- **4 provider types** with explicit data privacy controls
- **24h staleness window** ensuring forecasts remain visible across training cycles

### For Architects

- The prediction engine runs as a goroutine inside the existing MCOA addon manager — no new pods
- Model state is persisted in ConfigMap shards (auto-split at 1MB) — survives restarts
- The training controller queries Thanos directly, no additional data pipelines needed
- Forecasts are served via standard Prometheus `/metrics` endpoint — no custom APIs
