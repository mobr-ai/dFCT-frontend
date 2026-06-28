#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

section() {
  echo
  echo "[smoke] $*"
}

fail() {
  echo "[smoke] ERROR: $*" >&2
  exit 1
}

npm_has_script() {
  node -e '
    const pkg = require("./package.json");
    const scripts = pkg.scripts || {};
    process.exit(Object.prototype.hasOwnProperty.call(scripts, process.argv[1]) ? 0 : 1);
  ' "$1"
}

run_npm_script_if_present() {
  local script="$1"

  if npm_has_script "$script"; then
    section "running npm run $script"
    npm run "$script"
  else
    echo "[smoke] skipping npm run $script (script not defined)"
  fi
}

section "checking required files and tools"
[ -f package.json ] || fail "package.json not found"
[ -d src ] || fail "src directory not found"
command -v node >/dev/null || fail "node is not installed"
command -v npm >/dev/null || fail "npm is not installed"

node - <<'NODE'
const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

if (!pkg.scripts || !pkg.scripts.build) {
  console.error("[smoke] Missing required npm script: build");
  process.exit(1);
}

console.log(`[smoke] package: ${pkg.name || "(unnamed)"}`);
NODE

section "checking sensitive auth debug logs"
if grep -RInE "Google Response|Payload to server|Server Response|Auth success" src \
  --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx'; then
  fail "sensitive auth debug logs found"
fi

section "checking obvious frontend secret leaks"
if grep -RInE "GOOGLE_CLIENT_SECRET|AWS_SECRET_ACCESS_KEY|JWT_SECRET|DATABASE_URL|CLOUDAMQP_URL|PRIVATE KEY|BEGIN RSA|VITE_[A-Z0-9_]*SECRET" src public \
  --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' --include='*.json' --include='*.html' 2>/dev/null; then
  fail "possible secret-like value/reference found in frontend/public files"
fi

section "checking rejected console banner refs"
if grep -RInE "printMobrConsoleBanner|consoleBanner|MOBR_CONSOLE_BANNER" src \
  --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx'; then
  fail "console banner refs found"
fi

section "checking ungated console.log/dir outside src/lib"
ungated_console="$(
  find src \
    -path "src/lib" -prune -o \
    -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
    -print0 \
    | xargs -0 -r grep -nE "^[[:space:]]*console\.(log|dir)\(" || true
)"

if [ -n "$ungated_console" ]; then
  echo "$ungated_console"
  fail "found ungated console.log/dir outside src/lib"
fi

section "checking legacy non-/api backend route usage"
legacy_routes="$(
  find src \
    -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
    -print0 \
    | xargs -0 -r grep -nE "['\"]/(fetch_url|process|process_evidence|check|sign_s3)([/?#'\"]|$)" || true
)"

if [ -n "$legacy_routes" ]; then
  echo "$legacy_routes"
  fail "legacy backend route usage found; use /api/... endpoints"
fi

section "checking accidental editor/artifact files"
artifacts="$(
  find . \
    -path './node_modules' -prune -o \
    -path './dist' -prune -o \
    -path './.git' -prune -o \
    \( -name '.DS_Store' -o -name '*.bak-*' -o -name '*.orig' -o -name '*.rej' -o -name '.comments' \) \
    -print
)"

if [ -n "$artifacts" ]; then
  echo "$artifacts"
  fail "accidental editor/artifact files found"
fi

section "checking i18n JSON and EN/PT key parity"
node - <<'NODE'
const fs = require("fs");

const enPath = "src/locales/en/translation.json";
const ptPath = "src/locales/pt/translation.json";

if (!fs.existsSync(enPath) && !fs.existsSync(ptPath)) {
  console.log("[smoke] no EN/PT translation files found; skipping i18n parity check");
  process.exit(0);
}

if (!fs.existsSync(enPath) || !fs.existsSync(ptPath)) {
  console.error(`[smoke] Missing translation file. Expected both ${enPath} and ${ptPath}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[smoke] Invalid JSON in ${path}: ${err.message}`);
    process.exit(1);
  }
}

function flatten(obj, prefix = "", out = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${key}` : key;
      flatten(value, next, out);
    }
  } else {
    out[prefix] = true;
  }

  return out;
}

const enKeys = Object.keys(flatten(readJson(enPath))).sort();
const ptKeys = Object.keys(flatten(readJson(ptPath))).sort();

const enSet = new Set(enKeys);
const ptSet = new Set(ptKeys);

const missingInPt = enKeys.filter((key) => !ptSet.has(key));
const missingInEn = ptKeys.filter((key) => !enSet.has(key));

if (missingInPt.length || missingInEn.length) {
  if (missingInPt.length) {
    console.error("[smoke] Keys missing in PT:");
    for (const key of missingInPt.slice(0, 80)) console.error(`  - ${key}`);
  }

  if (missingInEn.length) {
    console.error("[smoke] Keys missing in EN:");
    for (const key of missingInEn.slice(0, 80)) console.error(`  - ${key}`);
  }

  process.exit(1);
}

console.log(`[smoke] i18n keys OK (${enKeys.length} keys)`);
NODE

run_npm_script_if_present lint
run_npm_script_if_present typecheck

if npm_has_script test:ci; then
  run_npm_script_if_present test:ci
elif npm_has_script test:run; then
  run_npm_script_if_present test:run
else
  echo "[smoke] skipping tests; define test:ci or test:run to enable CI-safe frontend tests"
fi

if [ "${SMOKE_SKIP_AUDIT:-0}" != "1" ]; then
  section "checking production dependency audit"
  npm audit --omit=dev
else
  echo "[smoke] skipping npm audit because SMOKE_SKIP_AUDIT=1"
fi

section "building frontend"
npm run build

section "frontend OK"
