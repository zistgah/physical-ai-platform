/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
import { createBackendRegistry, createRemoteBackend } from './registry.js';
import { simStep } from '../module.js';
import { createRapier2DBackend } from './rapier2d.js';
import { createExternalEngineBackend, EXTERNAL_ENGINE_PROFILES } from './profiles.js';
import { createRapier2DSession } from './rapier2d-session.js';
import { createRapierSimulationComponent } from '../platform-rapier-adapter.js';

/** Create an isolated registry. Remote backends are opt-in and require an explicit host transport. */
export function createSimulationBackends({ includeRapier = true, rapierModuleLoader, remote = [] } = {}) {
  const registry = createBackendRegistry();
  registry.register({ id:'native-disc', version:'2.0.0', adapterVersion:'1.0.0', license:'GPL-3.0',
    capabilities:['2d-rigid-disc','contact','gravity','friction','restitution','deterministic-reference'],
    run:async input=>simStep(input) });
  if (includeRapier) registry.register(createRapier2DBackend({ moduleLoader: rapierModuleLoader }));
  for (const spec of remote) {
    if (spec.profile) { const { profile, ...config } = spec; registry.register(createExternalEngineBackend(profile, config)); }
    else registry.register(createRemoteBackend(spec));
  }
  return registry;
}

export { createBackendRegistry, createRemoteBackend, createRapier2DBackend, createRapier2DSession, createRapierSimulationComponent, createExternalEngineBackend, EXTERNAL_ENGINE_PROFILES };
