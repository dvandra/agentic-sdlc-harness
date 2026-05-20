# Agentic AI SDLC: Right-Sizing Prediction Engine

> How AI agents will build the prediction model using the structured SDLC harness

## Executive Summary

This document describes how the Agentic AI SDLC pipeline will implement the
right-sizing prediction engine — a privacy-first, pluggable forecasting system
for ACM's multi-cluster observability stack. The prediction engine ships as
compiled Go code inside the MCOA binary, deployed to OCP clusters via
ACM → MCO → MCOA.

**What the agents build:**
- Multi-model ensemble forecaster (Holt-Winters + STL + Autoregressive)
- Anomaly detection suite (Z-score, rate-of-change, adaptive thresholds)
- Optimization recommender (forecast + anomaly + safety → targets)
- Pluggable provider interface (built-in, ONNX, external API, custom endpoint)
- Privacy guardrails (NetworkPolicy, RBAC, audit, consent management)
- Training controller (periodic retraining from Thanos historical data)
- LLM tool extensions (explain_forecast, prediction_health)

**How the agents build it:**
- 5-phase structured SDLC with human checkpoints
- Parallel execution across MCO + MCOA repos
- ~3-5 hours agent time, ~2 hours human review time
- Cross-repo orchestration via `scripts/cross-repo-pipeline.ts`

---

## Shipping Model: ACM → MCO → MCOA → OCP

### Delivery Chain

```
Customer installs ACM on OCP hub cluster
  └── ACM deploys MCO (MultiCluster Observability Operator)
        └── MCO reads MultiClusterObservability CR
              ├── spec.capabilities.platform.analytics.prediction.enabled: true
              ├── spec.capabilities.platform.analytics.prediction.provider: "builtin"
              └── MCO syncs prediction config to AddOnDeploymentConfig (ADC)
                    └── MCOA reads ADC customized variables
                          ├── Prediction engine runs ON HUB (compiled into MCOA binary)
                          ├── Training controller queries Thanos on hub
                          ├── Forecast results stored as metrics + ConfigMaps
                          └── ManifestWork delivers policy ConfigMaps to spoke clusters
                                └── RS Agent on spoke uses forecast-informed targets
```

### Key Points

- The prediction engine is **compiled into the MCOA Go binary** — no separate
  deployment, no sidecar container, no Python runtime
- Runs exclusively on the **hub cluster** — spoke clusters only receive
  policy ConfigMaps with forecast-informed target values
- Configuration flows through the **MCO CR** — customers enable/configure
  prediction via the same `MultiClusterObservability` resource they already use
- Provider selection (built-in / ONNX / external / custom) is a **MCO CR field**
  that flows through ADC to MCOA
- NetworkPolicy is **provider-aware** — strict deny-all for built-in/ONNX,
  targeted allow for external/custom (with consent flag required)

---

## SDLC Phases: How Agents Execute

### Overview

| Phase | What | Agents | Parallel? | Duration | Human Time |
|-------|------|--------|-----------|----------|------------|
| 1 | Impact Map | 2 (MCO + MCOA) | Yes | ~10 min | ~30 min review |
| 2 | Task Creation | 2 (MCO + MCOA) | Yes | ~5 min | ~15 min review |
| 3 | Development | 3 MCOA batches + 1 MCO + 1 LLM | Partially | ~2-4 hours | ~1 hour review |
| 4 | Testing | 2 (MCO + MCOA) | Yes | ~30 min | ~10 min review |
| 5 | CI Fix | 2 (MCO + MCOA) | Yes | ~15-60 min | Monitor only |

### Phase 1: Impact Map (Parallel)

The `cross-repo-pipeline.ts` orchestrator launches two agents simultaneously.

**MCO Impact Map Agent** uses:
- `repos/mco/.cursor/skills/impact-map/SKILL.md`
- `repos/mco/.cursor/skills/rightsizing/SKILL.md`

Scans:
- `operators/multiclusterobservability/api/v1beta2/` — new `PredictionSpec` API type
- `operators/multiclusterobservability/controllers/analytics/` — new ADC sync for prediction
- `operators/multiclusterobservability/pkg/util/rightsizing.go` — new ADC key constants
- `manifests/base/config/metrics_allowlist.yaml` — new prediction metric names
- `manifests/base/grafana/analytics/` — optional Grafana dashboard panels

Output: Grounded impact map listing exact files, functions, and cross-repo sync points.

**MCOA Impact Map Agent** uses:
- `repos/mcoa/.cursor/skills/impact-map/SKILL.md`
- `repos/mcoa/.cursor/skills/rightsizing/SKILL.md`

Scans:
- `internal/analytics/rightsizing/prediction/` — 13 new files across 6 sub-packages
- `internal/analytics/rightsizing/agent/controller.go` — integration of ensemble forecaster
- `internal/analytics/rightsizing/scrapeconfig.go` — new prediction metric names
- `internal/addon/options.go` — new ADC key for prediction
- `internal/addon/manifests/charts/mcoa/templates/` — new Helm templates
- `internal/perses/dashboards/rightsizing/` — forecast dashboard panels

Output: Full file map, package dependency graph, Helm template changes.

**Cross-Repo Sync Check** uses `templates/rightsizing-impact-map-template.md`:
- ADC key names match between MCO and MCOA
- Prediction metric names match in allowlist, ScrapeConfig, and recording rules
- ConfigMap schemas (prediction config) match
- Provider configuration flows correctly through ADC

**HUMAN CHECKPOINT 1**: Review both impact maps. This catches architectural
misalignment before any code is written. Verify:
- Provider interface design makes sense
- Privacy controls are sufficient for each provider type
- MCO CR API structure is correct
- No missing cross-repo sync points

### Phase 2: Task Creation (Parallel)

Agents convert approved impact maps into structured tasks.

**MCOA Tasks** (ordered by dependency):

| # | Task | Files | Complexity |
|---|------|-------|------------|
| 1 | Provider interface + registry | `prediction/provider/` | M |
| 2 | Feature engineering pipeline | `prediction/features/` (6 files) | L |
| 3 | Enhance Holt-Winters (triple smoothing) | `prediction/holt_winters.go` | S |
| 4 | STL decomposition model | `prediction/stl.go` | M |
| 5 | Autoregressive model | `prediction/autoregressive.go` | M |
| 6 | Ensemble combiner | `prediction/ensemble.go` | M |
| 7 | Built-in provider (wraps ensemble) | `prediction/provider/builtin/` | S |
| 8 | Anomaly detection suite | `prediction/anomaly/` (5 files) | M |
| 9 | Optimization recommender | `prediction/optimizer/` (3 files) | M |
| 10 | Training controller | `prediction/training/` (4 files) | L |
| 11 | Privacy + consent management | `prediction/privacy/` (4 files) | M |
| 12 | ONNX provider | `prediction/provider/onnx/` | M |
| 13 | External API provider + redaction | `prediction/provider/external/` | M |
| 14 | Custom endpoint provider | `prediction/provider/custom/` | M |
| 15 | Helm templates (NetworkPolicy, config, RBAC) | `templates/rs-*.yaml` | S |
| 16 | Integration (controller, metrics, scrapeconfig) | Modified files | M |
| 17 | LLM tools extension | `llm/agent/rs_tools.py` | S |

**MCO Tasks:**

| # | Task | Files | Complexity |
|---|------|-------|------------|
| 1 | PredictionSpec API type | `api/v1beta2/` | S |
| 2 | ADC sync for prediction config | `controllers/analytics/` | M |
| 3 | ADC key constants | `pkg/util/rightsizing.go` | S |
| 4 | Metrics allowlist + ScrapeConfig | `manifests/base/` | S |

**HUMAN CHECKPOINT 2**: Review task breakdown. Verify priority ordering,
dependency chains, and complexity estimates.

### Phase 3: Development (Sequential within MCOA, parallel across repos)

MCOA development is split into 3 sequential batches:

**Batch 1 — Core Models** (tasks 1-7):
```
prediction/provider/    → Provider interface + registry
prediction/features/    → Feature engineering pipeline
prediction/holt_winters.go → Triple smoothing enhancement
prediction/stl.go       → STL decomposition
prediction/autoregressive.go → AR(p) model
prediction/ensemble.go  → Weighted combiner
prediction/provider/builtin/ → Built-in provider wrapper
```

**Batch 2 — Intelligence + Safety** (tasks 8-11):
```
prediction/anomaly/     → Z-score + rate-of-change + adaptive
prediction/optimizer/   → Forecast + anomaly + safety → targets
prediction/training/    → Thanos querier + periodic retraining
prediction/privacy/     → NetworkPolicy + RBAC + consent + audit
```

**Batch 3 — Providers + Integration** (tasks 12-17):
```
prediction/provider/onnx/     → ONNX Runtime Go integration
prediction/provider/external/ → HTTP client + redaction + audit
prediction/provider/custom/   → REST/gRPC client + audit
templates/rs-*.yaml           → Helm templates
agent/controller.go           → Ensemble integration
scrapeconfig.go              → New metric names
llm/agent/rs_tools.py        → New tools
```

**MCO development** runs in parallel with MCOA Batch 1 (independent).

**HUMAN CHECKPOINT 3**: Code review. Verify:
- Provider interface is clean and extensible
- Privacy controls work for each provider type
- Models produce reasonable outputs
- Cross-repo sync points are correct

### Phase 4: Testing (Parallel)

**MCOA Tester Agent** writes:
- Unit tests for every new package (matching existing `*_test.go` patterns)
- Backtest validation tests for each model
- Provider interface mock tests
- Privacy consent validation tests
- Helm template render tests
- E2E manifest tests in `internal/coo/rightsizing_e2e_test.go`

**MCO Tester Agent** writes:
- Unit tests for PredictionSpec API defaults
- Integration tests for ADC sync with prediction keys
- Allowlist/ScrapeConfig validation tests

### Phase 5: CI Fix (Autonomous Loop)

CI-fixer agents:
1. Run `make lint` / `go test ./...`
2. Read CI output
3. Fix failures (lint, test, build)
4. Resubmit
5. Loop until green

`check-phase-gate.sh` hook prevents merge without green CI.

---

## SDLC Tooling Reference

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/cross-repo-pipeline.ts` | Orchestrates parallel agent execution across MCO + MCOA |
| `scripts/run-stage.ts` | Runs individual SDLC stages |
| `scripts/setup-repo.sh` | Installs harness files into local repo checkout |

### Skills Used

| Skill | Repo | Purpose |
|-------|------|---------|
| `impact-map` | Both | Scan codebase, produce grounded impact analysis |
| `task-creator` | Both | Convert impact map into structured tasks |
| `developer` | Both | Implement tasks following code conventions |
| `tester` | Both | Write unit/integration/E2E tests |
| `ci-fixer` | Both | Auto-fix CI failures |
| `rightsizing` | Both | Domain knowledge for rightsizing code |
| `prediction` | MCOA | Domain knowledge for prediction engine (new) |

### Hooks

| Hook | Repo | Trigger |
|------|------|---------|
| `check-phase-gate.sh` | Both | Before agent moves to next phase |
| `mco-post-edit.sh` | MCO | After file edit — reminds `make deps`, `make bundle` |
| `mcoa-post-edit.sh` | MCOA | After file edit — reminds Helm chart updates |

### Templates

| Template | Purpose |
|----------|---------|
| `templates/rightsizing-impact-map-template.md` | Cross-repo RS impact analysis |
| `repos/mco/templates/task-template.md` | MCO structured task |
| `repos/mcoa/templates/task-template.md` | MCOA structured task |

---

## Pluggable Provider Architecture

### Provider Types

**Built-in (default)** — Pure Go ensemble, zero data leak:
- Models: Holt-Winters (triple), STL decomposition, AR(p)
- Training: On-hub via Thanos queries
- Privacy: NetworkPolicy deny-all egress
- Config: `spec.capabilities.platform.analytics.prediction.provider: "builtin"`

**ONNX** — Customer's own model, still no data leak:
- Customer trains offline, exports to ONNX format
- MCOA runs inference via `onnxruntime-go` bindings
- Data stays on-cluster
- Config: `prediction.provider: "onnx"`, model uploaded as ConfigMap/PVC

**External API** — Customer provides API key (data leaves cluster):
- Supports OpenAI, Google Vertex, Azure ML, or any REST endpoint
- Requires explicit consent: `dataExfiltrationConsent: true`
- Label redaction before sending (configurable)
- Full audit logging of every API call
- Config: `prediction.provider: "external"`, API key in Secret

**Custom Endpoint** — Customer's own model server:
- REST or gRPC protocol
- On-cluster or external (consent required if external)
- Standardized request/response schema
- Config: `prediction.provider: "custom"`, endpoint URL + TLS config

### Privacy Controls by Provider

| Control | Built-in | ONNX | External API | Custom Endpoint |
|---------|----------|------|--------------|-----------------|
| NetworkPolicy egress | Deny all | Deny all | Allow API endpoint only | Allow endpoint only |
| Data leaves cluster | Never | Never | Yes (with consent) | Depends on endpoint |
| Consent flag required | No | No | Yes | Yes (if external) |
| Label redaction | N/A | N/A | Configurable | Configurable |
| Audit logging | Training runs | Inference calls | Every API call | Every call |
| Model parameters stored | ConfigMap | ConfigMap/PVC | N/A | N/A |

---

## Running the Pipeline

### Prerequisites

1. Cursor SDK installed (`@cursor/sdk`)
2. `CURSOR_API_KEY` environment variable set
3. MCO and MCOA repos cloned locally
4. Harness installed via `scripts/setup-repo.sh`

### Execution

```bash
# Install harness into local repo checkouts
./scripts/setup-repo.sh mco /path/to/multicluster-observability-operator
./scripts/setup-repo.sh mcoa /path/to/multicluster-observability-addon

# Run the cross-repo pipeline
npx tsx scripts/cross-repo-pipeline.ts \
  --feature "Pluggable prediction engine for right-sizing forecasting" \
  --mco-repo /path/to/mco \
  --mcoa-repo /path/to/mcoa \
  --local

# Or run individual stages
npx tsx scripts/run-stage.ts impact-map --repo /path/to/mcoa
```

### Manual Execution (Cursor IDE)

1. Open MCOA repo in Cursor
2. Tell the agent: "Read @prediction SKILL.md and run the impact-map phase for the prediction engine"
3. Review the impact map
4. Tell the agent: "Impact map approved. Run task-creator for the prediction engine"
5. Review tasks
6. Tell the agent: "Tasks approved. Implement Batch 1 (core models)"
7. Continue through batches with reviews between each

---

## Estimated Timeline

| Phase | Agent Time | Human Time | Calendar Time |
|-------|-----------|------------|---------------|
| Impact Map | 10 min | 30 min | Day 1 |
| Task Creation | 5 min | 15 min | Day 1 |
| Development Batch 1 | 1-2 hours | 30 min review | Day 1-2 |
| Development Batch 2 | 1-2 hours | 30 min review | Day 2-3 |
| Development Batch 3 | 1-2 hours | 30 min review | Day 3-4 |
| MCO Development | 30 min | 15 min review | Day 1 (parallel) |
| Testing | 30 min | 10 min | Day 4 |
| CI Fix | 15-60 min | Monitor | Day 4-5 |
| **Total** | **~5-8 hours** | **~2.5 hours** | **~5 days** |

Compare with manual development: 14-20 weeks → compressed to ~1 week.
