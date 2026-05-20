# Security Guidelines

> context_type: security_guidelines

## Data Privacy Requirements

The prediction engine handles customer workload metrics. The fundamental
requirement: **customer cluster data must not leak outside the cluster
without explicit customer consent.**

### Privacy Tiers by Provider

| Provider | Data Leaves Cluster | Consent Required | NetworkPolicy |
|----------|-------------------|-----------------|---------------|
| Built-in | Never | No | Deny all egress |
| ONNX | Never | No | Deny all egress |
| External API | Yes (to customer's API) | Yes — explicit flag | Allow specific endpoint |
| Custom Endpoint | Depends on location | Yes (if external) | Allow specific endpoint |

### 7 Privacy Enforcement Layers

1. **Compilation boundary** — Built-in models are Go code, no HTTP client
2. **NetworkPolicy** — Kubernetes-level egress deny (DNS + Thanos + K8s API only)
3. **Data minimization** — Only aggregated `acm_rs:*`, never raw container metrics
4. **RBAC isolation** — Dedicated ServiceAccount with minimal permissions
5. **Consent gate** — `dataExfiltrationConsent: true` required for external providers
6. **Label redaction** — Hash/strip namespace and cluster labels before external send
7. **Audit trail** — Every call logged as Prometheus metric

### Consent Validation

External providers MUST NOT send data without `dataExfiltrationConsent: true`
in the MCO CR. The consent flow:

1. Customer sets `prediction.provider: "external"` in MCO CR
2. Customer sets `prediction.external.dataExfiltrationConsent: true`
3. MCO controller validates consent flag is present
4. MCO syncs to ADC with consent flag
5. MCOA `consent.go` validates before any external call
6. If consent missing: increment `acm_rs_prediction_consent_violations_total`, block the call

### Label Redaction

When sending data to external providers, sensitive labels can be redacted:

```yaml
external:
  redactLabels:
    - namespace     # hashed to SHA256 before sending
    - cluster_name  # hashed to SHA256 before sending
```

The redaction happens in `prediction/privacy/consent.go` before the HTTP
client sends the request. The original labels are never exposed.

### Metric Allowlist

Only these metric patterns are allowed as input to the prediction engine:
- `acm_rs:namespace:*` — namespace-level aggregations
- `acm_rs:cluster:*` — cluster-level aggregations
- `acm_rs_vm:*` — virtualization aggregations
- `acm_rs:pod:*` — pod-level (from workload RS)
- `acm_rs:workload:*` — workload-level

Raw metrics (`container_cpu_*`, `kube_pod_*`) are never queried.

### RBAC

The prediction engine uses dedicated RBAC:

```yaml
ServiceAccount: rs-prediction-sa
ClusterRole:
  - Read: Thanos query API (acm_rs:* metrics only)
  - Read/Write: ConfigMaps (rs-prediction-* in observability namespace)
  - No access to: Secrets (except API key Secret ref for external provider)
  - No access to: raw spoke-cluster data
```

### Audit Requirements

Every prediction operation is logged:

| Event | Metric | Labels |
|-------|--------|--------|
| Training run | `acm_rs_prediction_training_total` | cluster, status |
| Forecast call | `acm_rs_prediction_forecasts_total` | cluster, model, provider |
| External API call | `acm_rs_prediction_external_calls_total` | endpoint, status |
| Data sent externally | `acm_rs_prediction_external_bytes_sent` | endpoint |
| Consent violation | `acm_rs_prediction_consent_violations_total` | — |

### Security Review Triggers

A security review is required when:
- Adding a new external provider type
- Changing the consent validation flow
- Modifying NetworkPolicy egress rules
- Adding new metric types to the training data
- Changing RBAC permissions for the prediction ServiceAccount
