# Registered AI Agents

> context_type: registered_ai_agents

## Available Agents

### Cross-Repo Pipeline Agent
- **What it does**: Orchestrates the full 5-phase SDLC across MCO + MCOA
- **How to invoke**: `npx tsx scripts/cross-repo-pipeline.ts --feature "..." --mco-repo /path --mcoa-repo /path --local`
- **Context needed**: Feature description, local repo paths, CURSOR_API_KEY
- **Limitations**: Requires human checkpoint approval between phases

### MCO Impact Map Agent
- **What it does**: Scans the MCO monorepo and produces a grounded impact analysis
- **How to invoke**: In Cursor IDE, tell the agent: "Read @impact-map SKILL.md and run impact map for [feature]"
- **Context needed**: Feature description, which MCO components are potentially affected
- **Skills used**: `repos/mco/.cursor/skills/impact-map/SKILL.md`

### MCOA Impact Map Agent
- **What it does**: Scans the MCOA codebase and produces a grounded impact analysis
- **How to invoke**: In Cursor IDE, tell the agent: "Read @impact-map SKILL.md and run impact map for [feature]"
- **Context needed**: Feature description, which MCOA packages are potentially affected
- **Skills used**: `repos/mcoa/.cursor/skills/impact-map/SKILL.md`

### MCO/MCOA Developer Agent
- **What it does**: Implements a structured task following approved plan and Go conventions
- **How to invoke**: "Read @developer SKILL.md and implement task [N]"
- **Context needed**: Approved impact map, structured task from task-creator
- **Skills used**: `repos/{mco,mcoa}/.cursor/skills/developer/SKILL.md`

### MCO/MCOA Tester Agent
- **What it does**: Writes unit, integration, and E2E tests for an implementation
- **How to invoke**: "Read @tester SKILL.md and write tests for [feature]"
- **Context needed**: Implemented code, test patterns from existing tests
- **Skills used**: `repos/{mco,mcoa}/.cursor/skills/tester/SKILL.md`

### MCO/MCOA CI-Fixer Agent
- **What it does**: Diagnoses and fixes CI failures automatically
- **How to invoke**: "Read @ci-fixer SKILL.md and fix CI failures on this PR"
- **Context needed**: CI output/logs, failed check names
- **Skills used**: `repos/{mco,mcoa}/.cursor/skills/ci-fixer/SKILL.md`

### Right-Sizing Specialist Agent
- **What it does**: Provides deep domain knowledge for right-sizing changes
- **How to invoke**: "Read @rightsizing SKILL.md" (auto-triggered by keywords)
- **Context needed**: Which RS variant (namespace, virt, workload, GPU), which mode (MCO-managed vs MCOA-delegated)
- **Skills used**: `repos/{mco,mcoa}/.cursor/skills/rightsizing/SKILL.md`

### Prediction Engine Specialist Agent
- **What it does**: Provides deep domain knowledge for the prediction engine
- **How to invoke**: "Read @prediction SKILL.md" (auto-triggered by keywords)
- **Context needed**: Which component (model, features, anomaly, provider, training, privacy)
- **Skills used**: `repos/mcoa/.cursor/skills/prediction/SKILL.md`
