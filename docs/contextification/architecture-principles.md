# Architecture Principles

> context_type: architecture_principles

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Prediction location | Hub cluster only | Privacy: data stays centralized. Spokes only receive target values. |
| Primary framework | Pure Go | Zero external deps, microsecond latency, compiles into MCOA binary. |
| Model approach | Ensemble (HW + STL + AR) | Different models handle different workload patterns. Weighted by accuracy. |
| Provider architecture | Pluggable interface | Customers can bring own models without forking. 4 provider types. |
| State storage | ConfigMaps | Survives pod restarts, no external DB, fits K8s-native pattern. |
| Privacy model | Defense in depth (7 layers) | Compilation boundary + NetworkPolicy + RBAC + consent + audit + redaction + minimization. |
| Safety model | Defense in depth (8 layers) | Opt-in + NS filter + bounds + rate limit + cooldown + stabilization + OOM rollback + pinning. |
| Interactive UI | Extend LLM backend | Chat UI, streaming, auth, chart rendering already exist. ~2 days vs ~7 days. |
| Shipping model | Compiled into MCOA binary | No new deployments, no sidecars. Prediction is a package, not a service. |
| Configuration | MCO CR → ADC → MCOA | Follows existing right-sizing config flow. No new CRD needed. |

## Technology Constraints

- **No Python on cluster**: Prediction must work without a Python runtime.
  The ONNX provider uses Go bindings, not a Python process.
- **No external network by default**: Built-in and ONNX providers must work
  in air-gapped environments with zero egress.
- **FIPS compliance**: MCOA has a Konflux build with CGO_ENABLED=1 for FIPS.
  Prediction code must not break FIPS builds (no CGo in prediction package).
- **OCP compatibility**: Must work on OCP 4.x with standard monitoring stack
  (Prometheus, Thanos, Grafana/Perses).
- **ACM compatibility**: Must integrate with ACM's ManifestWork mechanism
  for spoke cluster resource delivery.

## When Can a Team Deviate

- **New model type**: Can be added to the ensemble without changing the
  provider interface. Follow the existing model pattern.
- **New provider**: Must implement `PredictionProvider` interface. External
  providers require consent validation + audit logging.
- **Skip prediction entirely**: Set `prediction.enabled: false` in MCO CR.
  All prediction code is gated behind this flag.
