#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
"""Optional Manifold3D mesh Boolean backend; one JSON request/response per process."""
import json, math, sys

def hold(reason, code="INVALID_INPUT"):
    return {"outcome":"HOLD", "reason":reason, "code":code, "engine":"Manifold3D"}

def run(p):
    try:
        import numpy as np
        from manifold3d import Manifold, Mesh
    except Exception as e:
        return hold("Manifold3D backend unavailable: " + str(e), "BACKEND_UNAVAILABLE")
    try:
        tol=float(p.get("tolerance",1e-7))
        if not math.isfinite(tol) or tol<=0: return hold("tolerance must be positive and finite")
        def make(data,label):
            if not isinstance(data,dict): raise ValueError(label+" is missing")
            vs,fs=data.get("vertices"),data.get("faces")
            if not isinstance(vs,list) or len(vs)<4 or not isinstance(fs,list) or len(fs)<4: raise ValueError(label+" requires vertices and triangles")
            if any(not isinstance(v,dict) or not all(k in v and isinstance(v[k],(int,float)) and math.isfinite(v[k]) for k in ("x","y","z")) for v in vs): raise ValueError(label+" contains invalid coordinates")
            if any(not isinstance(f,list) or len(f)!=3 or any(type(i) is not int or i<0 or i>=len(vs) for i in f) or len(set(f))!=3 for f in fs): raise ValueError(label+" contains invalid triangle indices")
            mesh=Mesh(vert_properties=np.asarray([[v['x'],v['y'],v['z']] for v in vs],dtype=np.float32),tri_verts=np.asarray(fs,dtype=np.uint32))
            m=Manifold(mesh)
            status=m.status()
            status_name=getattr(status,"name",str(status))
            if "NoError" not in status_name and status != 0: raise ValueError(label+" rejected by Manifold3D: "+status_name)
            return m
        a=make(p.get("base"),"base"); b=make(p.get("cutter"),"cutter")
        result=a ^ b
        status=result.status(); status_name=getattr(status,"name",str(status))
        if "NoError" not in status_name and status != 0: return hold("Manifold3D Boolean failed: "+status_name,"BOOLEAN_FAILED")
        out=result.to_mesh()
        verts=[{"x":float(v[0]),"y":float(v[1]),"z":float(v[2])} for v in out.vert_properties]
        faces=[[int(i) for i in f] for f in out.tri_verts]
        if len(verts)<4 or len(faces)<4: return hold("intersection is empty or has no volumetric mesh","EMPTY_INTERSECTION")
        volume=float(result.volume())
        if not math.isfinite(volume) or volume<=0: return hold("intersection has no positive finite volume","INVALID_VOLUME")
        return {"outcome":"OK","operation":"INTERSECTION","engine":"Manifold3D","engineVersion":"python binding","solid":{"vertices":verts,"faces":faces,"kind":"BREP_MESH"},"mesh":{"vertices":verts,"faces":faces},"volume":volume,"meshVolume":volume,"triangleCount":len(faces),"solidCount":1,"tolerance":tol,"topology":{"brepValid":True,"watertight":True,"meshVolumeVerified":False,"validation":"Manifold3D status and volume; independent JS validator required"}}
    except Exception as e:
        return hold(type(e).__name__+": "+str(e),"BACKEND_ERROR")

if __name__=="__main__":
    try:
        req=json.load(sys.stdin)
        if req.get("action")=="probe":
            import manifold3d
            print(json.dumps({"available":True,"engine":"Manifold3D","version":getattr(manifold3d,"__version__","unknown")}))
        else: print(json.dumps(run(req),separators=(",",":"),allow_nan=False))
    except Exception as e: print(json.dumps({"available":False,"outcome":"HOLD","reason":str(e),"code":"PROTOCOL_ERROR"}))
