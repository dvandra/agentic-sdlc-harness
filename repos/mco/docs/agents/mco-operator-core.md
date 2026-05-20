# MCO Operator Core

> **DRAFT — Validate against actual codebase.** This doc was written from planning context, not by reading the real MCO code. Before trusting entry points or file paths, run an agent against the cloned repo to verify and fill in details.

> Main reconciler, CR API types, status management, placement evaluation, and hub component lifecycle (Thanos, Grafana, Observatorium). For the right-sizing API surface, see [rightsizing-api.md](rightsizing-api.md). For proxy and RBAC, see [proxy-and-rbac.md](proxy-and-rbac.md).

## Expected Key Entry Points

- `operators/multiclusterobservability/controllers/multiclusterobservability/`: main reconciler
- `operators/multiclusterobservability/api/v1beta2/`: CR types, deepcopy, validation
- `operators/multiclusterobservability/controllers/placementrule/`: placement rule controller
- `operators/endpointmetrics/`: spoke-side endpoint operator
- Monorepo with independent `go.mod` per sub-package (`operators/`, `proxy/`, `collectors/`, `loaders/`)

## TODO: Generate from Actual Code

To produce the verified version of this doc, clone the MCO repo and run:

```
# In the actual MCO repo checkout
# Have an agent read operators/multiclusterobservability/ and produce:
# - Key Entry Points (actual file paths, struct/function names)
# - Patterns & Conventions (reconciler flow, status conditions, ADC sync)
# - Gotchas (real issues discovered from code)
# - Dependencies & Context
```

## Links

- [rightsizing-api.md](rightsizing-api.md) — RS and prediction CR schema, ADC keys
- [proxy-and-rbac.md](proxy-and-rbac.md) — Thanos query proxy
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — documentation index
