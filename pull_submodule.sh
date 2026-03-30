#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./pull_submodule.sh [--dry-run] [submodule-path ...]

Sync nested git repositories to the exact gitlink commit recorded by the parent
repository. Missing repositories are cloned when a URL is known.
EOF
}

normalize_path() {
  local raw="${1%/}"

  if [ -z "$raw" ] || [ "$raw" = "." ]; then
    echo "Invalid path: '$1'" >&2
    return 1
  fi

  case "$raw" in
    "$ROOT_DIR"/*)
      printf '%s\n' "${raw#"$ROOT_DIR"/}"
      ;;
    /*)
      echo "Path is outside repository root: $raw" >&2
      return 1
      ;;
    ./*)
      printf '%s\n' "${raw#./}"
      ;;
    *)
      printf '%s\n' "$raw"
      ;;
  esac
}

known_url_for_path() {
  case "$1" in
    data/qualitative/messages_v2)
      printf '%s\n' 'git@github.com:LikeSwim/message_data.git'
      ;;
    data/qualitative/messages_v3)
      printf '%s\n' 'git@github.com:LikeSwim/message_data.git'
      ;;
    data/qualitative/new_message_data)
      printf '%s\n' 'git@github.com:LikeSwim/new_message_data.git'
      ;;
    *)
      return 1
      ;;
  esac
}

list_gitlinks() {
  git -C "$ROOT_DIR" ls-files --stage | awk '$1 == "160000" { print $4 }'
}

is_git_repo() {
  git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

parent_gitlink_sha() {
  git -C "$ROOT_DIR" ls-files --stage -- "$1" | awk '$1 == "160000" { print $2; exit }'
}

resolve_remote_url() {
  local rel_path="$1"
  local abs_path="$2"
  local url=""

  if [ -f "$ROOT_DIR/.gitmodules" ]; then
    url="$(git config -f "$ROOT_DIR/.gitmodules" --get "submodule.$rel_path.url" 2>/dev/null || true)"
  fi

  if [ -z "$url" ] && is_git_repo "$abs_path"; then
    url="$(git -C "$abs_path" remote get-url origin 2>/dev/null || true)"
  fi

  if [ -z "$url" ]; then
    url="$(known_url_for_path "$rel_path" 2>/dev/null || true)"
  fi

  printf '%s\n' "$url"
}

tracked_changes() {
  git -C "$1" status --porcelain=v1 --untracked-files=no
}

untracked_changes() {
  git -C "$1" ls-files --others --exclude-standard
}

TARGETS=()

add_target() {
  local rel_path="$1"
  local existing=""

  for existing in "${TARGETS[@]}"; do
    if [ "$existing" = "$rel_path" ]; then
      return 0
    fi
  done

  TARGETS+=("$rel_path")
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      add_target "$(normalize_path "$1")"
      ;;
  esac
  shift
done

while [ "$#" -gt 0 ]; do
  add_target "$(normalize_path "$1")"
  shift
done

if [ "${#TARGETS[@]}" -eq 0 ]; then
  while IFS= read -r rel_path; do
    [ -n "$rel_path" ] && add_target "$rel_path"
  done < <(list_gitlinks)
fi

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "No gitlink paths found."
  exit 0
fi

processed=0
failures=0

for rel_path in "${TARGETS[@]}"; do
  abs_path="$ROOT_DIR/$rel_path"
  expected_sha="$(parent_gitlink_sha "$rel_path")"

  echo "== $rel_path =="

  if [ -z "$expected_sha" ]; then
    echo "  - parent repo does not track this path as a gitlink"
    failures=$((failures + 1))
    continue
  fi

  remote_url="$(resolve_remote_url "$rel_path" "$abs_path")"
  if [ ! -e "$abs_path" ]; then
    if [ -z "$remote_url" ]; then
      echo "  - missing directory and no remote URL is known"
      failures=$((failures + 1))
      continue
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
      echo "  - would clone $remote_url"
    else
      mkdir -p "$(dirname "$abs_path")"
      if ! git clone "$remote_url" "$abs_path"; then
        echo "  - clone failed"
        failures=$((failures + 1))
        continue
      fi
      echo "  - cloned from $remote_url"
    fi
  elif ! is_git_repo "$abs_path"; then
    echo "  - path exists but is not a git repository"
    failures=$((failures + 1))
    continue
  fi

  if [ "$DRY_RUN" -eq 0 ] && ! git -C "$abs_path" remote get-url origin >/dev/null 2>&1 && [ -n "$remote_url" ]; then
    git -C "$abs_path" remote add origin "$remote_url"
    echo "  - added origin -> $remote_url"
  fi

  if is_git_repo "$abs_path"; then
    tracked_status="$(tracked_changes "$abs_path")"
    if [ -n "$tracked_status" ]; then
      echo "  - tracked changes present; commit or stash before checkout"
      failures=$((failures + 1))
      continue
    fi

    untracked_status="$(untracked_changes "$abs_path" || true)"
    if [ -n "$untracked_status" ]; then
      untracked_count="$(printf '%s\n' "$untracked_status" | wc -l | awk '{print $1}')"
      echo "  - warning: ignoring $untracked_count untracked file(s)"
    fi
  fi

  current_sha=""
  if is_git_repo "$abs_path"; then
    current_sha="$(git -C "$abs_path" rev-parse HEAD 2>/dev/null || true)"
  fi

  if [ "$current_sha" = "$expected_sha" ]; then
    echo "  - already at $expected_sha"
    processed=$((processed + 1))
    continue
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    if [ -n "$remote_url" ]; then
      echo "  - would fetch origin"
    fi
    echo "  - would checkout $expected_sha"
    processed=$((processed + 1))
    continue
  fi

  if [ -n "$remote_url" ]; then
    if ! git -C "$abs_path" fetch --tags origin; then
      echo "  - fetch failed"
      failures=$((failures + 1))
      continue
    fi
    echo "  - fetched origin"
  fi

  if ! git -C "$abs_path" cat-file -e "${expected_sha}^{commit}" 2>/dev/null; then
    echo "  - expected commit $expected_sha is not available locally after fetch"
    failures=$((failures + 1))
    continue
  fi

  if ! git -C "$abs_path" checkout --detach "$expected_sha"; then
    echo "  - checkout failed"
    failures=$((failures + 1))
    continue
  fi

  echo "  - checked out $expected_sha"
  processed=$((processed + 1))
done

echo
echo "Processed: $processed"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Mode: dry-run"
fi

if [ "$failures" -gt 0 ]; then
  echo "Failures: $failures" >&2
  exit 1
fi
