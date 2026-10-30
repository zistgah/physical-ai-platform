# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
"""Build a STEP solid from a mesh and report the OpenCascade volume."""
import json
import sys
try:
    from OCP.gp import gp_Pnt
    from OCP.BRepBuilderAPI import BRepBuilderAPI_MakePolygon, BRepBuilderAPI_MakeFace, BRepBuilderAPI_Sewing, BRepBuilderAPI_MakeSolid
    from OCP.BRep import BRep_Builder
    from OCP.TopoDS import TopoDS
    from OCP.GProp import GProp_GProps
    from OCP.BRepGProp import BRepGProp
    from OCP.STEPControl import STEPControl_Writer, STEPControl_AsIs
    from OCP.IFSelect import IFSelect_RetDone
except ImportError as exc:
    # Seed fix: without OpenCascade the check cannot run; say so instead of crashing.
    print(json.dumps({"written": False, "unverified": f"OpenCascade (python module OCP) is not available: {exc}"}))
    sys.exit(0)

# Seed fix: OCP 7.x names static methods with a _s suffix; OCP 8 drops it on some classes.
def _static(cls, name):
    return getattr(cls, name + "_s", None) or getattr(cls, name)

mesh = json.load(open(sys.argv[1]))
sewing = BRepBuilderAPI_Sewing(1e-6)
for face in mesh["faces"]:
    poly = BRepBuilderAPI_MakePolygon()
    for idx in face:
        p = mesh["vertices"][idx]
        poly.Add(gp_Pnt(p["x"], p["y"], p["z"]))
    poly.Close()
    sewing.Add(BRepBuilderAPI_MakeFace(poly.Wire()).Face())
sewing.Perform()
shell = sewing.SewedShape()
solid = BRepBuilderAPI_MakeSolid(_static(TopoDS, "Shell")(shell)).Solid()
props = GProp_GProps()
_static(BRepGProp, "VolumeProperties")(solid, props)
volume = props.Mass()
writer = STEPControl_Writer()
writer.Transfer(solid, STEPControl_AsIs)
out = sys.argv[2]
status = writer.Write(out)
print(json.dumps({"volume": volume, "step": out, "written": status == IFSelect_RetDone}))
