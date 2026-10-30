# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
#!/usr/bin/env python3
"""Optional OCCT-backed intersection engine for closed triangulated solids.

Protocol: one JSON object on stdin; one JSON object on stdout. No filesystem writes.
Requires OCP (Python bindings for Open CASCADE Technology). CadQuery is not required. This is an optional host-side backend;
the browser-safe JavaScript module remains dependency-free.
"""
from __future__ import annotations
import json, math, sys, traceback


def _fail(reason: str, code: str = "INVALID_INPUT"):
    return {"outcome": "HOLD", "reason": reason, "code": code, "engine": "OCCT"}


def _mesh_to_solid(data, sewing_tol):
    from OCP.BRepBuilderAPI import (BRepBuilderAPI_Sewing, BRepBuilderAPI_MakeFace,
                                    BRepBuilderAPI_MakePolygon, BRepBuilderAPI_MakeSolid)
    from OCP.BRepLib import BRepLib
    from OCP.BRepCheck import BRepCheck_Analyzer
    from OCP.TopAbs import TopAbs_SHELL
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopoDS import TopoDS
    from OCP.gp import gp_Pnt

    if not isinstance(data, dict): raise ValueError("solid must be an object")
    vertices, faces = data.get("vertices"), data.get("faces")
    if not isinstance(vertices, list) or len(vertices) < 4 or not isinstance(faces, list) or len(faces) < 4:
        raise ValueError("solid needs at least four vertices and four faces")
    points = []
    for i, p in enumerate(vertices):
        if not isinstance(p, dict) or not all(isinstance(p.get(k), (int, float)) and math.isfinite(p[k]) for k in ("x", "y", "z")):
            raise ValueError(f"vertex {i} is non-finite or malformed")
        points.append((float(p["x"]), float(p["y"]), float(p["z"])))
    sewing = BRepBuilderAPI_Sewing(sewing_tol, True, True, True, False)
    for fi, face in enumerate(faces):
        if not isinstance(face, list) or len(face) != 3 or any(not isinstance(i, int) or i < 0 or i >= len(points) for i in face):
            raise ValueError(f"face {fi} must be a valid triangle")
        if len(set(face)) != 3: raise ValueError(f"face {fi} is degenerate")
        poly = BRepBuilderAPI_MakePolygon()
        for idx in face:
            poly.Add(gp_Pnt(*points[idx]))
        poly.Close()
        if not poly.IsDone(): raise ValueError(f"face {fi} wire construction failed")
        mk_face = BRepBuilderAPI_MakeFace(poly.Wire())
        if not mk_face.IsDone(): raise ValueError(f"face {fi} construction failed")
        sewing.Add(mk_face.Face())
    sewing.Perform()
    sewed = sewing.SewedShape()
    exp = TopExp_Explorer(sewed, TopAbs_SHELL)
    if not exp.More(): raise ValueError("sewing did not produce a closed shell")
    shell = TopoDS.Shell_s(exp.Current())
    exp.Next()
    if exp.More(): raise ValueError("input has multiple disconnected shells; supply one closed solid per operand")
    mk_solid = BRepBuilderAPI_MakeSolid(shell)
    if not mk_solid.IsDone(): raise ValueError("could not construct a solid from the sewn shell")
    solid = mk_solid.Solid()
    if not BRepLib.OrientClosedSolid_s(solid): raise ValueError("shell orientation could not be normalized")
    if not BRepCheck_Analyzer(solid, True).IsValid(): raise ValueError("input is not a valid OCCT solid (self-intersection or invalid topology)")
    return solid


def run(payload):
    try:
        from OCP.BRepAlgoAPI import BRepAlgoAPI_Common
        from OCP.BRepCheck import BRepCheck_Analyzer
        from OCP.BRepMesh import BRepMesh_IncrementalMesh
        from OCP.BRepGProp import BRepGProp
        from OCP.GProp import GProp_GProps
        from OCP.TopAbs import TopAbs_SOLID
        from OCP.TopExp import TopExp_Explorer
        from OCP.TopoDS import TopoDS
    except Exception as exc:
        return _fail(f"OCCT backend unavailable: {exc}", "BACKEND_UNAVAILABLE")

    try:
        tol = payload.get("tolerance", 1e-7)
        deflection = payload.get("deflection", max(tol * 10, 1e-3))
        angular = payload.get("angularDeflection", 0.25)
        if not all(isinstance(x, (int, float)) and math.isfinite(x) and x > 0 for x in (tol, deflection, angular)):
            return _fail("tolerance, deflection and angularDeflection must be positive finite numbers")
        a = _mesh_to_solid(payload.get("base"), tol)
        b = _mesh_to_solid(payload.get("cutter"), tol)
        op = BRepAlgoAPI_Common(a, b)
        op.SetFuzzyValue(float(tol))
        op.SetNonDestructive(True)
        op.Build()
        if not op.IsDone(): return _fail("OCCT Boolean common operation did not complete", "BOOLEAN_FAILED")
        shape = op.Shape()
        if shape.IsNull(): return _fail("intersection is empty", "EMPTY_INTERSECTION")
        if not BRepCheck_Analyzer(shape, True).IsValid(): return _fail("OCCT produced an invalid result shape", "INVALID_RESULT")
        solids = []
        exp = TopExp_Explorer(shape, TopAbs_SOLID)
        while exp.More():
            solids.append(TopoDS.Solid_s(exp.Current())); exp.Next()
        if not solids: return _fail("intersection contains no volumetric solid", "EMPTY_INTERSECTION")
        # Preserve multiple disconnected output solids as a compound mesh.
        from OCP.BRep import BRep_Tool
        from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
        from OCP.TopExp import TopExp_Explorer
        from OCP.TopoDS import TopoDS
        from OCP.TopLoc import TopLoc_Location
        BRepMesh_IncrementalMesh(shape, float(deflection), False, float(angular), True).Perform()
        # Extract OCCT face triangulations directly. This avoids a mandatory
        # CadQuery dependency and preserves per-face orientation/location.
        raw_triangles = []
        face_exp = TopExp_Explorer(shape, TopAbs_FACE)
        while face_exp.More():
            face = TopoDS.Face_s(face_exp.Current())
            location = TopLoc_Location()
            triangulation = BRep_Tool.Triangulation_s(face, location)
            if triangulation is not None:
                transform = location.Transformation()
                reverse = face.Orientation() == TopAbs_REVERSED
                for ti in range(1, triangulation.NbTriangles() + 1):
                    i, j, k = triangulation.Triangle(ti).Get()
                    if reverse:
                        j, k = k, j
                    pts = []
                    for ni in (i, j, k):
                        point = triangulation.Node(ni).Transformed(transform)
                        pts.append((float(point.X()), float(point.Y()), float(point.Z())))
                    raw_triangles.append(pts)
            face_exp.Next()
        # OCCT triangulation repeats nodes between faces. Weld using a spatial hash.
        out_vertices, out_faces, buckets = [], [], {}
        weld_tol = max(float(tol) * 4.0, 1e-12)
        def weld_id(p):
            xyz = tuple(float(v) for v in p)
            cell = tuple(math.floor(v / weld_tol) for v in xyz)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for dz in (-1, 0, 1):
                        key = (cell[0]+dx, cell[1]+dy, cell[2]+dz)
                        for idx in buckets.get(key, ()):
                            q = out_vertices[idx]
                            if math.dist(xyz, (q["x"], q["y"], q["z"])) <= weld_tol:
                                return idx
            idx = len(out_vertices)
            out_vertices.append({"x": xyz[0], "y": xyz[1], "z": xyz[2]})
            buckets.setdefault(cell, []).append(idx)
            return idx
        for tri in raw_triangles:
            face = [weld_id(p) for p in tri]
            if len(set(face)) != 3: return _fail("OCCT tessellation contains a collapsed triangle", "TESSELLATION_FAILED")
            out_faces.append(face)
        if len(out_vertices) < 4 or len(out_faces) < 4: return _fail("OCCT tessellation is empty or degenerate", "TESSELLATION_FAILED")
        edge_map = {}
        for face in out_faces:
            for j in range(3):
                u, v = face[j], face[(j+1) % 3]
                key = (min(u,v), max(u,v))
                count, balance = edge_map.get(key, (0,0))
                edge_map[key] = (count+1, balance+(1 if u < v else -1))
        bad_edges = sum(1 for count,balance in edge_map.values() if count != 2 or balance != 0)
        if bad_edges: return _fail(f"OCCT tessellation has {bad_edges} open, non-manifold or misoriented edges", "TESSELLATION_TOPOLOGY")
        props = GProp_GProps()
        BRepGProp.VolumeProperties_s(shape, props)
        volume = abs(float(props.Mass()))
        if not math.isfinite(volume) or volume <= 0: return _fail("intersection has no positive finite volume", "INVALID_VOLUME")
        # Output is checked in OCCT before tessellation. Mesh topology is independently
        # checked by the JS consumer, avoiding a false claim that B-rep validity implies mesh validity.
        # Independently integrate the indexed triangle mesh and compare it with
        # OCCT's exact B-rep mass property within a deflection-aware tolerance.
        mesh_volume = 0.0
        origin = out_vertices[0]
        for ia, ib, ic in out_faces:
            a, b, c = out_vertices[ia], out_vertices[ib], out_vertices[ic]
            ax,ay,az = a["x"]-origin["x"],a["y"]-origin["y"],a["z"]-origin["z"]
            bx,by,bz = b["x"]-origin["x"],b["y"]-origin["y"],b["z"]-origin["z"]
            cx,cy,cz = c["x"]-origin["x"],c["y"]-origin["y"],c["z"]-origin["z"]
            mesh_volume += (ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6.0
        mesh_volume = abs(mesh_volume)
        if abs(mesh_volume-volume) > max(volume*1e-6, float(deflection)**2 * max(volume**(1/3),1.0) * 1e-3):
            return _fail(f"tessellated mesh volume {mesh_volume} disagrees with OCCT B-rep volume {volume}", "VOLUME_MISMATCH")
        return {
            "outcome": "OK", "operation": "INTERSECTION", "engine": "OCCT",
            "engineVersion": "Open CASCADE via OCP",
            "solid": {"vertices": out_vertices, "faces": out_faces, "kind": "BREP_MESH"},
            "mesh": {"vertices": out_vertices, "faces": out_faces},
            "volume": volume, "meshVolume": mesh_volume, "triangleCount": len(out_faces), "solidCount": len(solids),
            "tolerance": float(tol), "deflection": float(deflection),
            "topology": {"brepValid": True, "watertight": True, "badEdges": 0, "meshVolumeVerified": True},
            "note": "OCCT B-rep Boolean common on closed triangulated input; result is tessellated at the requested deflection."
        }
    except ValueError as exc:
        return _fail(str(exc))
    except Exception as exc:
        return _fail(f"OCCT backend exception: {type(exc).__name__}: {exc}", "BACKEND_ERROR")


if __name__ == "__main__":
    try:
        request = json.load(sys.stdin)
        if request.get("action") == "probe":
            import OCP
            sys.stdout.write(json.dumps({"available": True, "engine": "OCCT", "binding": "OCP"}, separators=(",", ":")))
        else:
            response = run(request)
            sys.stdout.write(json.dumps(response, separators=(",", ":"), allow_nan=False))
    except Exception as exc:
        sys.stdout.write(json.dumps(_fail(f"request parse failure: {type(exc).__name__}: {exc}", "PROTOCOL_ERROR")))
