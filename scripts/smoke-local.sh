#!/usr/bin/env bash
set -euo pipefail

echo "[smoke] checking sensitive auth debug logs"
if grep -RIn "Google Response\|Payload to server\|Server Response\|Auth success" src; then
  echo "[smoke] ERROR: sensitive auth debug logs found"
  exit 1
fi

echo "[smoke] checking rejected console banner refs"
if grep -RIn "printMobrConsoleBanner\|consoleBanner\|MOBR_CONSOLE_BANNER" src; then
  echo "[smoke] ERROR: console banner refs found"
  exit 1
fi


echo "[smoke] checking ungated console log/dir"
ungated_console="$(
  find src \
    -path "src/lib" -prune -o \
    -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
    -print0 \
    | xargs -0 grep -nE "^[[:space:]]*console\.(log|dir)\(" || true
)"

if [ -n "$ungated_console" ]; then
  echo "$ungated_console"
  echo "[smoke] ERROR: found ungated console.log/dir outside src/lib"
  exit 1
fi

echo "[smoke] building frontend"
npm run build

echo "[smoke] frontend OK"
