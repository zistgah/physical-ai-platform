/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Replaceable open-engine catalogue. No third-party implementation code is vendored. */
export const BACKEND_PROTOCOL_VERSION = "1.0.0";
export const ADAPTER_VERSION = "1.0.0";

const entries = [
  { id:"scipy", workerProfile:"scipy.solve_ivp.v1", name:"SciPy", domains:["numerics","optimization","ode","linear-algebra"], operations:["numerics.ode","numerics.integrate","numerics.optimize","numerics.linear-solve","numerics.interpolate"], inputFormats:["JSON","NPZ","CSV"], outputFormats:["JSON","CSV","NPZ"], license:"BSD-3-Clause (bundled components retain their own notices)", mode:"WORKER_RPC", source:"https://scipy.org/", notes:"Numerical library for integration, ODEs, optimization, sparse/dense linear algebra and interpolation; not a domain-specific CAD/CFD/FEA solver." },
  { id:"opencascade", workerProfile:"occt.geometry.v1", name:"Open CASCADE Technology", domains:["cad","geometry"], operations:["geometry.boolean","geometry.tessellate","geometry.validate","geometry.brep"], inputFormats:["STEP","IGES","BREP"], outputFormats:["STEP","IGES","BREP","STL"], license:"LGPL-2.1-only WITH OCCT-exception-1.0", mode:"WORKER_RPC", source:"https://www.occt3d.com/dev/doc/overview/html/index.html", notes:"B-rep/NURBS geometry kernel; confirm notice/source obligations for the selected build." },
  { id:"gmsh", workerProfile:"gmsh.mesh.v1", name:"Gmsh", domains:["cad","meshing","fea","cfd"], operations:["mesh.generate","mesh.refine","mesh.convert"], inputFormats:["GEO","STEP","IGES","BREP","STL"], outputFormats:["MSH","VTK","UNV"], license:"GPL-2.0-or-later WITH linking exception (verify release terms)", mode:"WORKER_RPC", source:"https://gmsh.info/", notes:"Geometry and finite-element meshing; not a general-purpose physics solver." },
  { id:"openfoam", workerProfile:"openfoam.case.v1", name:"OpenFOAM", domains:["cfd","heat-transfer","multiphysics"], operations:["cfd.steady","cfd.transient","cfd.multiphase","cfd.conjugate-heat-transfer"], inputFormats:["CASE","MSH","VTK"], outputFormats:["VTK","ENSIGHT","FOAM"], license:"GPL-3.0 (distribution/version-specific review required)", mode:"WORKER_RPC", source:"https://www.openfoam.com/documentation/", notes:"Finite-volume CFD suite; solver and model selection must be explicit." },
  { id:"elmer", workerProfile:"elmer.sif.v1", name:"Elmer FEM", domains:["fea","cfd","thermal","electromagnetics","acoustics","multiphysics"], operations:["fem.solve","thermal.solve","em.solve","acoustics.solve","multiphysics.solve"], inputFormats:["SIF","MSH","VTU"], outputFormats:["VTU","VTK","ELMER_RESULT"], license:"GPL-2.0-or-later; ElmerSolver library LGPL components", mode:"WORKER_RPC", source:"https://github.com/ElmerCSC/elmerfem", notes:"Multi-physics FEM; component-level license inventory required for redistribution." },
  { id:"code-aster", workerProfile:"code-aster.comm.v1", name:"Code_Aster", domains:["fea","structural","thermal","dynamics","contact","fatigue"], operations:["fea.linear-static","fea.nonlinear","fea.modal","fea.thermal","fea.contact","fea.fatigue"], inputFormats:["COMM","MED","UNV"], outputFormats:["MED","ASTER_RESULT","UNV"], license:"GPL family; package dependency inventory required", mode:"WORKER_RPC", source:"https://code-aster.org/en/product/main", notes:"Large verification corpus and broad structural analysis; SALOME-MECA is a separate workflow layer." },
  { id:"calculix", workerProfile:"calculix.ccx.v1", name:"CalculiX", domains:["fea","structural","thermal","contact"], operations:["fea.linear-static","fea.nonlinear","fea.modal","fea.thermal","fea.contact"], inputFormats:["INP"], outputFormats:["FRD","DAT","STA"], license:"GPL-2.0 (verify exact upstream distribution)", mode:"WORKER_RPC", source:"https://github.com/Dhondtguido/CalculiX", notes:"3D finite-element solver; solver and pre/post-processing licenses can differ." },
  { id:"ngspice", workerProfile:"ngspice.spice.v1", name:"ngspice", domains:["circuit","electronics","mixed-signal"], operations:["circuit.dc","circuit.ac","circuit.transient","circuit.noise"], inputFormats:["SPICE"], outputFormats:["RAW","CSV","LOG"], license:"Modified BSD with file-level exceptions (inspect COPYING)", mode:"WORKER_RPC", source:"https://ngspice.sourceforge.io/", notes:"Mixed-level/mixed-signal SPICE simulator; license is not uniformly one SPDX identifier." },
  { id:"xyce", workerProfile:"xyce.spice.v1", name:"Xyce", domains:["circuit","electronics","parallel-circuit"], operations:["circuit.dc","circuit.ac","circuit.transient","circuit.sensitivity"], inputFormats:["SPICE"], outputFormats:["PRN","CSV","RAW"], license:"GPL-3.0-or-later", mode:"WORKER_RPC", source:"https://xyce.sandia.gov/", notes:"Parallel electronic simulator; confirm version-specific build and redistribution obligations." },
  { id:"chrono", workerProfile:"chrono.driver.v1", name:"Project Chrono", domains:["multibody","contact","robotics","vehicle","fsi","dem"], operations:["multibody.step","multibody.contact","vehicle.simulate","fsi.solve","dem.solve"], inputFormats:["CHRONO_JSON","URDF","MESH"], outputFormats:["CSV","HDF5","VTK"], license:"BSD-3-Clause", mode:"WORKER_RPC", source:"https://projectchrono.org/", notes:"Multibody, contact, flexible bodies, vehicle, granular and FSI modules; optional modules vary." },
  { id:"mbdyn", workerProfile:"mbdyn.input.v1", name:"MBDyn", domains:["multibody","aeroelastic","structural","control"], operations:["multibody.solve","aeroelastic.solve","structural.dynamic"], inputFormats:["MBDYN_INPUT"], outputFormats:["MBDYN_OUTPUT","NETCDF"], license:"GPL-2.0-or-later", mode:"WORKER_RPC", source:"https://www.mbdyn.org/", notes:"Nonlinear multidisciplinary multibody solver; research-oriented tool, not a turnkey GUI suite." },
  { id:"mujoco", workerProfile:"mujoco.mjcf.v1", name:"MuJoCo", domains:["multibody","contact","robotics","control"], operations:["multibody.step","multibody.contact","robotics.simulate","control.rollout"], inputFormats:["MJCF","URDF"], outputFormats:["MJDATA","CSV","HDF5"], license:"Apache-2.0", mode:"WORKER_RPC", source:"https://github.com/google-deepmind/mujoco", notes:"General-purpose multi-joint dynamics with contact; use official distribution and license notices." }
];

export const BACKEND_CATALOG = Object.freeze(entries.map(e => Object.freeze({
  ...e,
  domains:Object.freeze([...e.domains]),
  operations:Object.freeze([...e.operations]),
  inputFormats:Object.freeze([...e.inputFormats]),
  outputFormats:Object.freeze([...e.outputFormats])
})));
const byId = new Map(BACKEND_CATALOG.map(e => [e.id,e]));
export function getBackend(id) { return byId.get(id) || null; }
export function listBackends({ domain, operation, inputFormat } = {}) {
  return BACKEND_CATALOG.filter(b => (!domain || b.domains.includes(domain)) && (!operation || b.operations.includes(operation)) && (!inputFormat || b.inputFormats.includes(inputFormat)));
}
export function selectBackends({ domain, operation, inputFormat, preferredBackendId } = {}) {
  const candidates = listBackends({domain,operation,inputFormat});
  if (preferredBackendId) {
    const selected = candidates.find(b => b.id === preferredBackendId);
    return selected ? { outcome:"OK", selected, alternatives:candidates.filter(b=>b.id!==selected.id) }
      : { outcome:"HOLD", reason:"Preferred backend is not catalogued for the requested capability", missing:[`backend:${preferredBackendId}:${domain||"*"}:${operation||"*"}`] };
  }
  return candidates.length ? { outcome:"OK", selected:null, alternatives:candidates } : { outcome:"HOLD", reason:"No registered backend supports the requested capability", missing:[`backend:${domain||"*"}:${operation||"*"}`] };
}
