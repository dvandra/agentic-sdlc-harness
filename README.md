# Agentic SDLC Harness

A structured AI-assisted development pipeline based on harness engineering principles. Works with **Cursor** and **Claude**.

> **Structure in, structure out.** The more you constrain the solution space, the more predictable the output.

## What This Does

Turns a feature request into a merge-ready PR through five automated stages:

```
Feature Request
      │
      ▼
┌─────────────────┐
│ 1. Impact Map   │ ← AI scans real code, produces grounded plan
└────────┬────────┘
         │
    [HUMAN REVIEW] ← You approve or edit the map
         │
┌────────▼────────┐
│ 2. Task Creation│ ← Structured tasks with real file paths & symbols
└────────┬────────┘
         │
┌────────▼────────┐
│ 3. Development  │ ← AI implements following the approved plan
└────────┬────────┘
         │
┌────────▼────────┐
│ 4. Testing      │ ← Unit, integration, E2E tests
└────────┬────────┘
         │
┌────────▼────────┐
│ 5. CI Fix       │ ← Auto-fix failures, triage comments
└────────┬────────┘
         │
    [HUMAN MERGE]  ← You approve and merge
```

## Quick Start

### Option A: Use with Cursor IDE (Interactive)

1. Copy this harness into your project:
   ```bash
   cp -r .cursor/skills/ /your/project/.cursor/skills/
   cp -r templates/ /your/project/templates/
   cp CLAUDE.md /your/project/
   cp .cursorrules /your/project/
   ```

2. In Cursor, tell the agent:
   ```
   @impact-map I need to add CSV export for SBOM query results
   ```

3. Review the impact map it produces, then:
   ```
   @task-creator The impact map is approved. Create structured tasks.
   ```

4. For each task:
   ```
   @developer Implement task 1
   ```

5. After implementation:
   ```
   @tester Write tests for the implementation
   ```

6. If CI fails:
   ```
   @ci-fixer Fix the CI failures on this PR
   ```

### Option B: Use with Claude (CLAUDE.md)

1. Copy `CLAUDE.md` and `templates/` into your project root
2. Claude will follow the structured workflow automatically
3. The same phases apply — Claude reads the templates and follows the constraints

### Option C: Fully Automated (Cursor SDK + GitHub Actions)

1. Set up the project:
   ```bash
   npm install
   ```

2. Set your API key:
   ```bash
   export CURSOR_API_KEY="cursor_..."
   ```

3. Run the full pipeline:
   ```bash
   npm run pipeline -- --feature "Add CSV export for SBOMs" --repo https://github.com/org/repo
   ```

4. Or run individual stages:
   ```bash
   npm run impact-map -- --feature "Add CSV export" --repo .
   npm run task-create -- --feature "Add CSV export" --repo .
   npm run develop -- --task 1 --repo .
   npm run test -- --resume <agent-id> --repo .
   npm run ci-fix -- --resume <agent-id> --repo .
   ```

### Option D: GitHub Actions (Event-Driven)

1. Add `CURSOR_API_KEY` to your repo secrets
2. Copy `.github/workflows/agentic-sdlc.yml` to your repo
3. Label an issue with `agent-develop` to trigger the full pipeline
4. CI failures auto-trigger the fix agent
5. Or use manual workflow dispatch for individual stages

## Project Structure

```
.cursor/
  skills/
    impact-map/SKILL.md     ← Phase 1: Codebase analysis
    task-creator/SKILL.md    ← Phase 2: Structured task generation
    developer/SKILL.md       ← Phase 3: Implementation
    tester/SKILL.md          ← Phase 4: Test writing
    ci-fixer/SKILL.md        ← Phase 5: CI failure resolution
  hooks/
    check-phase-gate.sh      ← Prevents skipping human review
    validate-task-template.sh← Validates task format
  hooks.json                 ← Hook configuration

.github/
  workflows/
    agentic-sdlc.yml        ← GitHub Actions automation

scripts/
  orchestrator.ts            ← Full pipeline orchestrator (Cursor SDK)
  run-stage.ts               ← Individual stage runner

templates/
  impact-map-template.md     ← Repository impact map format
  task-template.md           ← Structured task format
  design-doc-template.md     ← Design document format

CLAUDE.md                    ← Conventions for Claude
.cursorrules                 ← Rules for Cursor agents
```

## How It Works (The Harness Engineering Approach)

### The Problem
Telling AI to "implement this Jira ticket" produces inconsistent results because the AI guesses about the codebase instead of analyzing it.

### The Fix
**Phase 1: Repository Impact Map** — Before any code, the AI scans real files, traces symbols, and produces a grounded map of what changes where. A human reviews this map.

**Phase 2: Structured Tasks** — Each task references real file paths, real symbol names, and real patterns from the codebase. No guessing.

**Phase 3-5: Constrained Execution** — The AI implements against a spec, not against a vague description. It knows exactly which files to modify, which patterns to follow, and what tests to write.

### Key Principles
1. **Ground in real code** — Impact map uses file search, grep, symbol tracing
2. **Constrain the solution space** — Structured templates with real paths and symbols
3. **Human checkpoints** — Review between planning and implementation
4. **Structure in, structure out** — Quality of input determines quality of output

## Customization

### Adding Jira Integration
Add a Jira MCP server to your Cursor config or pass it in the SDK:
```typescript
mcpServers: [{
  name: "jira",
  transport: { type: "http", url: "https://your-jira-mcp.example.com" }
}]
```

### Adding Custom Skills
Create new skills in `.cursor/skills/<name>/SKILL.md`. Follow the template in the existing skills.

### Modifying Templates
Edit files in `templates/` to match your team's conventions, ticket format, or coding standards.

## Requirements

- **Cursor IDE** (for interactive use with skills)
- **Cursor API Key** (for SDK automation) — get from [cursor.com/dashboard](https://cursor.com/dashboard/cloud-agents)
- **Node.js 20+** (for SDK scripts)
- **GitHub repo** (for Actions integration)

## Pre-Built Repo Harnesses

This project includes tailored harnesses for two repositories:

### MCO (multicluster-observability-operator)

```bash
# Install harness into your MCO checkout
./scripts/setup-repo.sh mco ~/code/multicluster-observability-operator
```

Includes:
- 5 MCO-specific skills (monorepo-aware, Legacy/MCOA architecture tagging)
- MCO impact map template (covers all 5 components)
- Hooks for vendor/bundle/faillint warnings
- Complements the existing `AGENTS.md` in the repo

### MCOA (multicluster-observability-addon)

```bash
# Install harness into your MCOA checkout
./scripts/setup-repo.sh mcoa ~/code/multicluster-observability-addon
```

Includes:
- 5 MCOA-specific skills (signal-type aware, Helm chart sync)
- AGENTS.md (MCOA doesn't have one yet — this adds it)
- Hooks for signal-package → Helm chart consistency
- MCOA impact map template (covers signals, layers, charts)

### Cross-Repo Features (MCO + MCOA)

```bash
# Run parallel impact maps + sequential implementation
npx tsx scripts/cross-repo-pipeline.ts \
  --feature "Add custom metrics via PrometheusAgent" \
  --mco-repo https://github.com/<org>/multicluster-observability-operator \
  --mcoa-repo https://github.com/<org>/multicluster-observability-addon
```
