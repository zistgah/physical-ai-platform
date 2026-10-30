#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# GPL-3.0-only. Optional JSON-lines worker. Dependencies are optional and never imported by the browser core.
"""Optional geometry worker: CadQuery/OCCT, Trimesh and Shapely/GEOS.

Input: one JSON object per stdin line. Output: one JSON object per line.
File operations are confined to FABRICATION_ALLOWED_ROOT (required for file paths).
No repair is silently applied; diagnostics preserve original geometry state.
"""
import json, os, sys, math
from pathlib import Path

PROTOCOL = "PAI-FAB-BACKEND/1"
BACKEND_ID = "fabrication-python-geometry"

def safe_path(raw):
    root_raw = os.environ.get("FABRICATION_ALLOWED_ROOT")
    if not root_raw:
        raise ValueError("FABRICATION_ALLOWED_ROOT is not configured")
    root = Path(root_raw).resolve()
    path = Path(raw).resolve()
    if root != path and root not in path.parents:
        raise ValueError("Requested file is outside FABRICATION_ALLOWED_ROOT")
    if not path.is_file():
        raise ValueError("Requested geometry file does not exist")
    max_bytes = int(os.environ.get("FABRICATION_MAX_INPUT_BYTES", str(256 * 1024 * 1024)))
    if path.stat().st_size > max_bytes:
        raise ValueError("Geometry file exceeds FABRICATION_MAX_INPUT_BYTES")
    return path

def versions():
    # Metadata probing avoids importing heavyweight geometry stacks merely to discover them.
    from importlib import metadata
    distributions = {"cadquery":"cadquery", "trimesh":"trimesh", "shapely":"shapely", "numpy":"numpy", "scipy":"scipy"}
    result = {}
    for name, dist in distributions.items():
        try: result[name] = metadata.version(dist)
        except metadata.PackageNotFoundError: result[name] = None
    return result

def probe(backend_id=BACKEND_ID):
    v = versions()
    all_caps = {
        "cadquery-occt": ["geometry.step.inspect", "geometry.brep.validate", "geometry.mesh.tessellate"] if v["cadquery"] else [],
        "trimesh": ["geometry.mesh.inspect", "geometry.mesh.validate", "geometry.mesh.bounds"] if v["trimesh"] else [],
        "shapely": ["geometry.planar.validate", "geometry.planar.offset", "geometry.planar.boolean"] if v["shapely"] else [],
        "scipy": ["numerics.process.optimize"] if v["scipy"] else [],
        BACKEND_ID: ((["geometry.step.inspect", "geometry.brep.validate", "geometry.mesh.tessellate"] if v["cadquery"] else []) +
                    (["geometry.mesh.inspect", "geometry.mesh.validate", "geometry.mesh.bounds"] if v["trimesh"] else []) +
                    (["geometry.planar.validate", "geometry.planar.offset", "geometry.planar.boolean"] if v["shapely"] else []) +
                    (["numerics.process.optimize"] if v["scipy"] else []))
    }
    caps = all_caps.get(backend_id, [])
    return {"protocol": PROTOCOL, "backendId": backend_id, "state": "READY" if caps else "UNAVAILABLE", "version": "worker-1.0", "capabilities": caps, "dependencies": v}

def inspect_mesh(p):
    import trimesh, numpy as np
    path = safe_path(p["path"])
    loaded = trimesh.load(str(path), force="mesh", process=False)
    if not isinstance(loaded, trimesh.Trimesh):
        raise ValueError("Input did not resolve to a triangle mesh")
    vertices = np.asarray(loaded.vertices)
    faces = np.asarray(loaded.faces)
    finite = bool(np.isfinite(vertices).all())
    valid_indices = bool(faces.size and faces.min() >= 0 and faces.max() < len(vertices))
    if not finite or not valid_indices:
        raise ValueError("Mesh contains non-finite vertices or invalid face indices")
    raw_vertex_count = int(len(vertices))
    # STL commonly duplicates each triangle's vertices. Welding coincident vertices
    # is topology normalization, not hole filling or geometric repair.
    loaded.merge_vertices()
    vertices = np.asarray(loaded.vertices)
    faces = np.asarray(loaded.faces)
    bounds = loaded.bounds.tolist() if len(vertices) else None
    return {"format": path.suffix.lower(), "vertices": int(len(vertices)), "rawVertices":raw_vertex_count, "faces": int(len(faces)),
            "watertight": bool(loaded.is_watertight), "windingConsistent": bool(loaded.is_winding_consistent),
            "volumeMm3": float(loaded.volume) if loaded.is_watertight else None,
            "surfaceAreaMm2": float(loaded.area), "bounds": bounds,
            "isVolume": bool(loaded.is_volume), "repairApplied": False, "vertexWeldingApplied":raw_vertex_count != len(vertices),
            "diagnostics": {"finiteVertices": finite, "validFaceIndices": valid_indices}}

def inspect_step(p):
    import cadquery as cq
    path = safe_path(p["path"])
    shape = cq.importers.importStep(str(path)).val()
    bb = shape.BoundingBox()
    solids = shape.Solids()
    return {"format":"STEP", "valid":bool(shape.isValid()), "solidCount":len(solids),
            "volumeMm3":float(shape.Volume()), "surfaceAreaMm2":float(shape.Area()),
            "boundsMm":{"x":float(bb.xlen),"y":float(bb.ylen),"z":float(bb.zlen)},
            "centerMm":{"x":float(bb.center.x),"y":float(bb.center.y),"z":float(bb.center.z)},
            "backend":"CadQuery/OpenCASCADE", "repairApplied":False}

def tessellate_step(p):
    import cadquery as cq
    path = safe_path(p["path"])
    shape = cq.importers.importStep(str(path)).val()
    if not shape.isValid(): raise ValueError("B-rep failed OpenCASCADE validity check")
    linear = p.get("linearToleranceMm", 0.1)
    angular = p.get("angularToleranceRad", 0.1)
    max_triangles = p.get("maxTriangles", 250000)
    if not isinstance(linear,(int,float)) or not math.isfinite(linear) or linear <= 0: raise ValueError("linearToleranceMm must be positive and finite")
    if not isinstance(angular,(int,float)) or not math.isfinite(angular) or angular <= 0: raise ValueError("angularToleranceRad must be positive and finite")
    if not isinstance(max_triangles,int) or max_triangles < 1: raise ValueError("maxTriangles must be a positive integer")
    verts, tris = shape.tessellate(linear, angular)
    if len(tris) > max_triangles: raise ValueError("Tessellation exceeds maxTriangles")
    return {"verticesMm":[[float(v.x),float(v.y),float(v.z)] for v in verts],
            "faces":[[int(i) for i in face] for face in tris],"vertexCount":len(verts),"triangleCount":len(tris),
            "linearToleranceMm":float(linear),"angularToleranceRad":float(angular),"sourceBrepValid":True}

def planar_offset(p):
    from shapely.geometry import Polygon, MultiPolygon
    coords = p.get("coordinates")
    distance = p.get("offsetMm")
    if not isinstance(coords, list) or len(coords) < 4 or len(coords) > 100000 or not isinstance(distance, (int,float)) or not math.isfinite(distance):
        raise ValueError("coordinates (4..100000 ring points) and finite offsetMm are required")
    poly = Polygon(coords)
    if not poly.is_valid or poly.is_empty or poly.area <= 0:
        raise ValueError("Input polygon is invalid or has zero area")
    join = p.get("joinStyle", "round")
    join_map = {"round":1,"mitre":2,"bevel":3}
    if join not in join_map: raise ValueError("joinStyle must be round, mitre or bevel")
    quad_segments = p.get("quadSegments", 8)
    if not isinstance(quad_segments, int) or quad_segments < 1 or quad_segments > 128: raise ValueError("quadSegments must be an integer in 1..128")
    result = poly.buffer(distance, join_style=join_map[join], quad_segs=quad_segments)
    if result.is_empty: return {"empty":True,"areaMm2":0.0,"polygons":[]}
    geoms = list(result.geoms) if isinstance(result, MultiPolygon) else [result]
    out = []
    for g in geoms:
        if not g.is_valid: raise ValueError("GEOS returned invalid offset geometry")
        out.append({"exterior": [[float(x),float(y)] for x,y in g.exterior.coords],
                    "holes": [[[float(x),float(y)] for x,y in ring.coords] for ring in g.interiors],
                    "areaMm2":float(g.area)})
    return {"empty":False,"areaMm2":float(result.area),"polygons":out,"algorithm":"Shapely/GEOS buffer offset"}

def planar_validate(p):
    from shapely.geometry import Polygon
    coords = p.get("coordinates")
    if not isinstance(coords, list) or len(coords) < 4:
        raise ValueError("coordinates must contain a closed polygon ring")
    poly = Polygon(coords)
    from shapely.validation import explain_validity
    return {"valid":bool(poly.is_valid),"empty":bool(poly.is_empty),"areaMm2":float(poly.area),
            "perimeterMm":float(poly.length),"validityReason":explain_validity(poly),
            "boundsMm":[float(x) for x in poly.bounds] if not poly.is_empty else None}

def planar_boolean(p):
    from shapely.geometry import Polygon
    a, b = p.get("a"), p.get("b")
    if not isinstance(a, list) or not isinstance(b, list) or len(a) < 4 or len(b) < 4 or len(a) > 100000 or len(b) > 100000:
        raise ValueError("a and b polygon coordinate rings (4..100000 points) are required")
    ga, gb = Polygon(a), Polygon(b)
    if not ga.is_valid or not gb.is_valid or ga.is_empty or gb.is_empty:
        raise ValueError("Boolean operands must be valid non-empty polygons")
    op = p.get("operation")
    funcs = {"union":ga.union, "intersection":ga.intersection, "difference":ga.difference, "symmetric_difference":ga.symmetric_difference}
    if op not in funcs: raise ValueError("operation must be union, intersection, difference or symmetric_difference")
    g = funcs[op](gb)
    geoms = list(g.geoms) if hasattr(g, "geoms") else ([] if g.is_empty else [g])
    polygons = []
    for poly in geoms:
        if poly.geom_type != "Polygon": continue
        polygons.append({"exterior":[[float(x),float(y)] for x,y in poly.exterior.coords],
                         "holes":[[[float(x),float(y)] for x,y in ring.coords] for ring in poly.interiors],
                         "areaMm2":float(poly.area)})
    return {"operation":op,"areaMm2":float(g.area),"polygons":polygons,"valid":bool(g.is_valid)}

def optimize_process(p):
    from scipy.optimize import linprog
    required = ["toolDiameterMm", "fluteCount", "processMinFeedMmMin", "machineMaxFeedMmMin", "machineMinSpindleRpm", "machineMaxSpindleRpm",
                "materialMaxCuttingSpeedMMin", "chipLoadMinMmPerTooth", "chipLoadMaxMmPerTooth",
                "stepdownMm", "stepoverMm"]
    if any(k not in p for k in required): raise ValueError("Missing process optimization input: " + ", ".join(k for k in required if k not in p))
    vals = [p[k] for k in required]
    if any(not isinstance(v,(int,float)) or not math.isfinite(v) or v <= 0 for v in vals): raise ValueError("All process optimization inputs must be finite positive numbers")
    d, flutes, min_feed, max_feed, min_rpm, max_rpm, max_vc, fz_min, fz_max, ap, ae = vals
    if int(flutes) != flutes or flutes < 1 or fz_min > fz_max: raise ValueError("Flute count must be integer and chip-load bounds ordered")
    rpm_cap = min(max_rpm, max_vc * 1000.0 / (math.pi * d))
    # Variables are [feed_mm_min, spindle_rpm]. Maximize feed*ap*ae;
    # with fixed ap/ae this is a linear objective. Chip-load limits are linear.
    A = [[1.0, -fz_max * flutes], [-1.0, fz_min * flutes]]
    b = [0.0, 0.0]
    first = linprog(c=[-1.0, 0.0], A_ub=A, b_ub=b,
                    bounds=[(min_feed, max_feed), (min_rpm, rpm_cap)], method="highs")
    if not first.success: raise ValueError("No feasible feed/spindle combination: " + first.message)
    feed_opt = float(first.x[0])
    # Secondary optimization selects the lowest spindle speed that retains optimal feed.
    second = linprog(c=[0.0, 1.0], A_ub=A + [[-1.0, 0.0]], b_ub=b + [-feed_opt + max(1e-8, feed_opt*1e-9)],
                     bounds=[(feed_opt, feed_opt), (1e-9, rpm_cap)], method="highs")
    rpm_opt = float(second.x[1]) if second.success else float(first.x[1])
    chip_load = feed_opt / (rpm_opt * flutes)
    vc = math.pi * d * rpm_opt / 1000.0
    mrr = feed_opt * ap * ae
    return {"feedMmMin":feed_opt,"spindleRpm":rpm_opt,"chipLoadMmPerTooth":chip_load,
            "cuttingSpeedMMin":vc,"materialRemovalRateMm3Min":mrr,
            "limits":{"machineFeedMmMin":max_feed,"machineMinSpindleRpm":min_rpm,"machineMaxSpindleRpm":max_rpm,"materialCuttingSpeedMMin":max_vc,
                      "chipLoadMinMmPerTooth":fz_min,"chipLoadMaxMmPerTooth":fz_max},
            "solver":"scipy.optimize.linprog(method=highs)","objective":"maximize feed x axial_stepdown x radial_stepover; secondary objective minimize RPM at optimal feed",
            "feasible":True,"physicalQualification":False}

def self_test():
    import cadquery as cq
    from shapely.geometry import box
    import trimesh
    shape = cq.Workplane("XY").box(10,20,5).val()
    bb = shape.BoundingBox()
    mesh = trimesh.creation.box(extents=[10,20,5])
    poly = box(0,0,20,10).buffer(-1)
    import tempfile
    root = Path(os.environ.get("FABRICATION_ALLOWED_ROOT", ".")).resolve()
    root.mkdir(parents=True, exist_ok=True)
    step_path = root / ".fabrication-backend-selftest.step"
    stl_path = root / ".fabrication-backend-selftest.stl"
    try:
        cq.exporters.export(shape, str(step_path))
        imported = cq.importers.importStep(str(step_path)).val()
        step_inspection = inspect_step({"path":str(step_path)})
        tessellation = tessellate_step({"path":str(step_path),"linearToleranceMm":0.1,"angularToleranceRad":0.1,"maxTriangles":10000})
        mesh.export(str(stl_path))
        mesh_roundtrip = trimesh.load(str(stl_path), force="mesh", process=False)
        mesh_roundtrip.merge_vertices()
        mesh_inspection = inspect_mesh({"path": str(stl_path)})
        return {"cadquery":{"valid":bool(shape.isValid()),"volumeMm3":float(shape.Volume()),"stepRoundtripValid":bool(imported.isValid()),"stepRoundtripVolumeMm3":float(imported.Volume()),"bounds":[float(bb.xlen),float(bb.ylen),float(bb.zlen)],"stepInspection":step_inspection,"tessellation":{"vertices":tessellation["vertexCount"],"triangles":tessellation["triangleCount"]}},
                "trimesh":{"watertight":bool(mesh.is_watertight),"volumeMm3":float(mesh.volume),"faces":int(len(mesh.faces)),"stlRoundtripWatertight":bool(mesh_roundtrip.is_watertight),"stlRoundtripVolumeMm3":float(mesh_roundtrip.volume),"workerInspection":mesh_inspection},
                "shapely":{"valid":bool(poly.is_valid),"areaMm2":float(poly.area)},
                "expected":{"boxVolumeMm3":1000.0,"offsetAreaMm2":144.0}}
    finally:
        for f in (step_path, stl_path):
            try: f.unlink()
            except FileNotFoundError: pass

def dispatch(req):
    op = req.get("operation")
    payload = req.get("payload") or {}
    if op == "probe": return probe(req.get("backendId", BACKEND_ID))
    if op == "geometry.mesh.inspect": return inspect_mesh(payload)
    if op == "geometry.step.inspect" or op == "geometry.brep.validate": return inspect_step(payload)
    if op == "geometry.mesh.tessellate": return tessellate_step(payload)
    if op == "geometry.mesh.inspect" or op == "geometry.mesh.validate" or op == "geometry.mesh.bounds": return inspect_mesh(payload)
    if op == "geometry.planar.offset": return planar_offset(payload)
    if op == "geometry.planar.validate": return planar_validate(payload)
    if op == "geometry.planar.boolean": return planar_boolean(payload)
    if op == "numerics.process.optimize": return optimize_process(payload)
    if op == "self-test": return self_test()
    raise ValueError("Unsupported operation: " + str(op))

def main():
    for line in sys.stdin:
        req = {}
        try:
            if len(line) > 10 * 1024 * 1024:
                raise ValueError("Request exceeds 10 MiB line limit")
            req = json.loads(line)
            result = dispatch(req)
            out = {"protocol":PROTOCOL,"backendId":req.get("backendId", BACKEND_ID),"operation":req.get("operation"),"status":"COMPLETED","backendVersion":"worker-1.0","result":result}
        except Exception as exc:
            out = {"protocol":PROTOCOL,"backendId":BACKEND_ID,"operation":locals().get("req",{}).get("operation"),"status":"REJECTED","reason":str(exc)}
        sys.stdout.write(json.dumps(out, allow_nan=False) + "\n")
        sys.stdout.flush()

if __name__ == "__main__": main()
