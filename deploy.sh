#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8081}"
NODE_VERSION="${NODE_VERSION:-v22.11.0}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1; then
  if ! nvm use "$NODE_VERSION" >/dev/null 2>&1; then
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION" >/dev/null
  else
    nvm use "$NODE_VERSION" >/dev/null
  fi
fi

cd "$ROOT_DIR"

if [ ! -d node_modules ]; then
  npm install
fi

npm run build

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python)}"
exec env HOST="$HOST" PORT="$PORT" "$PYTHON_BIN" api_server.py
