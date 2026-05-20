# Architecture

## System Overview

The Agentic SDLC Harness is a coordination layer that sits above target repositories, orchestrating specialized AI agents through a structured pipeline with human checkpoints.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        AGENTIC SDLC HARNESS                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Coordination Layer                                                     │  │
│  │                                                                        │  │
│  │  .cursorrules          — Phase discipline rules (enforced on all agents)│  │
│  │  CLAUDE.md             — Workflow conventions for Claude-based agents   │  │
│  │  templates/            — Impact map, task, and design doc templates     │  │
│  │  .cursor/skills/       — 5 cross-repo skill definitions                │  │
│  │  scripts/              — Cursor SDK orchestrator + stage runner         │  │
│  │  .github/workflows/    — GitHub Actions pipeline automation            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ repos/mco/ (MCO Harness)    │  │ repos/mcoa/ (MCOA Harness)           │  │
│  │                              │  │                                      │  │
│  │  .cursor/skills/             │  │  .cursor/skills/                     │  │
│  │    impact-map/               │  │    impact-map/                       │  │
│  │    task-creator/             │  │    task-creator/                     │  │
│  │    developer/                │  │    developer/                       │  │
│  │    tester/                   │  │    tester/                          │  │
│  │    ci-fixer/                 │  │    ci-fixer/                        │  │
│  │    rightsizing/  (specialist)│  │    rightsizing/  (specialist)       │  │
│  │                              │  │    prediction/   (specialist)       │  │
│  │  CLAUDE.md (MCO conventions) │  │  CLAUDE.md (MCOA conventions)       │  │
│  │  AGENTS.md (MCO agents)      │  │  AGENTS.md (MCOA agents)           │  │
│  │  templates/ (MCO templates)  │  │  templates/ (MCOA templates)       │  │
│  └──────────────────────────────┘  └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Flow

```
Feature Request / Jira Ticket
        │
        ▼
┌─────────────────────┐
│ Phase 1: Impact Map  │ ← AI scans real code, verifies every path/symbol
│ Skill: @impact-map   │
│ Output: docs/impact-maps/<slug>.md
└──────────┬──────────┘
           │
    ╔══════╧══════╗
    ║ HUMAN       ║ ← Reviewer approves or edits the map
    ║ CHECKPOINT  ║
    ╚══════╤══════╝
           │
┌──────────▼──────────┐
│ Phase 2: Task Create │ ← Structured tasks with real file paths
│ Skill: @task-creator │
│ Output: docs/tasks/<slug>/task-N.md
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Phase 3: Development │ ← Implements following task spec exactly
│ Skill: @developer    │
│ Output: Feature branch + PR
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Phase 4: Testing     │ ← Unit / integration / E2E tests
│ Skill: @tester       │
│ Output: Test coverage map
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Phase 5: CI Fix      │ ← Auto-diagnose and fix CI failures
│ Skill: @ci-fixer     │
│ Output: Green CI (max 5 attempts)
└──────────┬──────────┘
           │
    ╔══════╧══════╗
    ║ HUMAN       ║ ← Reviewer approves and merges PR
    ║ MERGE       ║
    ╚═════════════╝
```

## Execution Modes

### Mode A: Interactive (Cursor IDE)

The developer invokes skills directly in the Cursor IDE chat:

```
User: @impact-map Analyze what needs to change for CSV export
Agent: [scans codebase, produces impact map, stops for review]
User: Approved. @task-creator Create structured tasks.
Agent: [creates tasks, presents summary table]
User: @developer Implement task 1
Agent: [implements, self-reviews, opens PR]
```

### Mode B: Automated (Cursor SDK)

The `orchestrator.ts` script chains agents programmatically:

```
Agent.create() → Impact Map → [Human Checkpoint] → Task Creation
              → Agent.create() → Development → Agent.resume() → Testing
              → Agent.resume() → CI Fix → Done
```

### Mode C: Event-Driven (GitHub Actions)

```yaml
# Label an issue → full pipeline
issues: [labeled: "agent-develop"]

# CI fails on PR → auto-fix
check_suite: [completed: failure]

# Manual → any individual stage
workflow_dispatch: [stage: impact-map|develop|test|ci-fix]
```

### Mode D: Cross-Repo Pipeline

For features spanning MCO + MCOA:

```
Phase 1: Parallel impact maps (MCO + MCOA simultaneously)
Phase 2: Parallel task creation
Phase 3: Sequential development (MCO first → MCOA second)
Phase 4: Parallel testing + CI fix
```

## Design Principles

### 1. Ground in Real Code

Every plan starts by scanning the actual codebase. The impact map agent uses file search, grep, and symbol tracing to find real file paths, real function signatures, and real patterns. Nothing is invented.

### 2. Constrain the Solution Space

Structured templates force the AI to reference real paths, real symbols, and real patterns. The developer agent follows a task spec, not a vague description. This eliminates architectural freelancing.

### 3. Human Checkpoints

The pipeline pauses between planning and implementation. A human reviews the impact map before any code is written. This catches misunderstandings early, when they're cheapest to fix.

### 4. Phase Discipline

Rules in `.cursorrules` enforce strict ordering:
- Never skip phases
- Never start coding without an approved impact map
- Never make architectural decisions during implementation
- Always pause for human review after planning

### 5. One Repo Per Task

Cross-repo features are decomposed into per-repo tasks. Each task targets exactly one repository, preventing tangled changes. Cross-repo coordination happens at the impact map level.
