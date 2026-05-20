# Addon Framework

> **DRAFT — Validate against actual codebase.** This doc was written from planning context, not by reading the real MCOA code. Before trusting entry points or file paths, run an agent against the cloned repo to verify and fill in details.

> Hub controller lifecycle, AddOnDeploymentConfig options, Helm values rendering, and ManifestWork delivery. For the right-sizing subsystem, see [rightsizing-core.md](rightsizing-core.md). For the prediction engine, see [prediction-engine.md](prediction-engine.md).

## Expected Key Entry Points

- `internal/addon/options.go`: ADC key constants, `BuildOptions()` parsing
- `internal/addon/helm/values.go`: `HelmChartValues`, Helm template value construction
- `internal/addon/manifests/charts/mcoa/`: umbrella Helm chart, deployed via ManifestWork
- `internal/controllers/addon/`: addon controller wiring
- `internal/controllers/resourcecreator/controller.go`: hub resource controller

## TODO: Generate from Actual Code

To produce the verified version of this doc, clone the MCOA repo and run:

```
# In the actual MCOA repo checkout
# Have an agent read internal/addon/ and internal/controllers/ and produce:
# - Key Entry Points (actual file paths, struct/function names)
# - Patterns & Conventions (ADC flow, Helm values construction, ManifestWork rendering)
# - Gotchas (real issues discovered from code)
# - Dependencies & Context
```

## Links

- [rightsizing-core.md](rightsizing-core.md) — recording rules, handlers, Helm templates
- [prediction-engine.md](prediction-engine.md) — forecasting, providers, privacy
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — documentation index
