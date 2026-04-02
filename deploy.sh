#!/usr/bin/env bash

git pull
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8081}"
NODE_VERSION="${NODE_VERSION:-v22.11.0}"

get_listening_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "$PORT"/tcp 2>/dev/null || true
    return
  fi
}

kill_processes_on_port() {
  local pids
  pids="$(get_listening_pids)"

  if [ -z "$pids" ]; then
    return
  fi

  echo "Port $PORT is in use; stopping process(es): $pids"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(get_listening_pids)"
  if [ -n "$pids" ]; then
    echo "Port $PORT is still in use; force stopping process(es): $pids"
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi

  if [ -n "$(get_listening_pids)" ]; then
    echo "Failed to free port $PORT." >&2
    exit 1
  fi
}

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
kill_processes_on_port
exec env HOST="$HOST" PORT="$PORT" "$PYTHON_BIN" api_server.py
