# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
"""Optional dependency probe; unavailable optional engines are reported, never faked."""
import importlib.util, json, shutil
print(json.dumps({
  "occt_oCP": importlib.util.find_spec("OCP") is not None,
  "manifold3d": importlib.util.find_spec("manifold3d") is not None,
  "cgal_executable": shutil.which("cad-cgal-boolean") is not None
}, sort_keys=True))
