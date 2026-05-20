# Structured Task Template

## Repository
<!-- Single repository this task targets -->

## Jira Key
<!-- e.g., PROJ-1234 -->

## Description
<!-- One paragraph: what this task does and why -->

## Files to Modify
<!-- Real paths found during impact map analysis — NOT guesses -->
- `<path/to/file>` — <what changes>
- `<path/to/file>` — <what changes>

## Files to Create
<!-- New files needed, with rationale for location -->
- `<path/to/new/file>` — <purpose, why this location>

## Implementation Notes
<!-- Reference actual symbol names and existing patterns -->
Follow the existing pattern in `<ExistingFunction>()` at `<file-path>`.
Reuse the `<ExistingType>` type from `<file-path>`.

## Acceptance Criteria
- [ ] <Concrete, testable criterion>
- [ ] <Concrete, testable criterion>
- [ ] <Existing functionality still works (regression check)>

## Test Requirements
- [ ] Unit test in `<test-directory>` following existing test patterns
- [ ] Integration test covering <specific scenario>
- [ ] E2E test for <user-facing behavior> (if applicable)

## Dependencies
<!-- Other tasks that must complete before this one -->
- Depends on: <JIRA-KEY> (if any)
- Blocks: <JIRA-KEY> (if any)

## Out of Scope
<!-- Explicitly list what this task does NOT include -->
