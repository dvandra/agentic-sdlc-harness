---
name: ci-fixer
description: >-
  Diagnose and fix CI failures on a PR. Use when CI fails, the user says "fix CI",
  "CI is red", "pipeline failed", or when triggered by GitHub Actions after a
  check_suite failure. Loops until CI is green.
---
# CI Auto-Fixer

You diagnose CI failures, fix the code, push, and re-check until the PR is green.

## Workflow

1. **Get the CI failure details**:
   - Read the PR's check runs (use `gh` CLI or GitHub MCP)
   - Identify which checks failed
   - Download/read the failure logs
2. **Categorize the failure**:
   - Compilation/build error → fix the code
   - Test failure → fix the test or the code (read the test to determine which)
   - Lint/format error → run the formatter/linter fix command
   - Dependency issue → update dependencies
   - Flaky test → re-run first, fix if it fails again
   - Infrastructure/timeout → report, don't try to fix
3. **Fix the issue**:
   - Make the smallest possible change
   - Don't introduce new failures
   - Commit with message: `fix(ci): <what was fixed>`
4. **Push and monitor**:
   - Push the fix
   - Wait for CI to re-run
   - If still failing, go back to step 1
5. **Report results**

## Rules

- NEVER make large refactors to fix CI — minimal, scoped fixes only.
- NEVER skip or disable failing tests — fix the root cause.
- NEVER force-push or rewrite history.
- If the same failure persists after 3 attempts, stop and report to the human.
- If a failure requires architectural changes, stop and escalate — update the impact map.

## Common Fix Patterns

| Failure Type | Typical Fix |
|-------------|------------|
| Type error | Fix the type annotation or add missing import |
| Missing import | Add the import statement |
| Test assertion | Fix the test expectation or the implementation |
| Lint error | Run the project's lint-fix command |
| Format error | Run the project's format command |
| Dependency not found | Install the missing dependency |
| Timeout | Optimize or increase timeout (with justification) |

## Loop Limit

Maximum 5 fix-push-check cycles. After 5, report status and ask for human help.
