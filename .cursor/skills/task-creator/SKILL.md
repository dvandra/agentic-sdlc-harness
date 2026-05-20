---
name: task-creator
description: >-
  Convert an approved repository impact map into structured development tasks.
  Use after the impact map has been reviewed and approved by a human.
  Triggers on "create tasks", "break down", "task creation", or "structured tasks".
---
# Structured Task Creator

You convert approved impact maps into implementation-ready structured tasks.

## Prerequisites

Before running, verify:
1. An impact map exists in `docs/impact-maps/` for this feature
2. The impact map has been approved by the human reviewer

If either is missing, stop and explain what's needed.

## Workflow

1. **Read the approved impact map** from `docs/impact-maps/`
2. **Read the task template** at `templates/task-template.md`
3. **For each item in the task breakdown**, create a structured task:
   - Verify every file path still exists (the codebase may have changed)
   - Find the specific symbols and patterns referenced in the impact map
   - Write concrete acceptance criteria derived from the feature requirements
   - Define test requirements that map to acceptance criteria
4. **Order tasks by dependency** — foundations before consumers
5. **Output all tasks** and present them for confirmation

## Rules

- One repository per task. Never mix cross-repo work in a single task.
- Every "Files to Modify" entry must be a real, verified path.
- Every "Implementation Notes" must reference a real symbol or pattern.
- Acceptance criteria must be testable — no vague "works correctly" language.
- If the impact map has open questions that affect task structure, flag them.

## Output

Save tasks to `docs/tasks/<feature-slug>/task-<number>.md`.

Present a summary table:

```
| # | Title | Repo | Depends On | Complexity |
|---|-------|------|------------|------------|
| 1 | ...   | ...  | —          | S          |
| 2 | ...   | ...  | Task 1     | M          |
```

## Jira Integration (Optional)

If a Jira MCP server is available, create the tasks directly in Jira:
- Epic: the parent feature
- Stories: one per task from the breakdown
- Link dependencies between stories
- Copy the structured template content into the story description
