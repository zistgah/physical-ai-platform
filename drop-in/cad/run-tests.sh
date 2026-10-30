#!/usr/bin/env bash
# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
node --experimental-default-type=module test.mjs
node --experimental-default-type=module backend-integration-test.mjs
python3 tests/occt-test.py
python3 tests/optional-backend-test.py
node --check module.js
node --check integration-test.mjs
node --check backend-integration-test.mjs
node --check backends/node-occt-adapter.mjs
node --check backends/registry.mjs
python3 -m py_compile backends/occt_backend.py backends/manifold_backend.py tests/occt-test.py tests/optional-backend-test.py
python3 - <<'PY'
import json, pathlib
root=pathlib.Path('.')
for p in root.rglob('*.json'):
    json.loads(p.read_text())
print('JSON parse PASS')
notebook = json.loads((root/'COLAB_CAD_WORKBENCH.ipynb').read_text())
for i, cell in enumerate(notebook.get('cells', [])):
    if cell.get('cell_type') == 'code':
        compile(''.join(cell.get('source', [])), f'colab_cell_{i}', 'exec')
print(f"Colab notebook syntax PASS: {len(notebook.get('cells', []))} cells")
PY
