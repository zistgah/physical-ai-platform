# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
# SPDX-License-Identifier: GPL-3.0-only
import ast, json, pathlib
ROOT=pathlib.Path(__file__).resolve().parent
notebooks=sorted((ROOT/"notebooks").glob("*.ipynb"))
assert len(notebooks)==1
for path in notebooks:
    nb=json.loads(path.read_text())
    assert nb["nbformat"]==4
    assert nb["metadata"]["kernelspec"]["name"]=="python3"
    assert any("Copyright © 1993-2026 Abhishek Choudhary" in "".join(c["source"]) for c in nb["cells"])
    code_cells=[c for c in nb["cells"] if c["cell_type"]=="code"]
    assert len(code_cells)>=5
    for i,cell in enumerate(code_cells):
        src="".join(cell["source"])
        src="\\n".join(line for line in src.splitlines() if not line.lstrip().startswith("%"))
        ast.parse(src,filename=f"{path.name}:cell-{i}")
print(f"notebook syntax PASS: {len(notebooks)} notebook; all code cells parse")
