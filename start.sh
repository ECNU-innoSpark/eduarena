#!/usr/bin/env bash

set -euo pipefail

NODE_VERSION="v22.11.0"

# Ensure the required Node.js version exists locally before switching to it.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1; then
  if ! nvm use "$NODE_VERSION" >/dev/null 2>&1; then
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION"
  else
    nvm use "$NODE_VERSION"
  fi
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

# Work around npm optional dependency installs that miss Rollup's platform binary.
resolve_rollup_native_package_spec() {
  node <<'EOF'
const path = require("node:path");
const { existsSync } = require("node:fs");
const { arch, platform, report } = require("node:process");

const rollupPackageJsonPath = path.join(process.cwd(), "node_modules", "rollup", "package.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(rollupPackageJsonPath)) {
  fail("Rollup is not installed. Run npm install first.");
}

const rollupPackage = require(rollupPackageJsonPath);

let reportHeader;
function getReportHeader() {
  try {
    reportHeader ??= report.getReport().header;
  } catch {
    reportHeader = null;
  }
  return reportHeader;
}

function isMusl() {
  const header = getReportHeader();
  return header ? !header.glibcVersionRuntime : false;
}

function isMingw32() {
  const header = getReportHeader();
  return header?.osName?.startsWith("MINGW32_NT") ?? false;
}

const bindingsByPlatformAndArch = {
  android: {
    arm: { base: "android-arm-eabi" },
    arm64: { base: "android-arm64" },
  },
  darwin: {
    arm64: { base: "darwin-arm64" },
    x64: { base: "darwin-x64" },
  },
  freebsd: {
    arm64: { base: "freebsd-arm64" },
    x64: { base: "freebsd-x64" },
  },
  linux: {
    arm: { base: "linux-arm-gnueabihf", musl: "linux-arm-musleabihf" },
    arm64: { base: "linux-arm64-gnu", musl: "linux-arm64-musl" },
    loong64: { base: "linux-loong64-gnu", musl: "linux-loong64-musl" },
    ppc64: { base: "linux-ppc64-gnu", musl: "linux-ppc64-musl" },
    riscv64: { base: "linux-riscv64-gnu", musl: "linux-riscv64-musl" },
    s390x: { base: "linux-s390x-gnu", musl: null },
    x64: { base: "linux-x64-gnu", musl: "linux-x64-musl" },
  },
  openbsd: {
    x64: { base: "openbsd-x64" },
  },
  openharmony: {
    arm64: { base: "openharmony-arm64" },
  },
  win32: {
    arm64: { base: "win32-arm64-msvc" },
    ia32: { base: "win32-ia32-msvc" },
    x64: { base: isMingw32() ? "win32-x64-gnu" : "win32-x64-msvc" },
  },
};

const binding = bindingsByPlatformAndArch[platform]?.[arch];
if (!binding) {
  fail(`Rollup does not support the current platform: ${platform}/${arch}`);
}

let packageBase = binding.base;
if ("musl" in binding && isMusl()) {
  if (!binding.musl) {
    fail(`Rollup does not support the current platform: ${platform}/${arch} (musl)`);
  }
  packageBase = binding.musl;
}

const packageName = `@rollup/rollup-${packageBase}`;
const version = rollupPackage.optionalDependencies?.[packageName] || rollupPackage.version;
process.stdout.write(`${packageName}@${version}`);
EOF
}

ensure_rollup_native_package() {
  local rollup_error
  local rollup_package_spec

  if node -e "require('rollup')" >/dev/null 2>&1; then
    return
  fi

  rollup_error="$(node -e "require('rollup')" 2>&1 >/dev/null || true)"
  if [[ "$rollup_error" != *"Cannot find module @rollup/rollup-"* ]]; then
    printf '%s\n' "$rollup_error" >&2
    return 1
  fi

  rollup_package_spec="$(resolve_rollup_native_package_spec)"
  echo "Installing missing Rollup native package: $rollup_package_spec"
  npm install --no-save --package-lock=false "$rollup_package_spec"
  node -e "require('rollup')" >/dev/null
}

ensure_rollup_native_package

API_PORT="$(find_available_api_port)"
export API_PORT

if [ "$API_PORT" != "5174" ]; then
  echo "API port 5174 is in use; using $API_PORT instead."
fi
#nvm use

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python)}"
"$PYTHON_BIN" api_server.py &
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
