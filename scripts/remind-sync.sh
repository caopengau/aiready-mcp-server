#!/bin/bash
# Check if any spoke directories have changed in the last commit
CHANGED_SPOKES=$(git diff --name-only HEAD~1 HEAD | grep -E "^(packages/|landing/|clawmore/|serverlessclaw/|vscode-extension/|action-marketplace/)" | cut -d/ -f1-2 | sort -u)

if [ -n "$CHANGED_SPOKES" ]; then
  echo ""
  echo "⚠️  [AIReady] Spoke changes detected in last commit:"
  echo "$CHANGED_SPOKES" | sed 's/^/   - /'
  echo ""
  echo "👉 Remember to run: make sync"
  echo "   (This split-syncs changes to standalone repositories)"
  echo ""
fi
