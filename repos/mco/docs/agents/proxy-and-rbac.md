# Proxy and RBAC

> **DRAFT — Validate against actual codebase.** This doc was written from planning context, not by reading the real MCO code. Before trusting entry points or file paths, run an agent against the cloned repo to verify and fill in details.

> RBAC-aware Thanos query proxy that scopes metric access per managed cluster. For the main operator and CR API, see [mco-operator-core.md](mco-operator-core.md). For the right-sizing API, see [rightsizing-api.md](rightsizing-api.md).

## Expected Key Entry Points

- `proxy/`: RBAC-aware Thanos query proxy (separate binary, own `go.mod`)
- `proxy/pkg/proxy/`: core proxy logic — request parsing, label injection
- `proxy/pkg/auth/`: authentication and authorization

## TODO: Generate from Actual Code

To produce the verified version of this doc, clone the MCO repo and run:

```
# In the actual MCO repo checkout
# Have an agent read proxy/ and produce:
# - Key Entry Points (actual file paths, struct/function names)
# - Patterns & Conventions (cluster-scoped queries, label injection)
# - Gotchas (real issues discovered from code)
# - Dependencies & Context
```

## Links

- [mco-operator-core.md](mco-operator-core.md) — main reconciler
- [rightsizing-api.md](rightsizing-api.md) — RS and prediction configuration
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — documentation index
