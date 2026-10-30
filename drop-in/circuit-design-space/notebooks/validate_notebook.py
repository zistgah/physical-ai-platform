# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# SPDX-License-Identifier: GPL-3.0-only
"""Offline notebook structure, attribution and syntax checks."""
import json
from pathlib import Path
p = Path(__file__).with_name('circuit-design-space-lab.ipynb')
nb = json.loads(p.read_text(encoding='utf-8'))
assert nb.get('nbformat') == 4
markdown = '\n'.join(''.join(c.get('source', [])) for c in nb['cells'] if c['cell_type'] == 'markdown')
assert 'Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.' in markdown
assert 'GPL-3.0-only' in markdown
assert nb['metadata']['pap']['package'] == 'physical-ai-platform/drop-in/circuit-design-space'
count = 0
for i, c in enumerate(nb['cells']):
    if c['cell_type'] == 'code':
        assert not c.get('outputs'), f'precomputed output in cell {i}'
        compile(''.join(c.get('source', [])), f'{p.name}:cell-{i}', 'exec')
        count += 1
print(f'PASS {p.name}: nbformat=4, copyright/license, metadata, {count} code cells compile')
