#!/usr/bin/env bash
# ops/verify.sh: the repository's own gate. zops runs it before every push.
# © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI.
# Licensed under GPL-3.0-only.
#
# It refuses only on what a release needs: the repository's own suites, the site's
# parse and route check, a citation file and workflow that parse, agreement between the
# declared versions, no secrets, no oversized files, and, once sealed, a manifest that
# verifies. Everything it runs stays inside this folder.
set -euo pipefail
cd "$(dirname "$0")/.."
FAILED=0
run(){
  local name="$1"; shift; local out
  if out="$("$@" 2>&1)"; then printf '   ok    %s\n' "$name"
  else printf '   FAIL  %s\n' "$name"; printf '%s\n' "$out" | tail -8 | sed 's/^/         /'; FAILED=$((FAILED+1)); fi
}
yaml_ok(){
  python3 - "$1" <<'PY'
import re, sys
p = sys.argv[1]; text = open(p, encoding="utf-8").read()
try:
    import yaml
    yaml.safe_load(text)
except ImportError:
    first = next((l for l in text.splitlines() if l.strip() and not l.lstrip().startswith("#")), "")
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_-]*:", first):
        sys.exit(f"{p}: the first content line is not a YAML key: {first[:60]!r}")
PY
}
versions_agree(){
  python3 - <<'PY'
import json, re, sys
cff = re.search(r"(?m)^version:\s*['\"]?([^'\"\s]+)", open("CITATION.cff", encoding="utf-8").read())
meta = json.load(open("misty.json", encoding="utf-8")).get("version")
if not cff or cff.group(1) != meta:
    sys.exit(f"CITATION.cff version {cff.group(1) if cff else None} != misty.json version {meta}")
PY
}
no_secrets(){
  # The pypi prefix is split so this file never matches its own pattern. Documented example
  # keys (the AWS documentation key ending in EXAMPLE, used by two suites as a redaction
  # fixture) are not secrets and are reported as such, not refused.
  local pat hits
  pat='ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|pypi-AgEI''cHlwaS5vcmc'
  hits="$(grep -rIoE "$pat" --exclude-dir=.git --exclude-dir=.acceptance . | grep -vE ':AKIA[0-9A-Z]{9}EXAMPLE$' || true)"
  [ -z "$hits" ] || { printf '%s\n' "$hits"; return 1; }
}
no_oversized(){
  local big; big="$(find . -path ./.git -prune -o -type f -size +50M -print)"
  [ -z "$big" ] || { printf '%s\n' "$big"; return 1; }
}
manifest_ok(){ [ ! -f MANIFEST.sha256 ] || sha256sum --quiet -c MANIFEST.sha256; }

echo "verify: $(basename "$PWD")"
run "every conformance suite (tools/regression-checklist.mjs)" node tools/regression-checklist.mjs
run "architectural acceptance tests (tests/architectural.mjs)"  node tests/architectural.mjs
run "tests/bibo.mjs"                                             node tests/bibo.mjs
run "site parses and routes resolve (tools/prove-site-loads.mjs)" node tools/prove-site-loads.mjs
run "CITATION.cff parses"                                        yaml_ok CITATION.cff
run "Pages workflow parses"                                      yaml_ok .github/workflows/pages.yml
run "CITATION.cff and misty.json declare the same version"       versions_agree
run "no secrets"                                                 no_secrets
run "no file over 50 MB"                                         no_oversized
run "manifest verifies, when sealed"                             manifest_ok
if [ "$FAILED" -eq 0 ]; then echo "verify: PASS"; else echo "verify: $FAILED check(s) failed"; exit 1; fi
