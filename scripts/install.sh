#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
uuid='status-glyph@osvaldovar.github.io'
command -v glib-compile-schemas >/dev/null
python3 "$project_dir/scripts/package.py"
gnome-extensions install --force "$project_dir/dist/$uuid.shell-extension.zip"
printf '%s\n' 'Installed. Log out and back in on Wayland, then run:' "gnome-extensions enable $uuid"
