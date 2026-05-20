#!/bin/bash
set -euo pipefail

# Setup script: copies the agentic SDLC harness into an MCO or MCOA repo checkout.
#
# Usage:
#   ./scripts/setup-repo.sh mco /path/to/multicluster-observability-operator
#   ./scripts/setup-repo.sh mcoa /path/to/multicluster-observability-addon

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_ROOT="$(dirname "$SCRIPT_DIR")"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <mco|mcoa> <path-to-repo-checkout>"
  echo ""
  echo "Examples:"
  echo "  $0 mco ~/code/multicluster-observability-operator"
  echo "  $0 mcoa ~/code/multicluster-observability-addon"
  exit 1
fi

REPO_TYPE="$1"
REPO_PATH="$2"

if [ ! -d "$REPO_PATH" ]; then
  echo "Error: $REPO_PATH does not exist"
  exit 1
fi

if [[ "$REPO_TYPE" != "mco" && "$REPO_TYPE" != "mcoa" ]]; then
  echo "Error: repo type must be 'mco' or 'mcoa'"
  exit 1
fi

SOURCE="$HARNESS_ROOT/repos/$REPO_TYPE"

echo "Setting up $REPO_TYPE harness in $REPO_PATH"
echo ""

# Copy CLAUDE.md (for Claude users)
if [ ! -f "$REPO_PATH/CLAUDE.md" ]; then
  cp "$SOURCE/CLAUDE.md" "$REPO_PATH/CLAUDE.md"
  echo "  + CLAUDE.md"
else
  echo "  ~ CLAUDE.md already exists (skipped)"
fi

# Copy AGENTS.md for MCOA (MCO already has one)
if [[ "$REPO_TYPE" == "mcoa" ]]; then
  if [ ! -f "$REPO_PATH/AGENTS.md" ]; then
    cp "$SOURCE/AGENTS.md" "$REPO_PATH/AGENTS.md"
    echo "  + AGENTS.md"
  else
    echo "  ~ AGENTS.md already exists (skipped)"
  fi
fi

# Copy .cursor/skills/
mkdir -p "$REPO_PATH/.cursor/skills"
for skill_dir in "$SOURCE/.cursor/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  if [ ! -d "$REPO_PATH/.cursor/skills/$skill_name" ]; then
    cp -r "$skill_dir" "$REPO_PATH/.cursor/skills/$skill_name"
    echo "  + .cursor/skills/$skill_name/"
  else
    echo "  ~ .cursor/skills/$skill_name/ already exists (skipped)"
  fi
done

# Copy .cursor/hooks
mkdir -p "$REPO_PATH/.cursor/hooks"
if [ ! -f "$REPO_PATH/.cursor/hooks.json" ]; then
  cp "$SOURCE/.cursor/hooks.json" "$REPO_PATH/.cursor/hooks.json"
  echo "  + .cursor/hooks.json"
fi
for hook in "$SOURCE/.cursor/hooks"/*; do
  hook_name=$(basename "$hook")
  if [ ! -f "$REPO_PATH/.cursor/hooks/$hook_name" ]; then
    cp "$hook" "$REPO_PATH/.cursor/hooks/$hook_name"
    chmod +x "$REPO_PATH/.cursor/hooks/$hook_name"
    echo "  + .cursor/hooks/$hook_name"
  fi
done

# Copy templates
mkdir -p "$REPO_PATH/templates"
for tmpl in "$SOURCE/templates"/*; do
  tmpl_name=$(basename "$tmpl")
  if [ ! -f "$REPO_PATH/templates/$tmpl_name" ]; then
    cp "$tmpl" "$REPO_PATH/templates/$tmpl_name"
    echo "  + templates/$tmpl_name"
  fi
done

# Create docs directories
mkdir -p "$REPO_PATH/docs/impact-maps" "$REPO_PATH/docs/tasks" "$REPO_PATH/docs/designs"
echo "  + docs/{impact-maps,tasks,designs}/"

echo ""
echo "Done! Harness installed for $REPO_TYPE."
echo ""
echo "Next steps:"
echo "  1. Open $REPO_PATH in Cursor"
echo "  2. Tell the agent: @impact-map <your feature description>"
echo "  3. Review the impact map, then: @task-creator approved"
echo "  4. For each task: @developer implement task N"
echo ""
echo "Or with Claude: the CLAUDE.md file guides the workflow automatically."
