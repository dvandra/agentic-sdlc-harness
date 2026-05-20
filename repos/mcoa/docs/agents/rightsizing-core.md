# Right-Sizing Core

> **DRAFT — Validate against actual codebase.** This doc was written from planning context, not by reading the real MCOA code. Before trusting entry points or file paths, run an agent against the cloned repo to verify and fill in details.

> Recording rules, ScrapeConfig federation, handler pipeline, Helm chart integration, and Perses dashboards. For the prediction engine that extends this, see [prediction-engine.md](prediction-engine.md). For the addon framework and ManifestWork delivery, see [addon-framework.md](addon-framework.md).

## Expected Key Entry Points

- `internal/analytics/rightsizing/types.go`: shared constants, label filters, config types
- `internal/analytics/rightsizing/rulebuilder.go`: `RuleBuilder` for Prometheus recording rule expressions
- `internal/analytics/rightsizing/scrapeconfig.go`: ScrapeConfig for federating `acm_rs:*` metrics
- `internal/analytics/rightsizing/namespace/prometheusrule.go`: namespace RS recording rule groups
- `internal/analytics/rightsizing/virtualization/prometheusrule.go`: VM RS recording rule groups
- `internal/analytics/rightsizing/handlers/`: per-cluster config evaluation, Helm values bridge
- `internal/perses/dashboards/rightsizing/`: Perses dashboard builders

## TODO: Generate from Actual Code

To produce the verified version of this doc, clone the MCOA repo and run:

```
# In the actual MCOA repo checkout
# Have an agent read internal/analytics/rightsizing/ and produce:
# - Key Entry Points (actual file paths, struct/function names)
# - Patterns & Conventions (how recording rules are built, handler pipeline flow)
# - Gotchas (real issues discovered from code)
# - Dependencies & Context
```

## Links

- [prediction-engine.md](prediction-engine.md) — forecasting, anomaly detection, providers
- [addon-framework.md](addon-framework.md) — ManifestWork delivery, ADC options
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — documentation index
