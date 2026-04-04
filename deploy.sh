#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_HOSTNAME="$(hostname 2>/dev/null || echo unknown)"
DEFAULT_PORT="8081"

if [ -z "${PORT:-}" ] && [ "$DEPLOY_HOSTNAME" = "cpu3" ]; then
  DEFAULT_PORT="80"
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-$DEFAULT_PORT}"
NODE_VERSION="${NODE_VERSION:-v22.11.0}"
DEPLOY_TRACE="${DEPLOY_TRACE:-0}"
DEPLOY_GIT_PULL_MODE="${DEPLOY_GIT_PULL_MODE:-auto}"
USE_SUDO=0

if [ "$DEPLOY_TRACE" = "1" ]; then
  set -x
fi

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*"
}

warn() {
  printf '[%s] WARN: %s\n' "$(timestamp)" "$*" >&2
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    warn "Required command not found: $command_name"
    exit 1
  fi
}

is_valid_port() {
  case "$1" in
    ''|*[!0-9]*)
      return 1
      ;;
  esac

  [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

port_requires_root() {
  is_valid_port "$1" && [ "$1" -lt 1024 ]
}

maybe_with_sudo() {
  if [ "$USE_SUDO" = "1" ]; then
    sudo "$@"
    return
  fi

  "$@"
}

init_port_access() {
  USE_SUDO=0

  if ! is_valid_port "$PORT"; then
    warn "Invalid PORT: $PORT (expected a number between 1 and 65535)"
    exit 1
  fi

  if port_requires_root "$PORT" && [ "$(id -u)" -ne 0 ]; then
    require_command sudo
    USE_SUDO=1
    log "Port $PORT requires elevated privileges; acquiring sudo access"
    sudo -v
  fi
}

should_run_git_pull() {
  case "$DEPLOY_GIT_PULL_MODE" in
    always)
      return 0
      ;;
    never)
      return 1
      ;;
    auto)
      if [ "$(uname -s 2>/dev/null || echo unknown)" = "Linux" ]; then
        return 1
      fi
      return 0
      ;;
    *)
      warn "Invalid DEPLOY_GIT_PULL_MODE: $DEPLOY_GIT_PULL_MODE (expected: auto, always, never)"
      exit 1
      ;;
  esac
}

update_repository() {
  if ! should_run_git_pull; then
    log "Skipping repository update (DEPLOY_GIT_PULL_MODE=$DEPLOY_GIT_PULL_MODE)"
    return
  fi

  require_command git

  if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    warn "Skipping repository update because $ROOT_DIR is not a Git work tree"
    return
  fi

  log "Updating repository"
  git pull --ff-only
}

print_system_context() {
  log "Deployment context"
  printf '  root_dir: %s\n' "$ROOT_DIR"
  printf '  host: %s\n' "$HOST"
  printf '  port: %s\n' "$PORT"
  printf '  sudo_for_port: %s\n' "$([ "$USE_SUDO" = "1" ] && echo yes || echo no)"
  printf '  requested_node: %s\n' "$NODE_VERSION"
  printf '  user: %s\n' "$(id -un 2>/dev/null || echo unknown)"
  printf '  pwd: %s\n' "$(pwd)"

  printf '  hostname: %s\n' "$DEPLOY_HOSTNAME"

  if command -v uname >/dev/null 2>&1; then
    printf '  uname: %s\n' "$(uname -a)"
  fi

  if [ -r /etc/os-release ]; then
    printf '  os: %s\n' "$(awk -F= '/^PRETTY_NAME=/{gsub(/"/, "", $2); print $2}' /etc/os-release)"
  fi

  if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf '  git_branch: %s\n' "$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
    printf '  git_commit: %s\n' "$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
  fi
}

print_runtime_versions() {
  log "Runtime versions"

  if command -v git >/dev/null 2>&1; then
    printf '  %s\n' "$(git --version)"
  fi

  if command -v node >/dev/null 2>&1; then
    printf '  node: %s\n' "$(node -v)"
  fi

  if command -v npm >/dev/null 2>&1; then
    printf '  npm: %s\n' "$(npm -v)"
  fi

  if [ -n "${PYTHON_BIN:-}" ] && [ -x "${PYTHON_BIN:-}" ]; then
    printf '  python: %s\n' "$("$PYTHON_BIN" --version 2>&1)"
  fi
}

get_listening_pids() {
  if command -v lsof >/dev/null 2>&1; then
    maybe_with_sudo lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    maybe_with_sudo fuser "$PORT"/tcp 2>/dev/null || true
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
  maybe_with_sudo kill $pids 2>/dev/null || true
  sleep 1

  pids="$(get_listening_pids)"
  if [ -n "$pids" ]; then
    echo "Port $PORT is still in use; force stopping process(es): $pids"
    maybe_with_sudo kill -9 $pids 2>/dev/null || true
    sleep 1
  fi

  if [ -n "$(get_listening_pids)" ]; then
    echo "Failed to free port $PORT." >&2
    exit 1
  fi
}

print_port_debug() {
  local pids

  pids="$(get_listening_pids)"
  if [ -z "$pids" ]; then
    log "Port $PORT is currently free"
    return
  fi

  warn "Port $PORT is occupied by: $pids"

  if command -v lsof >/dev/null 2>&1; then
    maybe_with_sudo lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
  fi

  if command -v ss >/dev/null 2>&1; then
    maybe_with_sudo ss -ltnp "( sport = :$PORT )" 2>/dev/null || true
  fi
}

print_dist_debug() {
  if [ ! -d "$ROOT_DIR/dist" ]; then
    warn "dist directory does not exist yet"
    return
  fi

  log "dist directory summary"
  ls -lah "$ROOT_DIR/dist" || true
}

print_linux_resource_debug() {
  if command -v df >/dev/null 2>&1; then
    log "Filesystem usage"
    df -h "$ROOT_DIR" || true
  fi

  if command -v free >/dev/null 2>&1; then
    log "Memory usage"
    free -h || true
  fi
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  local failed_command="$3"

  trap - ERR
  set +e

  warn "Deployment failed"
  printf '  exit_code: %s\n' "$exit_code" >&2
  printf '  line: %s\n' "$line_no" >&2
  printf '  command: %s\n' "$failed_command" >&2

  print_system_context >&2
  print_runtime_versions >&2
  print_port_debug >&2
  print_dist_debug >&2
  print_linux_resource_debug >&2

  exit "$exit_code"
}

trap 'on_error $? $LINENO "$BASH_COMMAND"' ERR

cd "$ROOT_DIR"
update_repository
init_port_access

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1; then
  log "Activating Node.js $NODE_VERSION via nvm"
  if ! nvm use "$NODE_VERSION" >/dev/null 2>&1; then
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION" >/dev/null
  else
    nvm use "$NODE_VERSION" >/dev/null
  fi
else
  warn "nvm is not available; using the system Node.js runtime"
fi

cd "$ROOT_DIR"
require_command npm
print_system_context
print_runtime_versions

if [ ! -d node_modules ]; then
  log "Installing npm dependencies"
  npm install
fi

log "Building frontend assets"
npm run build
print_dist_debug

PYTHON_BIN="${PYTHON_BIN:-}"
if [ -z "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python3 || true)"
fi
if [ -z "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python || true)"
fi
if [ -z "$PYTHON_BIN" ]; then
  warn "Python is required but neither python3 nor python was found"
  exit 1
fi

print_runtime_versions
print_port_debug
log "Stopping any process currently listening on port $PORT"
kill_processes_on_port
log "Starting API server at http://$HOST:$PORT/"
if [ "$USE_SUDO" = "1" ]; then
  exec sudo env HOST="$HOST" PORT="$PORT" "$PYTHON_BIN" api_server.py
fi

exec env HOST="$HOST" PORT="$PORT" "$PYTHON_BIN" api_server.py
