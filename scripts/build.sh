#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

LOCKFILE="pnpm-lock.yaml"
LOCKFILE_BAK="pnpm-lock.yaml.build.bak"
NPMRC=".npmrc"
NPMRC_BAK=".npmrc.build.bak"

if [ -f "$LOCKFILE" ]; then
    mv "$LOCKFILE" "$LOCKFILE_BAK"
    echo "[build] Renamed $LOCKFILE -> $LOCKFILE_BAK (bypass electron-builder pnpm resolver)"
fi

if [ -f "$NPMRC" ]; then
    mv "$NPMRC" "$NPMRC_BAK"
    echo "[build] Renamed $NPMRC -> $NPMRC_BAK (avoid npm warnings)"
fi

echo "[build] Running electron-builder..."
if [ $# -eq 0 ]; then
    npx electron-builder --linux AppImage --linux deb --linux rpm --linux pacman --linux dir
else
    npx electron-builder "$@"
fi
BUILD_EXIT=$?

if [ -f "$LOCKFILE_BAK" ]; then
    mv "$LOCKFILE_BAK" "$LOCKFILE"
    echo "[build] Restored $LOCKFILE"
fi

if [ -f "$NPMRC_BAK" ]; then
    mv "$NPMRC_BAK" "$NPMRC"
    echo "[build] Restored $NPMRC"
fi

exit $BUILD_EXIT
