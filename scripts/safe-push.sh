#!/usr/bin/env bash
# Safe push: always pull (rebase) before pushing. Never force-pushes.
# Usage: ./scripts/safe-push.sh
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "You have uncommitted changes. Commit (only your own folder) or stash them first."
  git status --short
  exit 1
fi

echo "Pulling latest from origin/${branch} (rebase)..."
if ! git pull --rebase origin "${branch}"; then
  echo ""
  echo "Rebase conflict. If the conflicting file is NOT in your folder, run:"
  echo "  git rebase --abort"
  echo "and post the problem in docs/requests.md. Do not edit another module's files."
  exit 1
fi

echo "Pushing to origin/${branch}..."
git push origin "${branch}"
echo "Done."
