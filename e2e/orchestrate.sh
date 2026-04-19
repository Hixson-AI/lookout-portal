#!/usr/bin/env bash
# rubric-orchestrate.sh — parallel sub-agent improvement loop
#
# Usage:
#   bash e2e/orchestrate.sh                  # full cycle: plan → implement → rebuild → full rubric
#   bash e2e/orchestrate.sh --light          # implement only lowest 3 dims, run only those dims in rubric
#   bash e2e/orchestrate.sh --dim D5         # implement + grade only one specific dim
#   bash e2e/orchestrate.sh --grade-only     # skip implement, just rebuild + run full rubric
#   bash e2e/orchestrate.sh --tsc-only       # just run tsc + lint check

set -euo pipefail

# ── Arg parsing —————————————————————————————————
MODE="full"        # full | light | dim | grade-only | tsc-only
TARGET_DIM=""      # set when MODE=dim
SKIP_IMPLEMENT=false

for arg in "$@"; do
  case "$arg" in
    --light)      MODE="light" ;;
    --grade-only) MODE="grade-only"; SKIP_IMPLEMENT=true ;;
    --tsc-only)   MODE="tsc-only" ;;
    --dim)        MODE="dim" ;;  # next arg is the dim
    D[0-9]|D10)  TARGET_DIM="$arg" ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

if [ "$MODE" = "dim" ] && [ -z "$TARGET_DIM" ]; then
  echo "Usage: --dim D5"; exit 1
fi

PORTAL_DIR="$(cd "$(dirname "$0")/.." > /dev/null 2>&1 && pwd)"
LOCAL_DIR="/home/garrett/repos/work/hixson-ai/lookout-local"
HISTORY="$PORTAL_DIR/e2e/rubric-history.json"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$PORTAL_DIR/e2e/runs/$RUN_ID"
LOG_DIR="$RUN_DIR"
mkdir -p "$RUN_DIR"
# Keep .agent-logs pointing to latest run for convenience
ln -sfn "$RUN_DIR" "$PORTAL_DIR/e2e/.agent-logs"
# Source env so OPENROUTER_E2E_KEY is available
set +u
# shellcheck disable=SC1091
source "$(dirname "$0")/../.env.e2e" 2>/dev/null || true
export OPENROUTER_E2E_KEY="${OPENROUTER_E2E_KEY:-}"
export OPENROUTER_API_KEY="${OPENROUTER_E2E_KEY:-${OPENROUTER_API_KEY:-}}"
set -u

KILO="kilo"
AGENTS_FILE="$PORTAL_DIR/e2e/agents.json"
# Planner + security models (not per-dim, not in agents.json)
PLANNER_MODEL="openrouter/anthropic/claude-sonnet-4.6"
SECURITY_MODEL="openrouter/anthropic/claude-sonnet-4.6"

# Read model for a dim from agents.json (fallback to kimi)
impl_model_for_dim() {
  node -e "
    const a = require('$AGENTS_FILE');
    process.stdout.write(a['$1']?.model ?? 'openrouter/moonshotai/kimi-k2');
  "
}

# Read prompt for a dim from agents.json
prompt_body_for_dim() {
  node -e "
    const a = require('$AGENTS_FILE');
    process.stdout.write(a['$1']?.prompt ?? 'Fix dimension $1 in $PORTAL_DIR.');
  "
}

# Legacy MODELS array kept for index fallback
MODELS=("openrouter/moonshotai/kimi-k2" "openrouter/minimax/minimax-m2.5" "openrouter/google/gemini-2.5-pro")
mkdir -p "$LOG_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Rubric Orchestrator — Parallel Sub-Agents   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Find 3 lowest-scoring dims from last run ──────────────────
LOWEST_JSON=$(node -e "
const h = require('$HISTORY');
const last = h.runs[h.runs.length - 1].scores;
const dims = Object.entries(last)
  .filter(([k,v]) => k !== 'composite' && typeof v === 'number')
  .sort((a,b) => a[1] - b[1])
  .slice(0, 3);
console.log(JSON.stringify(dims));
")

echo "📉 Last round scores (lowest 3):"
echo "$LOWEST_JSON" | node -e "
const dims = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
dims.forEach(([k,v]) => console.log('   ' + k + ': ' + v + '/10'));
"
echo ""

# Files that agents must NEVER modify (scope boundary)
PROTECTED_FILES="package.json pnpm-lock.yaml Dockerfile .github/ src/App.tsx src/lib/api/index.ts src/lib/types.ts playwright.config.ts"

# Scope preamble injected into every agent prompt
SCOPE_PREAMBLE="RULES (follow exactly):
1. Only modify files explicitly listed in this prompt.
2. NEVER touch: $PROTECTED_FILES
3. NEVER install packages or change package.json / pnpm-lock.yaml.
4. Keep every changed file under 300 lines — split if needed.
5. All props passed to components with useEffect must use useCallback/useMemo.
6. Run tsc mentally before finishing — no type errors allowed.
7. Make the smallest possible change. Do not refactor unrelated code.
8. NEVER change 'md:grid-cols-12', 'md:col-span-3', 'md:col-span-5', or 'md:col-span-4' to 'lg:' variants in AppBuilder.tsx — the D8 test runs at 900px where lg: breakpoints break pointer-event handling."

# ── Dim-specific prompts (read from agents.json) ─────────────────────
prompt_for_dim() {
  local dim="$1"
  local body
  body=$(prompt_body_for_dim "$dim")
  echo "$SCOPE_PREAMBLE

$body"
}

# ── Baseline tsc check — fail fast if codebase already broken ─────────
echo "🔧 Baseline tsc check (pre-agent)..."
cd "$PORTAL_DIR"
TSC_BASELINE=$(npx tsc --noEmit 2>&1 | tee "$RUN_DIR/tsc-before.log" | grep -c 'error TS' || true)
if [ "$TSC_BASELINE" -gt 0 ]; then
  echo "❌ $TSC_BASELINE tsc errors BEFORE agents — fix first: cat e2e/runs/$RUN_ID/tsc-before.log"
  exit 1
fi
echo "   ✅ tsc clean (before)"
echo ""
[ "$MODE" = "tsc-only" ] && echo "Done." && exit 0

if [ "$SKIP_IMPLEMENT" = "false" ]; then

# ── Step 1.5: Eval/Plan phase — sonnet-4.6 thinking ─────────────────
echo "🧠 Running eval/plan phase with $PLANNER_MODEL..."
HISTORY_SUMMARY=$(node -e "
const h = require('$HISTORY');
const runs = h.runs.slice(-4); // last 4 rounds
const dims = ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'];
const table = dims.map(d => {
  const vals = runs.map(r => r.scores[d] ?? '?').join(' → ');
  return d + ': ' + vals;
}).join('\n');
console.log('Score trends (last 4 rounds):\n' + table);
")

EVAL_PROMPT="You are a senior product engineer doing a root cause analysis for a workflow builder UI.

$HISTORY_SUMMARY

The 3 dimensions being fixed this round are: $(echo $LOWEST_JSON | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.map(([k,v])=>k+' ('+v+'/10)').join(', '))")

The codebase is at $PORTAL_DIR. Key files:
- src/pages/AppBuilder.tsx — main page, state management, secrets panel, autosave
- src/components/workflow/FlowCanvas.tsx — React Flow canvas, node rendering
- src/components/workflow/StepConfigPanel.tsx — per-step config forms
- src/components/workflow/DataMappingPanel.tsx — data mapping UI

For each of the 3 dimensions, provide:
1. The REAL root cause (not the symptom)
2. The EXACT file(s) and line ranges to change
3. The minimal code change needed
4. What NOT to change to avoid regressions

Be specific about file paths and function names. Think deeply before answering."

PLAN_FILE="$LOG_DIR/eval-plan.md"
echo "   Writing plan to $PLAN_FILE..."
cd "$PORTAL_DIR"
printf '%s' "$EVAL_PROMPT" > "$LOG_DIR/eval-prompt.txt"
cat "$LOG_DIR/eval-prompt.txt" | "$KILO" run --auto --model "$PLANNER_MODEL" > "$PLAN_FILE" 2>&1 || true

echo "   Plan complete. Summary:"
head -30 "$PLAN_FILE" 2>/dev/null || echo "   (plan unavailable)"
echo ""

# ── Step 2: Spawn one opencode agent per dim in parallel ──────────────
PIDS=()
DIMS=()
IDX=0

while IFS= read -r entry; do
  DIM=$(echo "$entry" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0])")
  SCORE=$(echo "$entry" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[1]))")
  DIMS+=("$DIM")
  PROMPT=$(prompt_for_dim "$DIM" "$SCORE")
  LOG="$LOG_DIR/${DIM}.log"
  MODEL=$(impl_model_for_dim "$DIM")
  IDX=$(( (IDX + 1) % ${#MODELS[@]} ))

  # Prepend the eval plan so the implementer has root-cause context
  PLAN_CONTEXT=""
  if [ -f "$PLAN_FILE" ]; then
    PLAN_CONTEXT="$(echo "--- EVAL PLAN (from senior analysis) ---"; grep -A 20 "$DIM" "$PLAN_FILE" 2>/dev/null | head -20; echo "---")"
  fi
  FULL_PROMPT="$PLAN_CONTEXT

$PROMPT"

  PROMPT_FILE="$LOG_DIR/${DIM}-prompt.txt"
  printf '%s' "$FULL_PROMPT" > "$PROMPT_FILE"

  DIFF_FILE="$RUN_DIR/${DIM}.patch"
  echo "🤖 [$MODEL] Spawning sub-agent for $DIM (score: $SCORE/10)..."
  (
    cd "$PORTAL_DIR"
    cat "$PROMPT_FILE" | "$KILO" run --auto --model "$MODEL" > "$LOG" 2>&1
    # Save full patch to runs/RUN_ID/DIM.patch
    git diff > "$DIFF_FILE" 2>/dev/null
    CHANGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    echo "" >> "$LOG"
    echo "=== FILES CHANGED ($CHANGED) ==" >> "$LOG"
    git diff --stat 2>/dev/null >> "$LOG"
    echo "✅ $DIM done — $CHANGED file(s) changed → $DIFF_FILE" >> "$LOG"
  ) &
  PIDS+=($!)
done < <(echo "$LOWEST_JSON" | node -e "
const dims = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
dims.forEach(([k,v]) => console.log(JSON.stringify([k,v])));
")

echo ""
echo "⏳ Waiting for ${#PIDS[@]} agents to finish..."
for PID in "${PIDS[@]}"; do
  wait "$PID" && echo "   PID $PID done ✓" || echo "   PID $PID failed ✗"
done

echo ""
echo "� Agent change summary:"
for DIM in "${DIMS[@]}"; do
  echo "   ── $DIM ──"
  # Show only files changed + last status line
  grep -A 50 '=== FILES CHANGED ==' "$LOG_DIR/${DIM}.log" 2>/dev/null | grep -v '=== ' | grep -v '^$' | head -10 || echo "   (no changes logged)"
  tail -1 "$LOG_DIR/${DIM}.log" 2>/dev/null
done

fi # end SKIP_IMPLEMENT

# ── Post-agent: check protected files weren't touched ────────────────
echo ""
echo "🔍 Checking scope compliance..."
cd "$PORTAL_DIR"
VIOLATIONS=$(git diff --name-only 2>/dev/null | grep -E '^(package\.json|pnpm-lock\.yaml|Dockerfile|src/App\.tsx|src/lib/api/index\.ts|src/lib/types\.ts|playwright\.config\.ts)$' || true)
if [ -n "$VIOLATIONS" ]; then
  echo "   ⚠️  Protected files modified by agents — reverting:"
  echo "$VIOLATIONS" | while read -r f; do echo "      $f"; git checkout HEAD -- "$f" 2>/dev/null || true; done
else
  echo "   ✅ No protected files touched"
fi

# ── Post-agent tsc gate — revert everything if broken ─────────────────
echo ""
echo "🔧 Post-agent tsc check..."
TSC_AFTER=$(npx tsc --noEmit 2>&1 | tee "$RUN_DIR/tsc-after.log" | grep -c 'error TS' || true)
if [ "$TSC_AFTER" -gt 0 ]; then
  echo "   ❌ $TSC_AFTER tsc errors introduced by agents — reverting src/ changes"
  git checkout HEAD -- src/ 2>/dev/null || true
  echo "   Reverted. See: cat e2e/runs/$RUN_ID/tsc-after.log"
else
  echo "   ✅ tsc clean (after agents)"
fi

# ── Security scan —————————————————————————————————
echo ""
echo "🔒 Running security scan on changed files..."
CHANGED_FILES=$(git diff --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' | head -20 | tr '\n' ' ' || true)
if [ -n "$CHANGED_FILES" ]; then
  SEC_LOG="$RUN_DIR/security.log"
  printf '%s' "Review these changed TypeScript files for security issues: $CHANGED_FILES

Check for: (1) hardcoded secrets or API keys, (2) missing auth checks on API calls, (3) XSS via dangerouslySetInnerHTML or unescaped user input, (4) sensitive data logged to console.
Report ONLY actual issues found, not theoretical ones. If none found, say PASS.
Minimal output." > "$LOG_DIR/security-prompt.txt"
  cat "$LOG_DIR/security-prompt.txt" | "$KILO" run --auto --model "$SECURITY_MODEL" > "$SEC_LOG" 2>&1 || true
  echo "   Result:"
  grep -v '^>' "$SEC_LOG" | grep -v '^→\|^←\|\.\.\.\|^$' | head -10 || echo "   PASS"
else
  echo "   No .ts/.tsx files changed — skipping."
fi

# ── File size audit (warn if >300 lines) ———————————————————————
echo ""
echo "📄 File size audit (warn if >300 lines):"
find "$PORTAL_DIR/src" \( -name '*.tsx' -o -name '*.ts' \) | while read -r f; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 300 ]; then
    echo "   ⚠️  $lines lines: ${f#$PORTAL_DIR/}"
  fi
done
echo ""

# ── Restore lockfile + package.json before rebuild (agents must not change these) ————
echo "   🔒 Restoring package.json + pnpm-lock.yaml to HEAD..."
cd "$PORTAL_DIR"
git checkout HEAD -- package.json pnpm-lock.yaml 2>/dev/null || true
echo ""

# ── Step 3: Rebuild portal —————————————————————————————————
echo ""
echo "🔨 Rebuilding portal..."
docker compose -f "$LOCAL_DIR/docker-compose.yml" up -d --build --no-deps --force-recreate lookout-portal 2>&1 | tail -4

echo ""
echo "⏳ Waiting 5s for container to stabilize..."
sleep 5

# ── Step 4: Run rubric (compartmental or full) ——————————————————
echo ""
cd "$PORTAL_DIR"

PLAYWRIGHT="$PORTAL_DIR/node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/node_modules/.bin/playwright"
E2E_ENV="OPENROUTER_E2E_KEY=${OPENROUTER_E2E_KEY:-} JWT_SECRET=${JWT_SECRET:-} E2E_TENANT_ID=${E2E_TENANT_ID:-}"
if [ "$MODE" = "dim" ] && [ -n "$TARGET_DIM" ]; then
  echo "📊 Running targeted rubric: $TARGET_DIM only..."
  env $E2E_ENV "$PLAYWRIGHT" test --project=chromium e2e/rubric.spec.ts --grep "$TARGET_DIM —" 2>&1 | tail -20 | cat
elif [ "$MODE" = "light" ]; then
  GREP_PATTERN=$(echo "$LOWEST_JSON" | node -e "
const dims = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(dims.map(([k]) => k + ' —').join('|'));
")
  echo "📊 Running light rubric (lowest dims only): $GREP_PATTERN"
  env $E2E_ENV "$PLAYWRIGHT" test --project=chromium e2e/rubric.spec.ts --grep "$GREP_PATTERN" 2>&1 | tail -30 | cat
else
  echo "📊 Running full rubric (all 11 dimensions)..."
  env $E2E_ENV "$PLAYWRIGHT" test --project=chromium e2e/rubric.spec.ts 2>&1 | grep -E "^(📊|🏆|   Score|✓|✘|📈|   D[0-9]|   Round|   Average)" | cat
fi

# ── Self-improvement: reflect + update agents.json ───────────────────
if [ "$MODE" != "grade-only" ] && [ "$MODE" != "tsc-only" ]; then
  echo ""
  echo "🪞 Running agent reflection..."
  node "$PORTAL_DIR/e2e/reflect.mjs" "$RUN_ID" 2>&1 || echo "   Reflection skipped (non-fatal)"
fi

echo ""
echo "✅ Orchestration cycle complete."
echo "   Run artifacts: e2e/runs/$RUN_ID/"
echo "   Patches:       $(ls "$RUN_DIR"/*.patch 2>/dev/null | wc -l | tr -d ' ') .patch files"
echo "   Trend data:    npx ts-node e2e/rubric-trend.ts"
echo "   Agent config:  e2e/agents.json"
