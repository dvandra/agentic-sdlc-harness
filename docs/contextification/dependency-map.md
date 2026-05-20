# Dependency Map

> context_type: dependency_map

## Who Consumes Our Outputs

| Consumer | What They Consume | Impact of Our Changes |
|----------|------------------|----------------------|
| LLM Backend | `acm_rs_prediction_*` metrics via Thanos | New RS tools query forecast metrics |
| Perses Dashboards | `acm_rs:*:forecast_*` recording rules | Dashboard panels display forecasts |
| RS Agent (spoke) | Policy ConfigMaps with forecast-informed targets | Agent uses targets for auto/dryrun modes |
| MCO Grafana | `acm_rs_prediction_*` metrics via allowlist | Legacy dashboard panels |
| ScrapeConfig | Metric names in federation match list | Metrics must appear in list to federate |
| ACM Console | Perses dashboards (embedded) | Forecast visibility in ACM UI |

## Whose Outputs We Consume

| Provider | What We Consume | Impact of Their Changes |
|----------|----------------|------------------------|
| Thanos Store | Historical `acm_rs:*` metrics (7-90 day windows) | Training controller depends on query API |
| MCO CR API | `PredictionSpec` configuration | Provider + model config flows from here |
| ADC (AddOnDeploymentConfig) | Customized variables (prediction keys) | MCOA reads ADC to start prediction engine |
| Prometheus (spoke) | Raw `acm_rs:*` recording rules | Source data for federation |
| MCO metrics_allowlist | Allowed metric names for federation | New metrics must be added here |
| ScrapeConfig (spoke) | Federation config | Controls which metrics reach hub |

## Cross-Repo Sync Points

These items MUST match between MCO and MCOA. A change in one requires a
coordinated change in the other.

| Sync Point | MCO Location | MCOA Location |
|-----------|-------------|---------------|
| ADC key: prediction toggle | `pkg/util/rightsizing.go` | `internal/addon/options.go` |
| ADC key: prediction provider | `pkg/util/rightsizing.go` | `internal/addon/options.go` |
| ADC key: prediction config | `pkg/util/rightsizing.go` | `internal/addon/options.go` |
| Prediction metric names | `manifests/base/config/metrics_allowlist.yaml` | `internal/analytics/rightsizing/scrapeconfig.go` |
| Forecast recording rule names | ScrapeConfig federation match | `namespace/forecast_rules.go` |
| ConfigMap: rs-prediction-config | Created by MCO controller | Read by MCOA training controller |
| ConfigMap: rs-prediction-model-state | N/A (MCOA only) | Written by training controller |
| Provider config schema | `api/v1beta2/PredictionSpec` | `prediction/provider/registry.go` |

## If We Change Something, Who Needs to Know

| Change Type | Notify |
|-------------|--------|
| New prediction metric | MCO team (allowlist), ScrapeConfig (federation), Perses (dashboard) |
| New ADC key | MCO team (CR API + controller sync) |
| Provider interface change | All provider implementations, LLM tools |
| ConfigMap schema change | MCO controller (if it reads the ConfigMap), RS Agent (if on spoke) |
| Recording rule name change | MCO allowlist, ScrapeConfig, Perses dashboards, LLM tools |
| NetworkPolicy change | Security review, cluster admin documentation |
