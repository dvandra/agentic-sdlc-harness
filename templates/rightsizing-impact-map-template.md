# Rightsizing Cross-Repo Impact Map

## Feature
<!-- One-line description of the rightsizing change -->

## Variant
- [ ] Namespace rightsizing (`acm_rs:*`)
- [ ] Virtualization rightsizing (`acm_rs_vm:*`)
- [ ] Both
- [ ] New variant (specify)

## Layer Impact

### Recording Rules
- [ ] Rule expressions changed (rulebuilder, prometheusrule.go)
- [ ] New metrics added
- [ ] Existing metrics modified
- [ ] Aggregation windows changed (5m/1d)
- [ ] Recommendation formula changed

### ScrapeConfig / Federation
- [ ] Federation match list changed
- [ ] ScrapeConfig spec changed
- [ ] Metrics allowlist needs update (MCO)

### Configuration (ConfigMaps)
- [ ] ConfigMap schema changed (RSPrometheusRuleConfig, RSConfigMapData)
- [ ] Default values changed (e.g. recommendationPercentage)
- [ ] Placement configuration changed
- [ ] New ConfigMap needed

### Dashboards
- [ ] Perses dashboard changes (MCOA)
- [ ] Grafana dashboard changes (MCO manifests)
- [ ] New dashboard needed

### Delegation / ADC
- [ ] ADC key names changed
- [ ] Delegation behavior changed
- [ ] New ADC key needed

## MCO Impact

### Files Affected
- `operators/multiclusterobservability/controllers/analytics/rightsizing/...`
  - `<verified-path>` — <what changes>
- `operators/multiclusterobservability/controllers/analytics/analytics_controller.go` — <if affected>
- `operators/multiclusterobservability/api/v1beta2/multiclusterobservability_types.go` — <if API change>
- `operators/multiclusterobservability/pkg/util/rightsizing.go` — <if delegation change>
- `operators/multiclusterobservability/manifests/base/...` — <if manifest change>

### MCO Existing Patterns
- <reference specific functions/types to follow>

## MCOA Impact

### Files Affected
- `internal/analytics/rightsizing/...`
  - `<verified-path>` — <what changes>
- `internal/analytics/rightsizing/handlers/...` — <if handler change>
- `internal/addon/manifests/charts/mcoa/templates/rs-*.yaml` — <if Helm change>
- `internal/perses/dashboards/rightsizing/...` — <if dashboard change>
- `internal/addon/options.go` — <if ADC key change>

### MCOA Existing Patterns
- <reference specific functions/types to follow>

## Cross-Repo Sync Points
<!-- Items that MUST match between MCO and MCOA -->
- [ ] ADC key names match
- [ ] ConfigMap names and schema match
- [ ] Metric names match (recording rules ↔ scrape config ↔ allowlist)
- [ ] PrometheusRule names match (Policy mode ↔ Helm mode)
- [ ] Delegation annotation behavior consistent

## Risks
- [ ] <Risk>

## Task Breakdown
| # | Title | Repo | Layer | Complexity |
|---|-------|------|-------|------------|
| 1 | ...   | MCO  | ...   | S/M/L      |
| 2 | ...   | MCOA | ...   | S/M/L      |

---
**STATUS**: AWAITING HUMAN REVIEW
