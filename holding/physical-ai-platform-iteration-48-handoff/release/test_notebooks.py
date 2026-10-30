# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks.
# SPDX-License-Identifier: GPL-3.0-only
import ast, json, pathlib, math, time, subprocess, sys, hashlib
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parent.parent
paths=[
 ROOT/"manufacturing"/"notebooks"/"manufacturing_backend_lab.ipynb",
 ROOT/"compute-orchestration"/"notebooks"/"reliability_monte_carlo_colab.ipynb"
]
notebooks={}
for path in paths:
    nb=json.loads(path.read_text())
    assert nb["nbformat"]==4 and nb["nbformat_minor"]>=2, path
    assert nb["metadata"]["kernelspec"]["name"]=="python3", path
    assert any("Copyright © 1993-2026 Abhishek Choudhary" in "".join(c["source"]) for c in nb["cells"]), path
    code=[c for c in nb["cells"] if c["cell_type"]=="code"]
    assert len(code)>=5, path
    for i,cell in enumerate(code):
        src="".join(cell["source"])
        src="\\n".join(line for line in src.splitlines() if not line.lstrip().startswith("%"))
        ast.parse(src,filename=f"{path.name}:cell-{i}")
    notebooks[path.name]=nb

# Execute the actual Manufacturing notebook's finite-capacity HiGHS job-shop cell.
mfg_nb=notebooks["manufacturing_backend_lab.ipynb"]
mfg_cells=["".join(c["source"]) for c in mfg_nb["cells"] if c["cell_type"]=="code"]
solver_cell=next(src for src in mfg_cells if "colab-jobshop-001" in src)
exec(compile(solver_cell,"manufacturing_backend_lab.ipynb:jobshop","exec"),
     {"PACKAGE":ROOT/"manufacturing","json":json,"subprocess":subprocess,"sys":sys})

# Execute the actual Compute notebook numerical cell in forced NumPy CPU mode.
compute_nb=notebooks["reliability_monte_carlo_colab.ipynb"]
compute_cells=["".join(c["source"]) for c in compute_nb["cells"] if c["cell_type"]=="code"]
numerical_cell=next(src for src in compute_cells if 'engine="auto"' in src)
numerical_cell=numerical_cell.replace('engine="auto"','engine="numpy"',1)
sample=json.loads((ROOT/"compute-orchestration"/"samples"/"reliability-series-job.json").read_text())
payload=sample["payload"]
namespace={"np":np,"math":math,"time":time,"rates":payload["failureRatesPerHour"],
           "mission":payload["missionTimeHours"],"samples":payload["samples"],"seed":payload["seed"]}
exec(compile(numerical_cell,"reliability_monte_carlo_colab.ipynb:numpy-cpu","exec"),namespace)
assert namespace["validation"]=="PASS"
assert namespace["selected_engine"]=="numpy-cpu" and namespace["gpu_used"] is False
assert namespace["abs_error"]<=namespace["tolerance"]
print(f"COLAB NOTEBOOKS PASS: {len(paths)} notebooks; syntax valid; Manufacturing solver and Compute CPU numerical cells executed")
