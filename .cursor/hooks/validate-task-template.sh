#!/bin/bash
# Hook: validate-task-template
# Runs after file edits in docs/tasks/. Validates that tasks follow the template.

input=$(cat)
file=$(echo "$input" | jq -r '.filePath // empty')

if [ -z "$file" ] || [[ ! "$file" == docs/tasks/* ]]; then
  echo '{}'
  exit 0
fi

missing_sections=""

for section in "## Repository" "## Description" "## Files to Modify" "## Implementation Notes" "## Acceptance Criteria" "## Test Requirements"; do
  if ! grep -q "$section" "$file" 2>/dev/null; then
    missing_sections="$missing_sections $section,"
  fi
done

if [ -n "$missing_sections" ]; then
  echo "{
    \"additional_context\": \"WARNING: Task file $file is missing required sections:$missing_sections. See templates/task-template.md for the required format.\"
  }"
  exit 0
fi

echo '{}'
exit 0
