#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

echo "This script removes tracked rating snapshot files from the git index only."
echo "Working tree files under data/qualitative/message_ratings/ will be kept."

git rm --cached -- data/qualitative/message_ratings/*.json

echo "Done. Review with: git status --short"
