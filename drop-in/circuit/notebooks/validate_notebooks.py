# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# SPDX-License-Identifier: GPL-3.0-only
"""Offline structural validator for the shipped Colab notebook artifact."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY = "Copyright © 1993-2026 Abhishek Choudhary. All rights reserved."
FILES = [ROOT / "notebooks" / "circuit-backend-lab.ipynb"]

for path in FILES:
    nb = json.loads(path.read_text(encoding="utf-8"))
    if nb.get("nbformat") != 4:
        raise SystemExit(f"FAIL {path.name}: expected nbformat 4")
    all_markdown = "\n".join("".join(c.get("source", [])) for c in nb.get("cells", []) if c.get("cell_type") == "markdown")
    if COPY not in all_markdown or "GPL-3.0-only" not in all_markdown:
        raise SystemExit(f"FAIL {path.name}: copyright/license notice missing")
    if nb.get("metadata", {}).get("pap", {}).get("package") != "physical-ai-platform/drop-in/circuit":
        raise SystemExit(f"FAIL {path.name}: package metadata mismatch")
    count = 0
    for i, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") == "code":
            if cell.get("outputs"):
                raise SystemExit(f"FAIL {path.name}: precomputed output must not be shipped (cell {i})")
            compile("".join(cell.get("source", [])), f"{path.name}:cell-{i}", "exec")
            count += 1
    print(f"PASS {path.name}: nbformat=4, copyright/license, metadata, {count} code cells compile")
print("notebook structural validation PASS")
