#!/bin/bash
# Hook: check-phase-gate
# Runs on agent stop. Checks if the agent just completed a phase that
# requires human review, and reminds it to pause.

input=$(cat)

# Check if the agent produced an impact map without pausing for review
if [ -d "docs/impact-maps" ]; then
  latest_map=$(ls -t docs/impact-maps/*.md 2>/dev/null | head -1)
  if [ -n "$latest_map" ]; then
    if ! grep -q "APPROVED" "$latest_map" 2>/dev/null; then
      echo '{
        "followup_message": "An impact map was created but has not been marked as approved. Please ask the human to review docs/impact-maps/ before proceeding to task creation. Do not create tasks or write code until the impact map is approved."
      }'
      exit 0
    fi
  fi
fi

echo '{}'
exit 0
