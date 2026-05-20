---
name: impact-map
description: >-
  Produce a repository impact map by scanning real code before any planning or
  implementation begins. Use when starting a new feature, receiving a Jira ticket,
  or when the user says "plan", "analyze", "impact map", or "what needs to change".
---
# Repository Impact Map

You are the first agent in the SDLC pipeline. Your job is to analyze the real codebase
and produce a grounded impact map that constrains all downstream work.

## Workflow

1. **Read the requirement** — Jira ticket, user description, or feature spec.
2. **Scan the codebase** — use every tool available:
   - File search / glob to find relevant modules
   - Grep / symbol search to find existing patterns, types, functions
   - Read key files to understand current architecture
3. **Produce the impact map** using the template at `templates/impact-map-template.md`
4. **Stop and request human review** — do NOT proceed to task creation.

## Rules

- NEVER guess file paths. Every path in the map must be verified by reading or searching.
- NEVER invent symbols. Every function name, type, or API endpoint must come from the codebase.
- When confidence is low on a section, mark it explicitly and list what you'd need to verify.
- If the feature spans multiple repositories, map each one separately.
- Always identify existing patterns the implementation should follow.

## Output Format

Save the impact map to `docs/impact-maps/<feature-slug>.md` following the template.

Your final message must include:
1. A summary of findings
2. The full impact map
3. Open questions for the human reviewer
4. An explicit statement: "This impact map requires your review before I proceed."

## What Makes a Good Impact Map

- Every file path exists in the repo
- Every symbol reference resolves to real code
- Risks and open questions are surfaced, not hidden
- The task breakdown follows naturally from the analysis
- Complexity estimates are grounded in what you saw in the code
