# Development Standards

> context_type: development_standards

## Language and Version

- **Go 1.25+** for both MCO and MCOA
- Pure Go for the prediction engine — no Python, no ONNX runtime (unless
  customer enables the ONNX provider)
- Standard library preferred over external dependencies

## Code Organization

All MCOA production code lives under `internal/`. The prediction engine follows
the same pattern:

```
internal/analytics/rightsizing/prediction/
  ├── features/    — feature engineering (temporal, statistical, trend, workload)
  ├── anomaly/     — anomaly detection (zscore, rate-of-change, adaptive)
  ├── optimizer/   — recommendation engine
  ├── training/    — periodic training controller
  ├── privacy/     — NetworkPolicy, RBAC, consent, audit
  └── provider/    — pluggable interface
        ├── builtin/   — default pure Go ensemble
        ├── onnx/      — customer ONNX model
        ├── external/  — customer API key
        └── custom/    — customer model server
```

## Coding Conventions

### Error Handling
- Wrap errors with `%w`: `fmt.Errorf("training failed for %s: %w", key, err)`
- Handle once — log OR return, never both
- Use sentinel errors for expected conditions

### Naming
- Provider types: `BuiltIn`, `ONNX`, `ExternalAPI`, `CustomEndpoint`
- Metric names: `acm_rs_prediction_` prefix for all prediction metrics
- Recording rules: `acm_rs:namespace:` prefix, `_{horizon}` suffix
- ConfigMap names: `rs-prediction-` prefix

### Interfaces
- Provider interface in `prediction/provider/interface.go`
- Every provider must implement `PredictionProvider`
- Privacy level declared per provider (`NoExfiltration` or `ConsentRequired`)

### Testing
- `testify` for assertions (`assert` for non-fatal, `require` for fatal)
- Table-driven tests for model accuracy validation
- Colocated `*_test.go` next to source
- Controller tests: `controller-runtime` fake client

### Lint
- MCO: `make go-lint` (fast) or `make lint` (full, needs clean tree)
- MCOA: `make lint` (golangci-lint + Dockerfile labels)
- `faillint`: `fmt.Print*` banned in production code (MCO)

### Import Format
- `gci` / `gofumpt` / `goimports` ordering
- Standard library → external → internal

### Commits
- MCO requires DCO sign-off: `Signed-off-by: Name <email>`
- Commit messages: imperative mood, reference Jira/issue when available

## What Compliance Is Verified By

| Check | MCO | MCOA |
|-------|-----|------|
| Lint | `make go-lint` / `make lint` | `make lint` |
| Format | `make format` | (included in lint) |
| Unit tests | `make unit-tests` | `make test` |
| Integration | `make integration-test` | `go test ./...` |
| Container labels | `make verify-containerfile-labels` | Part of `make lint` |
| Copyright | Enforced in lint | Enforced in lint |
| Vendor | `make deps` after go.mod changes | N/A (no vendoring in MCOA) |
| Bundle | `make bundle` after API changes | N/A |
