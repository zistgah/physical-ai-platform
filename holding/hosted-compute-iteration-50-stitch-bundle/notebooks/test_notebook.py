#!/usr/bin/env python3
"""Notebook structural and executable acceptance tests.
Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
SPDX-License-Identifier: GPL-3.0-only
"""
from __future__ import annotations
import ast, hashlib, json, sys
from pathlib import Path
import nbformat

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK = ROOT / "notebooks" / "PAP_Hosted_Compute_Backends.ipynb"
assertions = 0

def check(condition: bool, message: str) -> None:
    global assertions
    if not condition:
        raise AssertionError(message)
    assertions += 1

nb = nbformat.read(NOTEBOOK, as_version=4)
check(nb.nbformat == 4, "nbformat v4")
check(nb.metadata.get("pap", {}).get("license") == "GPL-3.0-only", "notebook licence metadata")
check("1993-2026 Abhishek Choudhary" in nb.cells[0].source, "copyright in first cell")
check("AyeAI®" in nb.cells[0].source and "AyeAM®" in nb.cells[0].source, "trademark notice")
check("Google Colab" in nb.cells[0].source and "colab.research.google.com" in nb.cells[0].source, "Colab browser workflow")
check("SIMULATION" in nb.cells[0].source and "HIL" in nb.cells[0].source, "simulation/HIL boundary documented")
code_cells = [c.source for c in nb.cells if c.cell_type == "code"]
check(len(code_cells) >= 10, "substantive executable cells")
for i, source in enumerate(code_cells):
    ast.parse(source, filename=f"notebook-code-cell-{i}")
    check(True, f"code cell {i} parses as Python")
all_text = "\n".join(c.source for c in nb.cells)
for token in ["poisson_system", "solve_scipy", "torch", "jax", "numba", "pyamg", "cupy", "taichi", "warp", "torchdiffeq", "diffrax", "meshio", "pyvista", "pybullet", "mujoco", "OPTIONAL_PIP_INSTALLS", "resultDigest", "peakMemoryGiB", "GRID_REFINEMENT_ORDER"]:
    check(token in all_text, f"notebook contains {token}")
check(all("!pip" not in source and "subprocess.run([\"pip\"" not in source for source in code_cells), "no automatic package installation")
check("browser-first" in all_text.lower(), "browser-first execution model documented")

# Execute end-to-end when nbclient is installed. This validates the actual numerical path.
try:
    from nbclient import NotebookClient
    executed = NotebookClient(nb, timeout=240, kernel_name="python3", allow_errors=False).execute()
    check(True, "notebook executed end-to-end")
    result_path = Path("/content/pap-hosted-compute/compute-result.json")
    input_path = Path("/content/pap-hosted-compute/compute-input.json")
    output_path = Path("/content/pap-hosted-compute/compute-output-summary.json")
    bundle_path = Path("/content/PAP_Hosted_Compute_Results.zip")
    for path in (result_path, input_path, output_path, bundle_path):
        check(path.exists() and path.stat().st_size > 0, f"artifact produced: {path.name}")
    result = json.loads(result_path.read_text(encoding="utf-8"))
    check(result["schema"] == "pap.hosted-compute-result/1.0", "result schema")
    check(result["metadata"]["license"] == "GPL-3.0-only" and "Abhishek Choudhary" in result["metadata"]["copyright"], "copyright and licence retained in result artifact")
    check(result["status"] == "COMPLETED", "numerical benchmark completed")
    check(result["backendId"] == "numpy-scipy", "default backend selection is explicit")
    check(result["validation"]["passed"] is True, "numerical validation passed")
    check(all(c["passed"] for c in result["checks"]), "all emitted checks pass")
    check(result["resourceUsage"]["peakMemoryGiB"] > 0, "host peak RSS measured")
    check(len(result["inputHash"]) == 64 and len(result["outputHash"]) == 64, "input/output hashes")
    payload = result["digestPayload"].encode("utf-8")
    check(hashlib.sha256(payload).hexdigest() == result["resultDigest"], "detached SHA-256 digest")
    parsed = json.loads(result["digestPayload"])
    outer = {k:v for k,v in result.items() if k not in ("digestPayload", "resultDigest")}
    check(parsed == outer, "digest payload equals result envelope")

    # Explicit backend selection: PyTorch CPU must not be silently rewritten as SciPy.
    import importlib.util
    if importlib.util.find_spec("torch") is not None:
        torch_nb = nbformat.read(NOTEBOOK, as_version=4)
        config_cell = next(c for c in torch_nb.cells if c.cell_type == "code" and "REQUESTED_BACKEND_ID =" in c.source)
        config_cell.source = config_cell.source.replace('REQUESTED_BACKEND_ID = "numpy-scipy"', 'REQUESTED_BACKEND_ID = "pytorch"')
        NotebookClient(torch_nb, timeout=240, kernel_name="python3", allow_errors=False).execute()
        torch_result = json.loads(result_path.read_text(encoding="utf-8"))
        check(torch_result["backendId"] == "pytorch", "explicit PyTorch backend retained")
        check(torch_result["device"] == "cpu", "requested CPU device retained")
        check(torch_result["status"] == "COMPLETED", "PyTorch CPU result passes")
        check(all(c["passed"] for c in torch_result["checks"]), "PyTorch CPU result checks pass")
        check(hashlib.sha256(torch_result["digestPayload"].encode("utf-8")).hexdigest() == torch_result["resultDigest"], "PyTorch result digest passes")
    if importlib.util.find_spec("numba") is not None:
        numba_nb = nbformat.read(NOTEBOOK, as_version=4)
        config_cell = next(c for c in numba_nb.cells if c.cell_type == "code" and "REQUESTED_BACKEND_ID =" in c.source)
        config_cell.source = config_cell.source.replace('REQUESTED_BACKEND_ID = "numpy-scipy"', 'REQUESTED_BACKEND_ID = "numba"')
        NotebookClient(numba_nb, timeout=240, kernel_name="python3", allow_errors=False).execute()
        numba_result = json.loads(result_path.read_text(encoding="utf-8"))
        check(numba_result["backendId"] == "numba", "explicit Numba backend retained")
        check(numba_result["status"] == "COMPLETED", "Numba JIT CPU result passes")
        check(all(c["passed"] for c in numba_result["checks"]), "Numba JIT validation checks pass")
        check(hashlib.sha256(numba_result["digestPayload"].encode("utf-8")).hexdigest() == numba_result["resultDigest"], "Numba result digest passes")
except ImportError:
    print("SKIP: nbclient not installed; structural checks still executed")

print(f"Notebook validation PASS: {assertions} assertions" )
