# Agents Reference

Agents are AI instances configured with specific skills and domain knowledge. Each agent understands its repository's architecture, patterns, and conventions.

## Agent Architecture

```
                    ┌──────────────────────────────────┐
                    │       Cursor SDK / IDE            │
                    │                                    │
                    │  Agent.create() / Agent.resume()   │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │          Agent Instance           │
                    │                                    │
                    │  ┌─────────────────────────────┐  │
                    │  │ Skill (SKILL.md)             │  │
                    │  │ - Workflow steps              │  │
                    │  │ - Rules and constraints       │  │
                    │  │ - Output format               │  │
                    │  └─────────────────────────────┘  │
                    │                                    │
                    │  ┌─────────────────────────────┐  │
                    │  │ Rules (.cursorrules)         │  │
                    │  │ - Phase discipline           │  │
                    │  │ - Grounding constraints      │  │
                    │  │ - Implementation limits      │  │
                    │  └─────────────────────────────┘  │
                    │                                    │
                    │  ┌─────────────────────────────┐  │
                    │  │ Context (CLAUDE.md/AGENTS.md)│  │
                    │  │ - Conventions                │  │
                    │  │ - Branch naming              │  │
                    │  │ - Commit format              │  │
                    │  └─────────────────────────────┘  │
                    │                                    │
                    │  Tools: file search, grep, read,  │
                    │  edit, terminal, git, gh           │
                    └──────────────────────────────────┘
```

## Cross-Repo Pipeline Agent

**What it does:** Orchestrates the full 5-phase SDLC across MCO + MCOA repositories.

**Invocation:**
```bash
npx tsx scripts/cross-repo-pipeline.ts \
  --feature "Add PrometheusAgent support for custom metrics" \
  --mco-repo /path/to/mco --mcoa-repo /path/to/mcoa --local
```

**Behavior:**
1. Runs parallel impact maps on both repos
2. Waits for human checkpoint
3. Creates tasks in parallel
4. Implements MCO changes first (usually the dependency direction)
5. Implements MCOA changes second
6. Runs parallel testing + CI fix

**Context needed:** Feature description, repo paths, `CURSOR_API_KEY`

---

## MCO Agents

### MCO Impact Map Agent

Scans the MCO monorepo (5 components) and produces a grounded impact analysis.

**Invocation:** `@impact-map Analyze [feature] for MCO`

**Domain knowledge:**
- MCO monorepo structure (operators/, manifests/, controllers/)
- API types in `api/v1beta2/`
- Controller patterns (AnalyticsReconciler, rightsizing orchestrator)
- Policy mode vs MCOA-delegated mode
- ADC sync to MCOA

### MCO Developer Agent

Implements tasks following MCO Go conventions, DCO sign-off, and monorepo patterns.

**Invocation:** `@developer Implement task [N] for MCO`

**Domain knowledge:**
- Go conventions: `make format`, `make go-lint`, `make unit-tests`
- Monorepo structure: changes to API types trigger `make bundle`
- Vendor management: `make deps` after go.mod changes
- Test patterns: testify assertions, controller-runtime test helpers

### MCO Right-Sizing Specialist

Deep domain knowledge for MCO right-sizing subsystem.

**Invocation:** Auto-triggered by keywords: "rightsizing", "acm_rs", "PrometheusRule policy"

**Domain knowledge:**
- Full code map of `controllers/analytics/rightsizing/`
- rs-namespace, rs-virtualization, rs-utility sub-packages
- Policy + ConfigurationPolicy wrapping patterns
- Placement, PlacementBinding lifecycle
- Delegation behavior (annotation check, ADC sync, cleanup)

---

## MCOA Agents

### MCOA Impact Map Agent

Scans MCOA codebase with awareness of signal packages, Helm charts, and hub-side components.

**Invocation:** `@impact-map Analyze [feature] for MCOA`

**Domain knowledge:**
- MCOA package structure (internal/addon/, internal/analytics/, internal/coo/)
- Signal type awareness (metrics, logging, tracing, incident detection, right-sizing)
- Helm chart rendering pipeline
- ManifestWork generation

### MCOA Developer Agent

Implements tasks following MCOA patterns, Helm chart sync, and signal package conventions.

**Invocation:** `@developer Implement task [N] for MCOA`

**Domain knowledge:**
- Helm chart template patterns
- Signal package → Helm values pipeline
- AddOnDeploymentConfig option parsing
- Perses dashboard builder patterns

### MCOA Right-Sizing Specialist

Deep domain knowledge for MCOA right-sizing: recording rules, handlers, Helm, Perses dashboards.

**Invocation:** Auto-triggered by keywords: "rightsizing", "acm_rs", "ScrapeConfig rightsizing"

**Domain knowledge:**
- Recording rule builder (RuleBuilder fluent API)
- PrometheusRule generation (namespace, virtualization, workload, GPU)
- ScrapeConfig federation configuration
- Handlers pipeline (options → values → Helm)
- Perses dashboard and panel builders

### MCOA Prediction Engine Specialist

Deep domain knowledge for the prediction engine: models, features, anomaly detection, providers.

**Invocation:** Auto-triggered by keywords: "prediction", "forecasting", "Holt-Winters", "anomaly detection"

**Domain knowledge:**
- Multi-model ensemble (Holt-Winters + STL + AR(p))
- Feature engineering pipeline
- Anomaly detection suite
- Pluggable provider architecture
- Training controller and privacy guardrails

---

## Agent Lifecycle

### Creation

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY,
  model: { id: "composer-2" },
  local: { cwd: "/path/to/repo" },
});
```

### Execution

```typescript
const run = await agent.send("Run the impact-map skill...");
for await (const event of run.stream()) {
  // Stream agent output in real-time
}
const result = await run.wait();
```

### Resume (Context Preservation)

```typescript
const agent = Agent.resume(previousAgentId, {
  apiKey: process.env.CURSOR_API_KEY,
  model: { id: "composer-2" },
});
await agent.send("Now run the tester skill...");
```

Agent.resume() preserves the full conversation context, allowing the tester agent to see what the developer agent implemented.

---

## Agent Coordination Patterns

### Sequential (Same Context)

Development → Testing → CI Fix all share context via Agent.resume():

```
Agent.create() → developer skill → Agent.resume() → tester skill → Agent.resume() → ci-fixer skill
```

### Parallel (Independent)

Impact maps on MCO and MCOA run in parallel with separate Agent.create():

```
Promise.all([
  Agent.create() → MCO impact map,
  Agent.create() → MCOA impact map,
])
```

### Cross-Repo (Coordinated)

MCO development completes before MCOA starts (dependency direction):

```
MCO: Agent.create() → develop → Agent.resume() → test
                                                    ↓ (wait for MCO)
MCOA: Agent.create() → develop → Agent.resume() → test
```
