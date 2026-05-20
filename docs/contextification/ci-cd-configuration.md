# CI/CD Configuration

> context_type: ci_cd_configuration

## MCO CI Pipeline

### Required Checks Before Merge
- `make lint` — golangci-lint + copyright + faillint + containerfile labels
- `make bundle` — operator bundle generation (if API types changed)
- `make unit-tests` — all unit tests
- `make integration-test` — controller integration tests (envtest)
- DCO sign-off on all commits

### How to Debug a Failing Check
1. Read the CI output for the failing job name
2. Run the equivalent local command (see table below)
3. Common failures:
   - **Lint**: Missing copyright, `fmt.Print` in production code, import order
   - **Bundle**: API types changed but `make bundle` not re-run
   - **Unit tests**: Missing test, assertion failure
   - **Integration**: envtest setup issue, missing CRD

### Local Commands
```bash
make format           # auto-fix formatting
make go-lint          # fast lint (golangci-lint only)
make lint             # full lint (needs clean work tree)
make unit-tests       # unit tests
make integration-test # integration tests
make deps             # vendor update after go.mod changes
make bundle           # regenerate bundle after API changes
```

## MCOA CI Pipeline

### Required Checks Before Merge
- `make lint` — golangci-lint v2 + Dockerfile label verify
- `go test ./...` — full test suite
- Build: `make addon` + `make oci-build`
- Coveralls coverage upload

### Local Commands
```bash
make lint             # golangci-lint + Dockerfile labels
make test             # unit tests (internal/ only)
go test ./...         # full test suite (matches CI)
make addon            # build binary
make oci-build        # build container image
```

## Deployment Process

### Prediction Engine (no separate deployment)
The prediction engine compiles into the MCOA binary. No additional
deployment steps beyond the standard MCOA release:

1. Code merges to main
2. CI builds container image
3. Image pushed to registry
4. MCO deploys updated MCOA image
5. Prediction engine starts when `prediction.enabled: true` in MCO CR

### Spoke Components (via ManifestWork)
Policy ConfigMaps, recording rules, ScrapeConfig, NetworkPolicy, and RBAC
are delivered as Helm chart templates rendered into ManifestWork by MCOA.
No manual spoke-side deployment.
