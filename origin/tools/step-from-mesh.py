# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
"""Build a STEP solid from a mesh and report the OpenCascade volume."""
import json
import sys
from OCP.gp import gp_Pnt
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakePolygon, BRepBuilderAPI_MakeFace, BRepBuilderAPI_Sewing, BRepBuilderAPI_MakeSolid
from OCP.BRep import BRep_Builder
from OCP.TopoDS import TopoDS
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCP.IFSelect import IFSelect_RetDone

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
solid = BRepBuilderAPI_MakeSolid(TopoDS.Shell_s(shell)).Solid()
props = GProp_GProps()
BRepGProp.VolumeProperties_s(solid, props)
volume = props.Mass()
writer = STEPControl_Writer()
writer.Transfer(solid, STEPControl_AsIs)
out = sys.argv[2]
status = writer.Write(out)
print(json.dumps({"volume": volume, "step": out, "written": status == IFSelect_RetDone}))
