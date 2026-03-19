#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

node server.js &
SERVER_PID=$!

npm run dev -- "$@" &
VITE_PID=$!

shutting_down=0

cleanup() {
  if [ "$shutting_down" -eq 1 ]; then
    return
  fi
  shutting_down=1

  kill "$VITE_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait "$VITE_PID"
