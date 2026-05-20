# Agentic AI SDLC: Skills, Agents, and Templates

This document catalogs **project skills** (`.cursor/skills/`), **Cursor built-in skills** (`~/.cursor/skills-cursor/`), **subagent types** used in the lifecycle, **templates**, and **key configuration** for the Agentic SDLC harness in this repository.

**Scope:** Descriptions are taken from the actual `SKILL.md` files and project templates as of the document’s creation. Invoke skills in chat with `@skill-name` (for example `@impact-map`).

---

## Table of contents

1. [Workflow overview](#workflow-overview)
2. [Project skills (SDLC phases 1–5)](#project-skills-sdlc-phases-15)
3. [Cursor built-in skills](#cursor-built-in-skills)
4. [Agent and subagent types](#agent-and-subagent-types)
5. [Templates](#templates)
6. [Configuration files](#configuration-files)
7. [Quick reference paths](#quick-reference-paths)

---

## Workflow overview

The harness strings **phased skills**, **readonly or specialized subagents**, **templates**, and **human checkpoints** into one pipeline. The diagram below matches the workflow described in `CLAUDE.md` and the individual skill files.

| Phase | Goal | Primary skill | Typical agents / tools | Templates & artifacts | Human checkpoint |
|------|------|---------------|-------------------------|-------------------------|------------------|
| **1** | Repository impact map | `@impact-map` | **`explore`** (readonly codebase scan); general search/read tools | Output: `docs/impact-maps/<feature-slug>.md` from `templates/impact-map-template.md` | Review and approve impact map before tasks |
| **2** | Structured task creation | `@task-creator` | Main agent (structured breakdown); optional Jira MCP | Output: `docs/tasks/<feature-slug>/task-<n>.md` from `templates/task-template.md` | Confirm task list and ordering |
| **3** | Implementation | `@developer` | **`generalPurpose`**, **`shell`** (branch, build, tests, git) | PR: `[<JIRA-KEY>] ...`; branch `agent/<jira-key>-<short-description>` | Self-review vs acceptance criteria |
| **4** | Testing | `@tester` | **`shell`** (test runners, coverage) | Tests colocated per repo conventions; coverage map in skill output | All criteria covered by tests |
| **5** | CI & merge readiness | `@ci-fixer` + `@babysit` | **`ci-investigator`** (logs, failure taxonomy); **`shell`**; optional **`browser-use`** for UI checks | Fixes pushed; `gh` / check runs | Green CI; comments/conflicts triaged |

**How the pieces connect**

- **Templates** define the shape of human-reviewable artifacts (impact map, task, design doc).
- **Project skills** enforce phase order, grounding in real paths/symbols, and explicit stop points.
- **Cursor skills** add platform capabilities (SDK, hooks, rules, PR babysitting, canvas, CLI/IDE settings).
- **Subagents** isolate modes (e.g. readonly exploration vs. command execution) so the main agent keeps context for decisions.

---

## Project skills (SDLC phases 1–5)

All project skills live under `.cursor/skills/<skill-name>/SKILL.md`. Each file includes YAML frontmatter (`name`, `description`) used for discovery when you reference `@skill-name`.

### Summary table

| Skill | Phase | When it triggers (from skill description) |
|-------|-------|-------------------------------------------|
| `impact-map` | 1 — Repository impact map | New feature, Jira ticket, or phrases like “plan”, “analyze”, “impact map”, “what needs to change” |
| `task-creator` | 2 — Structured task creation | After human approval of impact map; “create tasks”, “break down”, “task creation”, “structured tasks” |
| `developer` | 3 — Implementation | “implement”, “develop”, “code”, “build this task”, or a task under `docs/tasks/` — **only** with approved task + impact map |
| `tester` | 4 — Testing | “test”, “write tests”, “add coverage”, or after developer skill completes |
| `ci-fixer` | 5 — CI & auto-fix | CI fails, “fix CI”, “CI is red”, “pipeline failed”, GitHub Actions `check_suite` failure; loops until green (with limits) |

---

### `impact-map` (Phase 1)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Analyze the **real codebase** first and produce a **grounded impact map** that constrains all downstream work. |
| **Inputs** | A requirement: Jira ticket, user description, or feature spec. |
| **Process** | Read requirement → scan repo (glob, grep, read key files) → fill `templates/impact-map-template.md` → **stop for human review** (do not proceed to task creation). |
| **Outputs** | File: `docs/impact-maps/<feature-slug>.md`. Final message must include: summary, full impact map, open questions, explicit: *“This impact map requires your review before I proceed.”* |
| **Rules (high level)** | No guessed paths or invented symbols; flag low confidence; multi-repo = separate sections; identify patterns to follow. |

---

### `task-creator` (Phase 2)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Turn an **approved** impact map into **implementation-ready structured tasks**. |
| **Prerequisites** | Impact map exists under `docs/impact-maps/` **and** is human-approved; otherwise stop and explain. |
| **Inputs** | Approved impact map; `templates/task-template.md`. |
| **Process** | Verify paths still exist; align symbols/patterns; acceptance criteria + test requirements per task; order by dependency; one repo per task. |
| **Outputs** | Files: `docs/tasks/<feature-slug>/task-<number>.md`; summary table (`#`, Title, Repo, Depends On, Complexity). Optional: Jira epic/stories if Jira MCP available. |

---

### `developer` (Phase 3)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Implement a **single structured task** without making new architectural decisions (those live in the impact map). |
| **Prerequisites** | Task in `docs/tasks/` referencing an approved impact map; understand “Implementation Notes” patterns. |
| **Inputs** | Task file; all “Files to Modify”; referenced patterns. |
| **Process** | Branch `agent/<jira-key>-<short-description>` → implement only scoped files → tests alongside → self-review → PR with title `[<JIRA-KEY>] <description>`, body with acceptance checklist, links to task + impact map. |
| **Outputs** | Code + tests; commits like `feat|fix|test|docs(<scope>): <description>`. |
| **Rules (high level)** | No scope creep; stop and report if spec disagrees with repo; every acceptance criterion needs tests. |

---

### `tester` (Phase 4)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Validate implementation against the task spec with **unit, integration, and E2E** layers where applicable. |
| **Prerequisites** | Task has “Test Requirements”; implementation exists; knowledge of project test conventions. |
| **Inputs** | Task spec (acceptance + test requirements); repo test layout and frameworks. |
| **Process** | Discover existing patterns → write unit / integration / E2E tests per conventions → run tests → check coverage vs criteria. |
| **Outputs** | Coverage map table mapping each acceptance criterion to specific tests; report gaps. |
| **Rules (high level)** | No new frameworks; deterministic tests; descriptive test names; positive and negative cases. |

---

### `ci-fixer` (Phase 5)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Diagnose CI failures on a PR, apply **minimal** fixes, push, and re-check until green. |
| **Inputs** | PR check runs and logs (`gh` CLI or GitHub MCP); failure details. |
| **Process** | Categorize failure (build, test, lint, deps, flaky, infra) → smallest fix → commit `fix(ci): <what was fixed>` → push → monitor; **max 5** fix-push-check cycles, then escalate. |
| **Outputs** | Scoped commits; status report; escalation if same failure after 3 attempts or architectural change needed. |
| **Rules (high level)** | No large refactors for CI; don’t disable tests; no force-push/history rewrite; don’t change workflows just to pass unrelated failures. |

---

## Cursor built-in skills

These skills ship under `~/.cursor/skills-cursor/` (each in `<name>/SKILL.md`). **Do not author new skills in that directory** — it is reserved for Cursor’s built-ins (`create-skill` documents personal/project locations as `~/.cursor/skills/` and `.cursor/skills/`).

The user-requested set is listed first; **additional** skills discovered in the same directory are included for completeness.

### Skills you listed (team-facing)

| Skill | Purpose / when it triggers |
|-------|----------------------------|
| **`babysit`** | Keep a PR **merge-ready**: resolve conflicts (preserving intent), triage/review comments (including Bugbot), fix **in-scope** CI; merge/rebase base when appropriate; don’t weaken CI or make unrelated changes. |
| **`create-hook`** | Create or update **Cursor hooks** (`hooks.json`, scripts): choose event (`preToolUse`, `beforeShellExecution`, `subagentStart`, etc.), command vs prompt hook, matchers, `failClosed`, stdin/stdout JSON. |
| **`create-rule`** | Create **`.cursor/rules/*.mdc`** rules: `description`, `globs`, `alwaysApply`; keep concise, one concern per rule. |
| **`create-skill`** | Author **Agent Skills**: frontmatter (`name`, `description`, optional `disable-model-invocation`), storage in project `.cursor/skills/` or user `~/.cursor/skills/`, progressive disclosure, scripts, anti-patterns. |
| **`sdk`** | Build automations with **`@cursor/sdk`**: `Agent.prompt`, `Agent.create` + `send` + `stream` + `wait`, `Agent.resume`, local vs cloud, `CursorAgentError` vs `result.status`, disposal, MCP, production practices; points to [Cursor TypeScript SDK docs](https://cursor.com/docs/api/sdk/typescript). |
| **`split-to-prs`** | Split work into **small PRs**: assess state vs default branch, ownership boundaries, propose slices (Mermaid if helpful); **no** branch/commit/push/PR until user approves; stash snapshot pattern; stage only named files/hunks. |
| **`statusline`** | Configure CLI **status line** via `~/.cursor/cli-config.json` → `statusLine.command`, stdin JSON payload (`StatusLinePayload`), debounce/timeout, multi-line + ANSI. |
| **`update-cursor-settings`** | Edit **IDE user** `settings.json` (paths per OS): editor/theme/terminal/Cursor-specific keys; preserve existing JSON; note workspace `.vscode/settings.json` vs user settings. |
| **`canvas`** | Build **`.canvas.tsx`** live UI beside chat for analytical deliverables; **no** `fetch`; import only `cursor/canvas`; design rules (tokens, no gradients/emojis/shadow slop); file location under workspace `canvases/` per skill. |

### Additional built-in skills (same folder)

| Skill | Purpose / when it triggers |
|-------|----------------------------|
| **`update-cli-config`** | Read/write **`~/.cursor/cli-config.json`**: `permissions`, `approvalMode`, `sandbox`, `vimMode`, `display`, `attribution`, Bedrock, etc.; project overrides `.cursor/cli.json` merged from git root cwd-ward. |
| **`migrate-to-skills`** | Migrate “applied intelligently” **`.mdc` rules** (no globs, not always-apply) and **slash commands** `.md` → `.cursor/skills/*/SKILL.md` with **verbatim** body; use subagents for bulk work when Task tool available. |
| **`create-subagent`** | Define **custom subagents** in `.cursor/agents/*.md` (project) or `~/.cursor/agents/*.md` (user): frontmatter `name`, `description`; body = system prompt. |
| **`shell`** | **Only** when user invokes `/shell`: treat remainder of message as **literal** shell command — run immediately without rewriting. |

### Inputs and outputs (Cursor skills) — condensed

Because many platform skills are **how-to guides** rather than single-artifact pipelines, this table summarizes **typical** inputs/outputs:

| Skill | Typical inputs | Typical outputs |
|-------|----------------|-----------------|
| `babysit` | PR URL/branch, `gh` state, CI logs, review threads | Resolved conflicts, comment responses, scoped CI fixes, merge-ready PR |
| `create-hook` | Desired event, policy (audit/gate/rewrite), project vs user scope | `.cursor/hooks.json` or `~/.cursor/hooks.json` + executable scripts |
| `create-rule` | Purpose, globs vs always-apply | `.cursor/rules/*.mdc` |
| `create-skill` | Purpose, triggers, location | `SKILL.md` (+ optional reference/scripts) |
| `sdk` | Integration goal, runtime choice, API key/MCP | TypeScript using `@cursor/sdk` |
| `split-to-prs` | Current diff, intent, ownership map | Approved split plan → branches/PRs |
| `statusline` | Script path, formatting preference | `cli-config.json` `statusLine` block + optional script |
| `update-cursor-settings` | Desired IDE behavior | Updated `settings.json` |
| `canvas` | Data-rich deliverable need | `.canvas.tsx` under managed `canvases/` path |
| `update-cli-config` | CLI behavior change | Updated `cli-config.json` |
| `migrate-to-skills` | Legacy rules/commands | New `SKILL.md` files; optional deletion of sources |
| `create-subagent` | Specialized workflow | `.md` agent definition |

**SDLC phase:** These are **cross-cutting** (platform). Only `babysit` and (with `@ci-fixer`) CI workflows align most closely with **Phase 5**.

---

## Agent and subagent types

**Subagents** are specialized agents with isolated context (see `create-subagent` skill). Cursor **hooks** can match `subagentStart` / `subagentStop` by **subagent type**; the `create-hook` skill explicitly gives examples: `generalPurpose`, `explore`, `shell`.

The table below matches **how this harness workflow uses agent modes** (including types you asked to catalog). Names may appear in product UI, hook matchers, or orchestration docs.

| Type | Role | Typical use in this SDLC |
|------|------|---------------------------|
| **`generalPurpose`** | Default **multi-step** reasoning and implementation | End-to-end work in Phases 2–4: edits, reasoning, PR preparation, coordinating tools |
| **`explore`** | **Readonly** codebase exploration | Phase 1 impact mapping: search/read without mutating; keeps planning context clean |
| **`shell`** | **Command execution** focus | Running tests, linters, `gh`, builds, git operations in Phases 3–5 (also a **`/shell` skill** for literal commands) |
| **`browser-use`** | **Browser** automation / E2E | Validating user-visible flows when acceptance criteria need a real UI (Phase 4 or CI follow-up) |
| **`ci-investigator`** | **CI failure** analysis | Phase 5: parse logs, classify failure, narrow root cause before `ci-fixer` applies a minimal patch |
| **`best-of-n-runner`** | **Parallel isolated** attempts | Optional experiments (e.g. multiple fix strategies or prompt variants) with **merge of best outcome** — use when tasks are safe to isolate and compare |

**Note:** Custom subagent types can be added via `.cursor/agents/` per the `create-subagent` skill; hook matchers should align with the types your team actually registers.

---

## Templates

Templates live in `templates/` at the repo root. They define **required sections** so artifacts are reviewable and mechanically consumed by the next phase.

### `impact-map-template.md`

| Section | Intent |
|---------|--------|
| Feature / Source | One-line feature; provenance (Jira, Slack, etc.) |
| Codebase analysis method | How the map was grounded (search, tracing, etc.) |
| Impact map (per repo) | Modules, files, patterns, dependencies, confidence |
| Risks & open questions | Checkbox items for human decisions |
| Proposed task breakdown | Numbered tasks with repo and complexity (S/M/L) |
| Status | `AWAITING HUMAN REVIEW` — blocks task creation until approved |

---

### `task-template.md`

| Section | Intent |
|---------|--------|
| Repository | **Single** repo per task |
| Jira Key | e.g. `PROJ-1234` |
| Description | What and why (one paragraph) |
| Files to Modify / Create | **Real paths** from impact analysis |
| Implementation Notes | Concrete symbols and patterns to mirror |
| Acceptance Criteria | Testable checkboxes |
| Test Requirements | Unit / integration / E2E expectations |
| Dependencies / Out of scope | Ordering and boundaries |

---

### `design-doc-template.md`

| Section | Intent |
|---------|--------|
| Context / Impact map reference | Why and link to `docs/impact-maps/...` |
| Design decisions | Options, choice, rationale |
| Architecture | Components, data flow, API changes |
| Implementation plan | Ordered tasks with dependencies |
| Rollback / Security / Performance | Operational and non-functional concerns |
| Status | `AWAITING HUMAN REVIEW` |

---

### Additional template in this repo

| File | Intent |
|------|--------|
| `rightsizing-impact-map-template.md` | Specialized **cross-repo rightsizing** checklist (variants, recording rules, federation, config layers, validation); use when that domain applies, same “grounded paths” discipline as Phase 1. |

---

## Configuration files

| File / directory | Role |
|------------------|------|
| **`CLAUDE.md`** | Project **conventions**: phases 1–5, `@skills` per phase, branch/commit/PR naming, where design docs and impact maps live, high-level file layout. |
| **`.cursorrules`** | Workspace **agent rules**: phase discipline, no coding without approved impact map, templates for structured output, one-repo-per-task, tests with implementation, communication when blocked. |
| **`.cursor/skills/`** | **Project Agent Skills** (`SKILL.md` per skill) — this harness’s Phase 1–5 automation. |
| **`templates/`** | **Structured outputs** for impact maps, tasks, design docs (and domain-specific variants). |
| **`docs/`** | **Generated or reviewed artifacts**: impact maps (`docs/impact-maps/`), tasks (`docs/tasks/`), designs (`docs/designs/` per `CLAUDE.md`). |

Related (not duplicated in full here):

- **Hooks:** `.cursor/hooks.json` / `~/.cursor/hooks.json` — see `create-hook` skill.
- **Rules:** `.cursor/rules/*.mdc` — see `create-rule` skill.
- **CLI:** `~/.cursor/cli-config.json` — see `update-cli-config` / `statusline` skills.
- **IDE:** Cursor `settings.json` — see `update-cursor-settings` skill.

---

## Quick reference paths

```text
agentic-sdlc-harness/
├── .cursor/
│   └── skills/           # impact-map, task-creator, developer, tester, ci-fixer
├── templates/            # impact-map, task, design-doc (+ rightsizing variant)
├── docs/
│   ├── impact-maps/      # Phase 1 outputs
│   ├── tasks/            # Phase 2 outputs
│   └── designs/          # Design docs (per CLAUDE.md)
├── CLAUDE.md
└── .cursorrules

~/.cursor/skills-cursor/  # Cursor built-in skills (read-only catalog for users)
```

---

*End of catalog.*
