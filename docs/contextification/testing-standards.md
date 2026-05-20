# Testing Standards

> context_type: testing_standards

## Testing Philosophy

Every new package requires colocated unit tests. The prediction engine
follows the same test patterns as existing rightsizing code.

## Test Types

| Type | When Required | Where Tests Live | Framework |
|------|--------------|-----------------|-----------|
| Unit | Every new function/method | `*_test.go` next to source | `testing` + `testify` |
| Model accuracy | Every model change | `prediction/*_test.go` | Table-driven backtest |
| Controller | Training controller changes | `training/controller_test.go` | `controller-runtime` fake client |
| Helm render | Helm template changes | `internal/coo/rightsizing_e2e_test.go` | Snapshot-style render tests |
| Provider | Every provider implementation | `provider/*/provider_test.go` | Mock HTTP/gRPC servers |
| Privacy | Consent/NetworkPolicy changes | `privacy/*_test.go` | Validation assertions |

## Coverage Expectations

- New packages: aim for >80% line coverage
- Model code: 100% coverage on core forecast/train paths
- Provider interface: test each provider independently + integration
- Privacy code: 100% coverage on consent validation paths

## Test Commands

```bash
# MCOA
make test                                                  # internal/ only
go test ./...                                              # full suite (CI uses this)
go test ./internal/analytics/rightsizing/prediction/...     # prediction engine only
go test ./internal/analytics/rightsizing/prediction/features/...  # feature engineering
go test ./internal/analytics/rightsizing/prediction/anomaly/...   # anomaly detection
go test ./internal/analytics/rightsizing/prediction/provider/...  # all providers
go test ./internal/coo/...                                 # E2E render tests

# MCO
make unit-tests                                            # all unit tests
make integration-test                                      # controller tests
```

## Model Accuracy Testing

Prediction models require accuracy validation via backtesting:

1. Split historical data: 80% train, 20% validate
2. Train model on training set
3. Forecast validation period
4. Compute MAPE (Mean Absolute Percentage Error)
5. Assert MAPE < threshold (varies by model):
   - Holt-Winters: < 15%
   - STL: < 20%
   - AR: < 25%
   - Ensemble: < 12% (better than any individual model)

## Flaky Test Policy

- Prediction tests may have slight numerical variance — use tolerance assertions
- `assert.InDelta(t, expected, actual, 0.01)` for float comparisons
- Time-dependent tests must use injected clocks, never `time.Now()`
