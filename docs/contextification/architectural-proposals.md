# Architectural Proposals

> context_type: architectural_proposals

## Where Proposals Live

| Format | Location |
|--------|----------|
| Design docs (HTML presentations) | `~/agentic-sdlc-harness/` (local) |
| Plan files | `.cursor/plans/rs_prediction_model_*.plan.md` |
| SDLC execution guide | `docs/rs-prediction-agentic-sdlc.md` |
| Architecture canvas | `canvases/rs-prediction-architecture.canvas.tsx` |
| Contextification docs | `docs/contextification/` |

## Current Proposals

### RS Agent + LLM Backend: Unified Design (April 2026)
- **Status**: Design approved, scaffolding ~70% complete
- **Files**: design presentation slides (HTML)
- **Decision**: Custom RS Agent with LLM integration, hub-spoke hybrid
- **Key tradeoffs**: Custom agent vs. extending VPA (chose custom for multi-cluster awareness)

### Pluggable Prediction Engine (May 2026)
- **Status**: Plan approved, implementation pending
- **File**: `.cursor/plans/rs_prediction_model_*.plan.md`
- **Decision**: Pure Go ensemble with pluggable provider interface
- **Key tradeoffs**:
  - Pure Go vs. Python sidecar — chose Go for zero deps, compiled-in safety
  - Single model vs. ensemble — chose ensemble for coverage across workload patterns
  - Fixed vs. pluggable — chose pluggable so customers can bring own models
  - Hub-only vs. hub+spoke prediction — chose hub-only for privacy centralization

### Past Decisions That Affect Prediction Engine

| Decision | When | Rationale | Impact |
|----------|------|-----------|--------|
| Recording rules at namespace level | 2025 | Reduce metric cardinality | Prediction gets namespace-level input, not container-level |
| ConfigMap-based state | 2025 | No external DB dependency | Model params stored in ConfigMaps (~200B/workload) |
| MCOA delegation model | 2025 | Separation of concerns | MCO owns API, MCOA owns implementation |
| In-memory predicate eval | 2026 | Reduce hub resource count | No Placement resources for per-cluster matching |
| Percentile profiles | 2026 | Multiple recommendation tiers | Prediction can output per-percentile forecasts |

## Proposals in Flight

None currently — the prediction engine plan is the active proposal.
