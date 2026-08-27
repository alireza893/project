#!/usr/bin/env bash
#
# Keep only the newest few installers on the update server.
#
# Each release adds roughly 370 MB (a 124 MB .exe and a 246 MB .dmg), so an
# unpruned directory fills the droplet's disk. That would take the Telegram
# bot's Postgres down with it, not just updates, so this runs after every
# successful upload.
#
#   bash prune-old-releases.sh [keep] [win|mac|all]     # defaults: 3, all
#
# The macOS and Windows builds finish at different times, so each one prunes
# only its own directory. Pruning both from either job could drop a version
# the other platform had not uploaded yet.
#
# Versions are ordered by semver, not by file date, so a rebuild of an older
# version cannot make it look like the newest one.

set -euo pipefail

KEEP="${1:-${KEEP_RELEASES:-3}}"
TARGET="${2:-all}"
WEB_ROOT="${WEB_ROOT:-/var/www/updates}"

case "$TARGET" in
  win|mac|all) ;;
  *) echo "ERROR: target must be win, mac or all, got '$TARGET'" >&2; exit 1 ;;
esac

if ! [[ "$KEEP" =~ ^[0-9]+$ ]] || [ "$KEEP" -lt 1 ]; then
  echo "ERROR: keep count must be a positive integer, got '$KEEP'" >&2
  exit 1
fi

# Pull the version out of a filename: PishFaktor-Setup-1.2.3.exe -> 1.2.3
version_of() {
  local base
  base=$(basename "$1")
  [[ "$base" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]] && printf '%s' "${BASH_REMATCH[1]}"
}

prune_dir() {
  local dir="$1" ext="$2"
  [ -d "$dir" ] || return 0

  # Every version present, newest first. sort -V understands 1.10.0 > 1.9.0,
  # which a plain lexical sort gets wrong.
  local versions
  versions=$(
    find "$dir" -maxdepth 1 -type f -name "*.$ext" -print0 2>/dev/null |
      while IFS= read -r -d '' f; do
        v=$(version_of "$f")
        [ -n "$v" ] && printf '%s\n' "$v"
      done | sort -Vru
  )

  local total
  total=$(printf '%s' "$versions" | grep -c . || true)
  if [ "$total" -le "$KEEP" ]; then
    echo "  $ext: $total version(s), keeping all"
    return 0
  fi

  echo "  $ext: $total version(s), keeping the newest $KEEP"

  # Delete everything below the cutoff.
  local keep_list
  keep_list=$(printf '%s\n' "$versions" | head -n "$KEEP")

  # Delete by comparing each file's parsed version, never by globbing on the
  # version string: a glob for 1.0.1 also matches 1.0.10.
  while IFS= read -r -d '' f; do
    local v
    v=$(version_of "$f")
    [ -n "$v" ] || continue
    if ! printf '%s\n' "$keep_list" | grep -qxF "$v"; then
      rm -f -- "$f" && echo "    removed $(basename "$f")"
    fi
  done < <(find "$dir" -maxdepth 1 -type f -name "*.$ext" -print0 2>/dev/null)
}

echo "==> Pruning $WEB_ROOT/$TARGET (keeping $KEEP)"
if [ "$TARGET" = win ] || [ "$TARGET" = all ]; then
  prune_dir "$WEB_ROOT/win" exe
fi
if [ "$TARGET" = mac ] || [ "$TARGET" = all ]; then
  prune_dir "$WEB_ROOT/mac" dmg
fi

# The manifests name the current version and must survive pruning; they are
# excluded above, and are overwritten by each upload anyway.
echo "==> Disk usage"
du -sh "$WEB_ROOT"/* 2>/dev/null | sed 's|^|    |'
df -h "$WEB_ROOT" | tail -1 | awk '{print "    free: " $4 " of " $2 " (" $5 " used)"}'
