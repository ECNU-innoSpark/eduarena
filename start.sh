#!/usr/bin/env bash

set -euo pipefail

NODE_VERSION="v22.11.0"

# Ensure the required Node.js version exists locally before switching to it.
if ! nvm use "$NODE_VERSION" >/dev/null 2>&1; then
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
else
  nvm use "$NODE_VERSION"
fi


cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

find_available_api_port() {
  node <<'EOF'
const net = require("node:net");

const host = "127.0.0.1";
const startPort = Number(process.env.API_PORT || 5174);
const maxPort = startPort + 20;

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

(async () => {
  for (let port = startPort; port <= maxPort; port += 1) {
    if (await canListen(port)) {
      process.stdout.write(String(port));
      return;
    }
  }

  console.error(`No available API port found in range ${startPort}-${maxPort}.`);
  process.exit(1);
})();
EOF
}

API_PORT="$(find_available_api_port)"
export API_PORT

if [ "$API_PORT" != "5174" ]; then
  echo "API port 5174 is in use; using $API_PORT instead."
fi
#nvm use

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
