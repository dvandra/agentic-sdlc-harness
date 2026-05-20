# Skills Reference

Skills are structured SKILL.md files that define an agent's behavior, workflow, rules, and output format. Each skill is purpose-built for one phase of the SDLC pipeline.

## Cross-Repo Skills (Harness Level)

These skills live in `.cursor/skills/` at the harness root and work across any repository.

### impact-map

**Location:** `.cursor/skills/impact-map/SKILL.md`

**Purpose:** Scan the real codebase and produce a grounded impact map before any code is written.

**Triggers:** "plan", "analyze", "impact map", "what needs to change"

**Workflow:**
1. Read the requirement (Jira ticket, feature spec, user description)
2. Scan the codebase using file search, grep, symbol search, and reading key files
3. Produce an impact map using `templates/impact-map-template.md`
4. Stop and request human review

**Key Rules:**
- Every file path must be verified by reading or searching
- Every symbol reference must come from the codebase
- Mark low-confidence sections explicitly
- Map each repository separately for multi-repo features

**Output:** `docs/impact-maps/<feature-slug>.md`

---

### task-creator

**Location:** `.cursor/skills/task-creator/SKILL.md`

**Purpose:** Convert an approved impact map into structured, implementation-ready tasks.

**Triggers:** "create tasks", "break down", "task creation", "structured tasks"

**Prerequisites:** An approved impact map must exist.

**Workflow:**
1. Read the approved impact map
2. Read the task template
3. For each task: verify file paths, find symbols, write acceptance criteria, define test requirements
4. Order tasks by dependency
5. Present summary table

**Key Rules:**
- One repository per task
- Every file path must be a real, verified path
- Acceptance criteria must be testable
- Flag open questions that affect task structure

**Output:** `docs/tasks/<feature-slug>/task-<number>.md`

---

### developer

**Location:** `.cursor/skills/developer/SKILL.md`

**Purpose:** Implement a structured task following the approved plan exactly.

**Triggers:** "implement", "develop", "code", "build this task"

**Prerequisites:** A structured task must exist in `docs/tasks/`.

**Workflow:**
1. Read the task spec
2. Read all referenced files and patterns
3. Create a feature branch (`agent/<jira-key>-<short-description>`)
4. Implement changes following existing patterns
5. Write tests alongside implementation
6. Self-review against acceptance criteria
7. Open a PR

**Key Rules:**
- Never deviate from the task spec without asking
- Never refactor unrelated code
- Never skip tests
- Report discrepancies instead of guessing fixes

---

### tester

**Location:** `.cursor/skills/tester/SKILL.md`

**Purpose:** Write comprehensive tests validating implementation against the task spec.

**Triggers:** "test", "write tests", "add coverage"

**Workflow:**
1. Read the task spec's acceptance criteria and test requirements
2. Find existing test patterns (framework, naming, helpers, fixtures)
3. Write tests in three layers: Unit, Integration, E2E
4. Run tests and verify they pass
5. Report coverage map

**Output:** Coverage map table showing test coverage per acceptance criterion.

---

### ci-fixer

**Location:** `.cursor/skills/ci-fixer/SKILL.md`

**Purpose:** Diagnose and fix CI failures automatically, looping until green.

**Triggers:** "fix CI", "CI is red", "pipeline failed"

**Workflow:**
1. Get CI failure details (read check runs, download logs)
2. Categorize failure (build, test, lint, dependency, flaky, infrastructure)
3. Fix with minimal change
4. Push and monitor
5. Loop (max 5 attempts)

**Key Rules:**
- Minimal, scoped fixes only
- Never skip or disable failing tests
- Never force-push or rewrite history
- Escalate after 3 attempts on the same failure

---

## Domain Specialist Skills (Repo Level)

These skills live in `repos/<repo>/.cursor/skills/` and carry deep domain knowledge.

### rightsizing (MCO)

**Location:** `repos/mco/.cursor/skills/rightsizing/SKILL.md`

**Purpose:** Provide domain knowledge for the MCO right-sizing subsystem.

**Covers:**
- MCO CR API types (`PlatformAnalyticsSpec`, `PlatformRightSizingRecommendationSpec`)
- Controllers (`AnalyticsReconciler`, rightsizing orchestrator)
- Sub-packages (rs-namespace, rs-virtualization, rs-utility)
- Policy mode vs MCOA-delegated mode
- ADC sync, delegation detection, cleanup
- Recording rules data flow
- Existing patterns for adding new RS capability types

### rightsizing (MCOA)

**Location:** `repos/mcoa/.cursor/skills/rightsizing/SKILL.md`

**Purpose:** Provide domain knowledge for the MCOA right-sizing subsystem.

**Covers:**
- Core types, constants, builder, rule builder, scrape config
- Namespace and virtualization PrometheusRule generation
- Handlers (options builder, values bridge, resource reconciliation)
- Helm chart templates and values
- Perses dashboard builders and panels
- ScrapeConfig federation configuration
- Patterns for adding new RS component types

### prediction (MCOA)

**Location:** `repos/mcoa/.cursor/skills/prediction/SKILL.md`

**Purpose:** Provide domain knowledge for the MCOA prediction engine.

**Covers:**
- Multi-model ensemble (Holt-Winters, STL, AR(p))
- Feature engineering pipeline (temporal, statistical, trend, workload, correlation)
- Anomaly detection suite (Z-score, rate-of-change, adaptive thresholds)
- Optimization recommender (forecast + anomaly + safety bounds)
- Pluggable provider interface (built-in, ONNX, external API, custom endpoint)
- Training controller (6h cycle, Thanos range queries)
- Privacy guardrails (NetworkPolicy, audit, RBAC, consent)
- Recording rules and new metrics

## Skill Composition

Skills can be composed for complex tasks. The agent reads multiple skills to get combined knowledge:

| Combination | Use Case |
|------------|----------|
| impact-map + rightsizing | Analyze prediction engine feature across repos |
| developer + prediction | Implement STL model following prediction patterns |
| tester + rightsizing | Write tests for forecast recording rules |
| ci-fixer + developer | Fix CI using developer conventions |

## Hooks (Automated Behaviors)

Hooks fire automatically in response to agent events:

| Hook | Trigger | Purpose |
|------|---------|---------|
| check-phase-gate.sh | Before next SDLC phase | Blocks progression without human approval |
| mco-post-edit.sh | After file edit in MCO | Reminds: `make deps`, `make bundle`, `fmt.Print` detection |
| mcoa-post-edit.sh | After file edit in MCOA | Reminds: Helm chart updates, scheme registration |
