#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
#
# Run the extension inside a headless GNOME Shell with
# gnome-shell-test-tool. This does not touch the user's real GNOME
# configuration: all XDG directories and GSettings use a temporary keyfile.
#
# Usage: make test-shell
#        ./scripts/test-shell.sh [path/to/extension.zip]

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ZIP=${1:-"$ROOT_DIR/deepseek-pricing.zip"}
TEST_SCRIPT="$ROOT_DIR/tests/shell/extension.js"

if [[ ! -f "$ZIP" ]]; then
  echo "Missing extension package: $ZIP" >&2
  echo "Run 'make pack' first." >&2
  exit 1
fi

for cmd in gnome-shell gnome-shell-test-tool dbus-run-session \
  glib-compile-schemas python3 base64; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

SHELL_VERSION=$(gnome-shell --version | awk '{print $3}')
SHELL_MAJOR=${SHELL_VERSION%%.*}
UUID=$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["uuid"])' \
  "$ROOT_DIR/metadata.json")

TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/deepseek-pricing-shell-test.XXXXXX")
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/bin" "$TMP_DIR/run" \
  "$TMP_DIR/config/glib-2.0/settings" \
  "$TMP_DIR/data/gnome-shell/extensions" \
  "$TMP_DIR/cache"
chmod 700 "$TMP_DIR/run"

# A valid background is required for GNOME Shell's startup animation. The
# default Debian/Ubuntu perf-background.xml references images that are not
# installed, which makes the headless shell wait forever.
printf '%s' \
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGUExURSIzRP///x1KNtwAAAABYktHRAH/Ai3eAAAAB3RJTUUH6gsDAC8db3RYDwAAAAxJREFUCNdjYCANAAAAMAABx6qFjgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0xMS0wM1QwMDo0NzoyOSswMDowMGCYGcsAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMTEtMDNUMDA6NDc6MjkrMDA6MDARxaF3AAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTExLTAzVDAwOjQ3OjI5KzAwOjAwRtCAqAAAAABJRU5ErkJggg==' \
  | base64 -d > "$TMP_DIR/background.png"

# gnome-shell-test-tool looks for its siblings next to its own path. The
# wrapper disables Xwayland: in a headless container PulseAudio can otherwise
# block while trying to connect to an X display that is not ready yet.
cp "$(command -v gnome-shell-test-tool)" "$TMP_DIR/bin/"
chmod +x "$TMP_DIR/bin/gnome-shell-test-tool"
GNOME_SHELL=$(command -v gnome-shell)
cat > "$TMP_DIR/bin/gnome-shell" <<EOF
#!/bin/sh
exec "$GNOME_SHELL" --no-x11 "\$@"
EOF
chmod +x "$TMP_DIR/bin/gnome-shell"

if command -v gnome-extensions >/dev/null 2>&1; then
  cp "$(command -v gnome-extensions)" "$TMP_DIR/bin/"
  chmod +x "$TMP_DIR/bin/gnome-extensions"
fi

ARGS=(--headless)
if (( SHELL_MAJOR >= 50 )); then
  ARGS+=(--extension "$ZIP")
else
  EXT_DIR="$TMP_DIR/data/gnome-shell/extensions/$UUID"
  mkdir -p "$EXT_DIR"
  python3 -m zipfile -e "$ZIP" "$EXT_DIR"
  glib-compile-schemas "$EXT_DIR/schemas"
  cat > "$TMP_DIR/config/glib-2.0/settings/keyfile" <<EOF
[org/gnome/shell]
enabled-extensions=['$UUID']
EOF
fi
ARGS+=("$TEST_SCRIPT")

echo "GNOME Shell $SHELL_VERSION; testing $UUID"
env -u DISPLAY -u WAYLAND_DISPLAY \
  XDG_RUNTIME_DIR="$TMP_DIR/run" \
  XDG_CONFIG_HOME="$TMP_DIR/config" \
  XDG_DATA_HOME="$TMP_DIR/data" \
  XDG_CACHE_HOME="$TMP_DIR/cache" \
  GSETTINGS_BACKEND=keyfile \
  SHELL_BACKGROUND_IMAGE="$TMP_DIR/background.png" \
  dbus-run-session -- "$TMP_DIR/bin/gnome-shell-test-tool" "${ARGS[@]}"
