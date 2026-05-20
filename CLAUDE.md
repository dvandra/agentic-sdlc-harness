# Agentic SDLC Harness

This project implements a structured AI-assisted development workflow based on harness engineering principles. The AI operates within constrained phases — each with explicit inputs, outputs, and human checkpoints.

## Core Principle: Structure In, Structure Out

Never ask the AI to "implement this" from a vague description. Instead:
1. Ground every plan in real code (repository impact map)
2. Constrain every task with real file paths, symbol names, and existing patterns
3. Pause for human review between planning and implementation

## Workflow Phases

### Phase 1: Repository Impact Map
Before any code is written, scan the codebase and produce a grounded impact map.
- Use `@impact-map` skill
- Output: which repos/modules/files are affected and why
- **HUMAN CHECKPOINT**: reviewer approves the map before proceeding

### Phase 2: Structured Task Creation
Convert the approved impact map into structured tasks.
- Use `@task-creator` skill
- Each task follows the strict template in `templates/task-template.md`
- Every task references real file paths, real symbol names, real patterns

### Phase 3: Implementation
Implement each structured task.
- Use `@developer` skill
- Follow the plan exactly — no architectural freelancing
- Self-review before opening PR

### Phase 4: Testing
Write comprehensive tests for the implementation.
- Use `@tester` skill
- Unit, integration, and E2E tests matching acceptance criteria

### Phase 5: CI & Auto-fix
Monitor CI, fix failures, triage comments.
- Use `@ci-fixer` skill or Cursor's built-in `babysit` skill
- Loop until green

## Conventions

- Branch naming: `agent/<jira-key>-<short-description>`
- Commit format: `feat|fix|test|docs(<scope>): <description>`
- PR title: `[<JIRA-KEY>] <description>`
- All design docs go in `docs/designs/`
- All impact maps go in `docs/impact-maps/`

## File Layout

```
.cursor/skills/       — Agent skills for each phase
.github/workflows/    — GitHub Actions for automation
scripts/              — Cursor SDK orchestrator scripts
templates/            — Structured templates (task, impact map, design doc)
docs/                 — Generated plans, impact maps, design decisions
```
