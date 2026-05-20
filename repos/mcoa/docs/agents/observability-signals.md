# Observability Signals

> **DRAFT — Validate against actual codebase.** This doc was written from planning context, not by reading the real MCOA code. Before trusting entry points or file paths, run an agent against the cloned repo to verify and fill in details.

> Metrics, logging, tracing signal packages, COO integration, and Perses dashboard rendering. For right-sizing dashboards and rules, see [rightsizing-core.md](rightsizing-core.md). For addon framework delivery, see [addon-framework.md](addon-framework.md).

## Expected Key Entry Points

- `internal/metrics/`: metrics signal package — Prometheus collector, user workload monitoring
- `internal/logging/`: logging signal package — CLF config, log collection
- `internal/tracing/`: tracing signal package — TempoStack, OpenTelemetry
- `internal/coo/`: COO integration — UIPlugin deployment, feature gating
- `internal/perses/`: Perses dashboard integration — dashboard builders, persesExplore plugin

## TODO: Generate from Actual Code

To produce the verified version of this doc, clone the MCOA repo and run:

```
# In the actual MCOA repo checkout
# Have an agent read internal/metrics/, internal/logging/, internal/tracing/,
# internal/coo/, and internal/perses/ and produce:
# - Key Entry Points (actual file paths, struct/function names)
# - Patterns & Conventions (signal package structure, dashboard builder pattern)
# - Gotchas (real issues discovered from code)
# - Dependencies & Context
```

## Links

- [rightsizing-core.md](rightsizing-core.md) — RS recording rules and dashboards
- [prediction-engine.md](prediction-engine.md) — prediction engine with LLM integration
- [addon-framework.md](addon-framework.md) — how signals get delivered to clusters
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — documentation index
