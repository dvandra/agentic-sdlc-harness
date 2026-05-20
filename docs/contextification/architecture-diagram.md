# Architecture Diagram

> context_type: architecture_diagram

## System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│ OCP Hub Cluster                                                     │
│                                                                     │
│  ┌──────────┐     ┌──────────────────────────────────────────────┐  │
│  │   ACM    │────▶│  MCO (MultiCluster Observability Operator)   │  │
│  └──────────┘     │  - Reads MCO CR (prediction config)          │  │
│                   │  - Syncs to ADC customized variables          │  │
│                   │  - Manages metrics allowlist + ScrapeConfig   │  │
│                   └──────────────┬───────────────────────────────┘  │
│                                  │ ADC sync                         │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  MCOA Binary (single Go process)                              │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────────────────────────────────┐ │  │
│  │  │ Addon Ctrl  │  │ Prediction Engine (compiled in)         │ │  │
│  │  │ Watcher Ctrl│  │                                         │ │  │
│  │  │ ResourceCrt │  │ ┌──────────┐ ┌──────────┐ ┌─────────┐  │ │  │
│  │  └─────────────┘  │ │ Feature  │ │ Ensemble │ │ Anomaly │  │ │  │
│  │                   │ │ Engineer │ │ HW+STL+AR│ │ Detect  │  │ │  │
│  │  ┌─────────────┐  │ └────┬─────┘ └────┬─────┘ └────┬────┘  │ │  │
│  │  │ RS Handlers │  │      └──────┬──────┘            │       │ │  │
│  │  │ (existing)  │  │             ▼                   │       │ │  │
│  │  └─────────────┘  │      ┌──────────┐               │       │ │  │
│  │                   │      │ Optimizer │◄──────────────┘       │ │  │
│  │  ┌─────────────┐  │      └─────┬────┘                       │ │  │
│  │  │ Perses Dash │  │            │                             │ │  │
│  │  │ (existing)  │  │  ┌─────────┴──────────┐                 │ │  │
│  │  └─────────────┘  │  │  Provider Registry │                 │ │  │
│  │                   │  │  ┌───────┐┌──────┐ │                 │ │  │
│  │                   │  │  │Builtin││ ONNX │ │                 │ │  │
│  │                   │  │  └───────┘└──────┘ │                 │ │  │
│  │                   │  │  ┌───────┐┌──────┐ │                 │ │  │
│  │                   │  │  │ExtAPI ││Custom│ │                 │ │  │
│  │                   │  │  └───────┘└──────┘ │                 │ │  │
│  │                   │  └────────────────────┘                 │ │  │
│  │                   │                                         │ │  │
│  │                   │  ┌────────────┐  ┌───────────────────┐  │ │  │
│  │                   │  │  Training  │  │ Privacy Guardrails│  │ │  │
│  │                   │  │ Controller │  │ NetworkPolicy     │  │ │  │
│  │                   │  │ (6h cycle) │  │ RBAC + Consent    │  │ │  │
│  │                   │  └─────┬──────┘  │ Audit + Redaction │  │ │  │
│  │                   │        │         └───────────────────┘  │ │  │
│  │                   └────────┼─────────────────────────────────┘ │  │
│  │                            │                                   │  │
│  └────────────────────────────┼───────────────────────────────────┘  │
│                               │ Thanos range query (7-90d)          │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │  Thanos Store (historical acm_rs:* metrics from all clusters)  │  │
│  └──────────────────────────▲─────────────────────────────────────┘  │
│                             │ federation                             │
│  ┌──────────────────────────┼─────────────┐                         │
│  │  LLM Backend             │             │                         │
│  │  - forecast_demand tool ─┘             │                         │
│  │  - explain_forecast tool               │                         │
│  │  - prediction_health tool              │                         │
│  └────────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
          │ ManifestWork (policy ConfigMaps + recording rules)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ OCP Spoke Cluster (per managed cluster)                             │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────────────────────┐         │
│  │  Prometheus OCP  │  │  RS Agent Controller             │         │
│  │                  │  │  - Reads policy ConfigMap         │         │
│  │  PrometheusRules:│  │  - Discovers opted-in workloads   │         │
│  │  acm_rs:*:5m     │  │  - Computes targets (forecast)   │         │
│  │  acm_rs:*:1d     │  │  - Applies safety bounds         │         │
│  │  acm_rs:*:forecast│  │  - Patches workloads (auto mode) │         │
│  │                  │  │  - OOM rollback detection         │         │
│  │  ScrapeConfig:   │  │  - Emits acm_rs_agent:* metrics   │         │
│  │  federation ─────┼──┼──▶ hub Thanos                    │         │
│  └─────────────────┘  └──────────────────────────────────┘         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  Workloads (Deployments / StatefulSets / VMs)           │       │
│  │  Annotation: mcoa.io/rightsizing: "auto"                │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

1. Spoke Prometheus evaluates recording rules → `acm_rs:*` metrics
2. ScrapeConfig federates to hub Thanos
3. Training controller queries Thanos (7-90d windows)
4. Feature engineering extracts patterns (in-memory)
5. Ensemble models train/predict (in-process)
6. Anomaly detector flags unusual patterns (in-process)
7. Optimizer combines forecast + anomaly + safety → targets
8. Targets stored in policy ConfigMaps
9. ManifestWork delivers ConfigMaps to spokes
10. RS Agent on spoke uses targets for workload patching

## Last Verified

May 2026 — initial design. Architecture not yet implemented.
