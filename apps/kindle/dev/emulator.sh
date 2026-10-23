#!/usr/bin/env bash
# Runs the TechRat screens in the KOReader emulator (Linux, e.g. Ubuntu on WSL with WSLg) with sample data.
#
#   apps/kindle/dev/emulator.sh            open the window (TechRat's home with sample data)
#   apps/kindle/dev/emulator.sh shots DIR  save a PNG of every screen into DIR and quit
#
# It downloads KOReader once into ~/koreader-emu and installs the preview plugin in ~/.config/koreader/plugins with
# links to this checkout's files, so editing a file and running it again shows the change. The screen is the Kindle's
# 3:4 ratio in grayscale; KINDLE_W, KINDLE_H and KINDLE_DPI change it (1072x1448 at 300 is a Paperwhite 5, but a
# window that tall may not fit the screen).
set -euo pipefail

version="v2026.07.1"
kindle_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
emu="$HOME/koreader-emu"
plugin="$HOME/.config/koreader/plugins/techratpreview.koplugin"

mkdir -p "$emu"
if [ ! -x "$emu/squashfs-root/AppRun" ]; then
    curl -sL -m 600 -o "$emu/koreader.AppImage" "https://github.com/koreader/koreader/releases/download/$version/koreader-$version-x86_64.AppImage"
    chmod +x "$emu/koreader.AppImage"
    (cd "$emu" && ./koreader.AppImage --appimage-extract >/dev/null)
fi

rm -rf "$plugin"
mkdir -p "$plugin"
for f in "$kindle_dir"/dev/preview/*.lua; do ln -s "$f" "$plugin/"; done
for f in "$kindle_dir"/techrat.koplugin/techrat_*.lua; do ln -s "$f" "$plugin/"; done
ln -s "$kindle_dir/techrat.koplugin/logo.png" "$plugin/"
rm -f "$plugin/techrat_transport.lua" # the preview answers with sample data instead
ln -s "$kindle_dir/techrat.koplugin/main.lua" "$plugin/techrat_main.lua"

export EMULATE_READER_W="${KINDLE_W:-720}" EMULATE_READER_H="${KINDLE_H:-960}" EMULATE_READER_DPI="${KINDLE_DPI:-200}"
export EMULATE_BW_SCREEN=1
# WSLg serves the Wayland display from its own runtime folder, not the shell's /run/user/<uid>.
if [ -S /mnt/wslg/runtime-dir/wayland-0 ]; then export XDG_RUNTIME_DIR=/mnt/wslg/runtime-dir; fi
export TECHRAT_LANG="${TECHRAT_LANG:-pt_BR}"
if [ "${1:-}" = "shots" ]; then
    mkdir -p "$2"
    export TECHRAT_SHOTS="$(cd "$2" && pwd)"
fi
cd "$emu/squashfs-root" && exec ./AppRun
