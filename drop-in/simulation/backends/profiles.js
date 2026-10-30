/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
import { createRemoteBackend } from './registry.js';

const PROFILES = Object.freeze({
  mujoco: { engine:'mujoco', license:'Apache-2.0', capabilities:['articulated-multibody','contact-dynamics','robotics','biomechanics'], source:'https://mujoco.readthedocs.io/en/stable/overview.html' },
  chrono: { engine:'project-chrono', license:'BSD-3-Clause', capabilities:['multibody','fea','vehicle-dynamics','granular','fluid-solid-interaction','sensors'], source:'https://www.projectchrono.org/' },
  ode: { engine:'ode', license:'BSD-3-Clause OR LGPL-2.1-or-later', capabilities:['rigid-body','articulated-joints','frictional-contact'], source:'https://ode.org/' },
  bullet: { engine:'bullet', license:'zlib', capabilities:['rigid-body','collision-detection','robotics','multiphysics'], source:'https://github.com/bulletphysics/bullet3' },
  physx: { engine:'physx', license:'Apache-2.0 (current repository; verify exact release)', capabilities:['rigid-body','collision-detection','cpu-gpu','real-time-3d'], source:'https://github.com/NVIDIA-Omniverse/PhysX' },
  jolt: { engine:'jolt', license:'MIT', capabilities:['multicore-rigid-body','collision-detection','real-time-3d'], source:'https://github.com/jrouwe/JoltPhysics' },
  drake: { engine:'drake', license:'BSD-3-Clause', capabilities:['multibody','optimization','robotics','contact','trajectory-analysis'], source:'https://drake.mit.edu/' },
  dart: { engine:'dart', license:'BSD-2-Clause', capabilities:['articulated-multibody','featherstone-aba','lcp-contact','robotics'], source:'https://dartsim.github.io/' }
});

/** Create an explicit remote-engine adapter. A real authenticated engine host is required. */
export function createExternalEngineBackend(profileId, { transport, version, timeoutMs=30000, capabilities } = {}) {
  const profile=PROFILES[profileId];
  if(!profile)throw new RangeError(`Unknown external engine profile: ${profileId}`);
  if(!transport)throw new TypeError(`A host transport is required for ${profile.engine}`);
  return createRemoteBackend({id:profileId,engine:profile.engine,version:version??'host-version-unreported',
    license:profile.license,capabilities:capabilities??profile.capabilities,transport,timeoutMs});
}
export const EXTERNAL_ENGINE_PROFILES=PROFILES;
