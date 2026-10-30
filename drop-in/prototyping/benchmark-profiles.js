/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/** Small, explicit verification set. Profiles are acceptance criteria, not solver implementations. */
const profiles=[
 {id:"openfoam-lid-driven-cavity-re100",domain:"cfd",backends:["openfoam","elmer"],reference:"Canonical lid-driven cavity Re=100 benchmark; selected residual and conservation checks are necessary, not sufficient for full field validation.",metrics:[{path:"residual",max:1e-6},{path:"massImbalance",max:1e-8}]},
 {id:"rc-lowpass-step-tau",domain:"numerics+circuit",backends:["scipy","ngspice","xyce"],reference:"First-order RC low-pass step response at t=RC; Vout/Vstep = 1 - exp(-1) = 0.6321205588.",metrics:[{path:"voutAtTauV",expected:0.6321205588285577,absTolerance:0.005}]},
 {id:"calculix-cantilever-small-deflection",domain:"fea",backends:["calculix","code-aster","elmer"],reference:"Euler-Bernoulli cantilever beam: L=1 m, E=200 GPa, b=0.02 m, h=0.01 m, F=10 N; I=bh^3/12 and tip deflection=0.01 m. Linear small-deflection assumption.",metrics:[{path:"tipDeflectionM",expected:0.01,absTolerance:0.0001}]},
 {id:"chrono-mujoco-simple-pendulum",domain:"multibody",backends:["chrono","mujoco","mbdyn"],reference:"Small-angle simple pendulum with L=1 m and g=9.80665 m/s^2; T=2*pi*sqrt(L/g)=2.0064092926 s. Small-angle approximation.",metrics:[{path:"periodS",expected:2.0064092925890407,absTolerance:0.02}]},
 {id:"occt-box-intersection-volume",domain:"cad",backends:["opencascade"],reference:"Analytical intersection of two axis-aligned unit cubes with unit overlap in x, y and z; expected intersection volume 1 m^3.",metrics:[{path:"intersectionVolumeM3",expected:1,absTolerance:1e-6}]},
 {id:"gmsh-mesh-quality-minimum",domain:"meshing",backends:["gmsh"],reference:"Mesh validity smoke benchmark: positive minimum Jacobian and finite maximum aspect ratio; project-specific acceptance thresholds remain mandatory.",metrics:[{path:"minimumJacobian",min:0},{path:"maximumAspectRatio",max:20}]}
];
export const BENCHMARK_PROFILES=Object.freeze(profiles.map(p=>Object.freeze({...p,backends:Object.freeze([...p.backends]),metrics:Object.freeze(p.metrics.map(m=>Object.freeze({...m})))})));
export const getBenchmarkProfile=id=>BENCHMARK_PROFILES.find(p=>p.id===id)||null;
