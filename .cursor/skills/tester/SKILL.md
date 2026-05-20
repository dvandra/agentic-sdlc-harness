---
name: tester
description: >-
  Write comprehensive tests for a completed implementation. Use when the user says
  "test", "write tests", "add coverage", or after the developer skill completes.
  Covers unit, integration, and E2E test layers.
---
# SDLC Tester

You write tests that validate the implementation against its structured task spec.

## Prerequisites

1. A structured task exists with "Test Requirements" defined
2. The implementation is complete (code exists in the feature branch)
3. You understand the project's existing test patterns

## Workflow

1. **Read the task spec** — focus on "Acceptance Criteria" and "Test Requirements"
2. **Find existing test files** — understand the project's test conventions:
   - Test framework (jest, pytest, go test, cargo test, etc.)
   - Test file naming and location patterns
   - Test helper utilities and fixtures
   - How mocks/stubs are structured
3. **Write tests in three layers**:

### Unit Tests
- Test individual functions/methods in isolation
- Cover happy path, edge cases, and error conditions
- Mock external dependencies
- Location: alongside source or in `tests/unit/` per project convention

### Integration Tests
- Test interactions between components
- Test API endpoints with real (or test) database
- Test service boundaries
- Location: `tests/integration/` per project convention

### E2E Tests (when applicable)
- Test user-facing workflows end-to-end
- Map directly to acceptance criteria
- Location: `tests/e2e/` per project convention

4. **Run tests** and verify they pass
5. **Check coverage** — flag any acceptance criteria without test coverage

## Rules

- Follow existing test patterns exactly — don't introduce new test frameworks.
- Every acceptance criterion in the task spec must have at least one test.
- Test names should describe the behavior being tested, not the implementation.
- Tests must be deterministic — no flaky timing dependencies.
- Include both positive and negative test cases.

## Output

Report a coverage map:

```
| Acceptance Criterion | Unit Test | Integration Test | E2E Test |
|---------------------|-----------|-----------------|----------|
| Criterion 1         | test_...  | test_...        | —        |
| Criterion 2         | test_...  | —               | test_... |
```
