#!/usr/bin/env bash
# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# Run from the Iteration 47 repository root after overlaying the two drop-in folders.
set -uo pipefail
LOG="${1:-logistics-closure-test-run.log}"
: > "$LOG"
fail=0
run() {
  echo -e "\n===== $* =====" | tee -a "$LOG"
  "$@" >>"$LOG" 2>&1
  rc=$?
  echo "EXIT_CODE=$rc" | tee -a "$LOG"
  if [ "$rc" -ne 0 ]; then fail=1; fi
}
run node drop-in/logistics/test.mjs
run node drop-in/logistics/spine-integration.test.mjs
run bash -lc "cd additional-modules/supply-optimization && python -m unittest -v test_optimizer.py"
run node tools/conformance-test-iter47.mjs
run node tools/conformance-test.mjs
run node tools/regression-checklist.mjs
run node tools/mutation-report.mjs
run node tests/run.mjs
run node tests/acceptance.mjs --no-mutation --no-browser
# Full acceptance is attempted separately and its timeout is never counted as a pass.
echo -e "\n===== FULL ACCEPTANCE (timeout=${FULL_ACCEPTANCE_TIMEOUT:-240}s) =====" | tee -a "$LOG"
timeout "${FULL_ACCEPTANCE_TIMEOUT:-240}s" node tests/acceptance.mjs >>"$LOG" 2>&1
rc=$?
echo "EXIT_CODE=$rc (124 means timeout; inspect skipped/unverified stages)" | tee -a "$LOG"
if [ "$rc" -ne 0 ]; then fail=1; fi
if [ "$fail" -eq 0 ]; then echo "OVERALL=PASS" | tee -a "$LOG"; else echo "OVERALL=FAIL_OR_UNVERIFIED; inspect log" | tee -a "$LOG"; fi
exit "$fail"
