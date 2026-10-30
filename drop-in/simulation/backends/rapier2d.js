/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. */
/** Optional official Rapier 2D WASM adapter. No silent fallback if unavailable. */
const HOLD = (reason, details = {}) => ({ outcome: 'HOLD', reason, ...details });
const finite = Number.isFinite;

export function createRapier2DBackend({ moduleLoader = () => import('@dimforge/rapier2d-compat') } = {}) {
  if (typeof moduleLoader !== 'function') throw new TypeError('moduleLoader must be a function');
  return {
    id: 'rapier2d', version: 'runtime-detected', adapterVersion: '1.0.0',
    license: 'Apache-2.0',
    capabilities: ['2d-rigid-body', 'circle-collision', 'contact-friction', 'restitution', 'fixed-step', 'wasm'],
    async run(input = {}) {
      const { bodies, dt, steps = 1, gravity = { x: 0, y: -9.81 }, floor = 0,
        solverIterations = 16, recordHistory = true } = input;
      if (!Array.isArray(bodies) || bodies.length === 0) return HOLD('Bodies are UNSPECIFIED');
      if (!finite(dt) || dt <= 0 || dt > 1 || !Number.isInteger(steps) || steps < 1 || steps > 10000)
        return HOLD('Invalid dt or steps');
      if (!gravity || !finite(gravity.x) || !finite(gravity.y)) return HOLD('Gravity requires finite x and y');
      if (floor !== null && !finite(floor)) return HOLD('Floor must be finite or null');
      if (!Number.isInteger(solverIterations) || solverIterations < 1 || solverIterations > 100)
        return HOLD('solverIterations must be in [1, 100]');
      if (bodies.length > 256 || (recordHistory && steps > 10000)) return HOLD('Resource limit exceeded');
      const ids = new Set();
      for (const b of bodies) {
        if (!b || typeof b.id !== 'string' || !b.id || ids.has(b.id)) return HOLD('Body IDs must be unique non-empty strings');
        ids.add(b.id);
        for (const k of ['x','y','vx','vy','mass','radius']) if (!finite(b[k])) return HOLD(`Body ${b.id} requires finite ${k}`);
        if (b.mass < 0 || b.radius <= 0) return HOLD(`Body ${b.id} has invalid mass or radius`);
        if ((b.restitution ?? 0) < 0 || (b.restitution ?? 0) > 1 || (b.friction ?? 0.5) < 0) return HOLD(`Body ${b.id} has invalid contact properties`);
        for (const k of ['fx','fy','torque','angle','omega']) if (b[k] !== undefined && !finite(b[k])) return HOLD(`Body ${b.id} has invalid ${k}`);
      }
      let RAPIER, world, eventQueue;
      try {
        const imported = await moduleLoader();
        RAPIER = imported.default ?? imported;
        if (typeof RAPIER.init === 'function') await RAPIER.init();
        if (typeof RAPIER.World !== 'function' || !RAPIER.RigidBodyDesc || !RAPIER.ColliderDesc)
          return HOLD('Installed Rapier package does not expose the expected 2D API');
        world = new RAPIER.World(gravity);
        if (world.integrationParameters) world.integrationParameters.numSolverIterations = solverIterations;
        eventQueue = typeof RAPIER.EventQueue === 'function' ? new RAPIER.EventQueue(true) : null;
        const handles = new Map();
        for (const b of [...bodies].sort((a, c) => a.id < c.id ? -1 : a.id > c.id ? 1 : 0)) {
          const fixed = b.static === true || b.mass === 0;
          let desc = fixed ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
          desc = desc.setTranslation(b.x, b.y).setRotation(b.angle ?? 0);
          if (!fixed) desc = desc.setLinvel(b.vx, b.vy).setAngvel(b.omega ?? 0);
          const rb = world.createRigidBody(desc);
          let collider = RAPIER.ColliderDesc.ball(b.radius)
            .setRestitution(b.restitution ?? 0).setFriction(b.friction ?? 0.5);
          if (RAPIER.ActiveEvents?.COLLISION_EVENTS !== undefined && typeof collider.setActiveEvents === 'function')
            collider = collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
          if (!fixed) collider = collider.setDensity(b.mass / (Math.PI * b.radius * b.radius));
          world.createCollider(collider, rb);
          handles.set(b.id, rb);
        }
        if (floor !== null) {
          const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, floor - 0.05));
          world.createCollider(RAPIER.ColliderDesc.cuboid(1e5, 0.05), ground);
        }
        const history = []; let collisionStarts = 0;
        const frames = [];
        for (let step = 0; step < steps; step++) {
          for (const b of bodies) {
            if (b.static === true || b.mass === 0) continue;
            const rb = handles.get(b.id);
            if ((b.fx ?? 0) || (b.fy ?? 0)) rb.addForce({ x: b.fx ?? 0, y: b.fy ?? 0 }, true);
            if (b.torque) rb.addTorque(b.torque, true);
          }
          world.timestep = dt;
          world.step(eventQueue ?? undefined);
          if (eventQueue) eventQueue.drainCollisionEvents((_a, _b, started) => { if (started) collisionStarts++; });
          const frame = [...handles.entries()].sort((a,c)=>a[0]<c[0]?-1:a[0]>c[0]?1:0).map(([id, rb]) => {
            const p = rb.translation(), v = rb.linvel();
            return { id, x:p.x, y:p.y, vx:v.x, vy:v.y, angle:rb.rotation(), omega:rb.angvel() };
          });
          if (!frame.every(b => ['x','y','vx','vy','angle','omega'].every(k => finite(b[k]))))
            return HOLD('Rapier produced a non-finite state', { step: step + 1 });
          frames.push(frame);
          if (recordHistory) history.push({ step: step + 1, time: Number(((step + 1) * dt).toFixed(12)), bodies: frame });
        }
        const state = frames.at(-1);
        const byId = new Map(bodies.map(b => [b.id, b]));
        const resultBodies = state.map(s => ({ ...s, mass:byId.get(s.id).mass, radius:byId.get(s.id).radius,
          static:byId.get(s.id).static === true || byId.get(s.id).mass === 0 }));
        const engineVersion = typeof RAPIER.version === 'function' ? RAPIER.version() : 'package-version-not-exposed';
        return { outcome:'OK', algorithmVersion:'backend-adapter-1.0.0', method:'RAPIER_2D_WASM', fidelity:'L3_PLANAR_RIGID_BODY_RAPIER',
          time:Number((steps*dt).toFixed(12)), steps, bodies:resultBodies, history,
          diagnostics:{ backend:'rapier2d', engineVersion, contactStartEvents:collisionStarts,
            solverIterations, timestep:dt, substeps:steps, nativeEngineOwnsContactSolver:true,
            limitations:['Rapier 2D disc backend only','No mesh/3D/articulated/FEM/CFD in this adapter','Rapier engine version and build must be pinned by integrator'] },
          verification:{ status:'SIMULATED', physicalVerification:false } };
      } catch (error) {
        if (error?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find package/.test(error?.message ?? ''))
          return HOLD('Rapier optional dependency is not installed; install @dimforge/rapier2d-compat explicitly', { backend:'rapier2d' });
        return HOLD(`Rapier backend failed: ${error?.message ?? String(error)}`, { backend:'rapier2d', errorType:error?.name ?? 'Error' });
      } finally {
        try { eventQueue?.free?.(); } catch {}
        try { world?.free?.(); } catch {}
      }
    }
  };
}
