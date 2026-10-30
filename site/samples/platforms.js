/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/samples/platforms.js
 * FILE PURPOSE: Sample platforms. Each is a project on the graph with mass, joints, actuators, sensors, and edge cases as entities. Parameters are the values given. Nothing is estimated.
 * License: GPL-3.0-only.
 */
const COPYRIGHT = "Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.";

function project(kernel, id, name, mass) {
  return kernel.upsert({
    id, type: "Project", name, mass,
    copyright: COPYRIGHT, license: "GPL-3.0-only",
    provenance: { origin: "sample", derivedFrom: id }
  });
}

function part(kernel, projectId, id, props) {
  const entity = kernel.upsert({
    id, type: "Component", ...props,
    copyright: COPYRIGHT,
    provenance: { origin: "sample", derivedFrom: projectId }
  });
  kernel.link(projectId, "CONTAINS", entity.id);
  return entity;
}

function scenario(kernel, projectId, id, name, params) {
  const entity = kernel.upsert({
    ...params, id, type: "Event", name,
    copyright: COPYRIGHT,
    provenance: { origin: "sample", derivedFrom: projectId }
  });
  kernel.link(projectId, "CONTAINS", entity.id);
  return entity;
}

export function humanoid(kernel) {
  const p = project(kernel, "sample-humanoid", "Humanoid", 75.0);
  part(kernel, p.id, "torso", { name: "Torso", mass: 20, comOffset: 0.15 });
  part(kernel, p.id, "arm-l", { name: "Left Arm", mass: 4.2, dof: 7 });
  part(kernel, p.id, "arm-r", { name: "Right Arm", mass: 4.2, dof: 7 });
  part(kernel, p.id, "leg-l", { name: "Left Leg", mass: 11.5, dof: 6, peakTorque: 320, stallTorque: 120 });
  part(kernel, p.id, "leg-r", { name: "Right Leg", mass: 11.5, dof: 6, peakTorque: 320, stallTorque: 120 });
  part(kernel, p.id, "neck", { name: "Neck", dof: 3 });
  part(kernel, p.id, "hands", { name: "Hands", grippers: 10, peakTorque: 45 });
  part(kernel, p.id, "imu", { name: "Dual IMU", noiseVariance: 0.005 });
  scenario(kernel, p.id, "impact", "Torso impact", { force: 450, durationMs: 80 });
  scenario(kernel, p.id, "step-down", "Terrain step", { height: -0.08 });
  scenario(kernel, p.id, "packet-loss", "Packet drop", { consecutive: 4, periodMs: 1 });
  return p;
}

export function mecanum(kernel) {
  const p = project(kernel, "sample-mecanum", "Mecanum Platform", 45.0);
  part(kernel, p.id, "chassis", { name: "Chassis", length: 0.8, width: 0.6, height: 0.3 });
  part(kernel, p.id, "wheels", { name: "Mecanum Wheels", count: 4, radius: 0.10, track: 0.50, wheelbase: 0.55, peakTorque: 65, maxSpeed: 45 });
  scenario(kernel, p.id, "low-friction", "Low friction", { muFrom: 0.85, muTo: 0.12 });
  scenario(kernel, p.id, "asymmetric", "Asymmetric load", { comShift: 0.18 });
  return p;
}

export function submarine(kernel) {
  const p = project(kernel, "sample-auv", "Autonomous Underwater Vehicle", 32.0);
  part(kernel, p.id, "hull", { name: "Hull", buoyancy: 31.8, cdAxial: 0.32, cdLateral: 0.85 });
  part(kernel, p.id, "thrusters", { name: "Vectored Thrusters", count: 8, thrustMin: -80, thrustMax: 120 });
  part(kernel, p.id, "depth", { name: "Depth Sensor", maxDepth: 100 });
  scenario(kernel, p.id, "thermocline", "Thermocline", { rhoFrom: 1000, rhoTo: 1028 });
  scenario(kernel, p.id, "fouling", "Thruster fouling", { thruster: "rear-left", output: 0 });
  return p;
}

export function drone(kernel) {
  const p = project(kernel, "sample-drone", "Multirotor", 1.8);
  part(kernel, p.id, "frame", { name: "Frame", diagonal: 0.35 });
  part(kernel, p.id, "motors", { name: "Rotors", count: 4, thrustEach: 18.0, thrustToWeight: 4 });
  part(kernel, p.id, "imu-drone", { name: "IMU", rateHz: 2000 });
  scenario(kernel, p.id, "vrs", "Vortex ring", { descentRate: 6.5 });
  scenario(kernel, p.id, "microburst", "Microburst", { wind: 18.0, durationMs: 400 });
  return p;
}

export function fixedWing(kernel) {
  const p = project(kernel, "sample-fixed-wing", "Fixed Wing", 6.5);
  part(kernel, p.id, "wing", { name: "Wing", area: 0.78 });
  part(kernel, p.id, "surfaces", { name: "Control Surfaces", count: 4, maxDeflection: 28, transitS: 0.11 });
  scenario(kernel, p.id, "stall", "Stall", { alpha: 16.5, liftDrop: 0.65 });
  scenario(kernel, p.id, "flutter", "Flutter", { airspeed: 34.0 });
  return p;
}

export function helicopter(kernel) {
  const p = project(kernel, "sample-helicopter", "Helicopter", 12.0);
  part(kernel, p.id, "rotor", { name: "Main Rotor", diameter: 1.4, rpm: 1500 });
  part(kernel, p.id, "swash", { name: "Swashplate", pitchMin: -5, pitchMax: 15 });
  scenario(kernel, p.id, "lte", "Loss of tail rotor", { crosswind: 12 });
  scenario(kernel, p.id, "autorotation", "Autorotation", { engine: "failed" });
  return p;
}

export function spacecraft(kernel) {
  const p = project(kernel, "sample-spacecraft", "Spacecraft", 250.0);
  part(kernel, p.id, "rwa", { name: "Reaction Wheels", count: 4, capacity: 15.0 });
  part(kernel, p.id, "rcs", { name: "Reaction Control", count: 12, thrust: 0.5 });
  scenario(kernel, p.id, "saturation", "Wheel saturation", { limit: 15.0 });
  scenario(kernel, p.id, "tumble", "Tumble recovery", { rateDegS: 90 });
  return p;
}

export function manipulator(kernel) {
  const p = project(kernel, "sample-manipulator", "Six Axis Manipulator", 280.0);
  part(kernel, p.id, "base", { name: "Base", payload: 16.0, precisionMm: 0.02 });
  part(kernel, p.id, "joints", { name: "Joints", dof: 6, j1Speed: 2.1, j2Speed: 2.1 });
  scenario(kernel, p.id, "singularity", "Singularity path", { type: "wrist" });
  scenario(kernel, p.id, "estop", "Emergency stop", { payload: 16.0, velocity: 1.0 });
  return p;
}

export function conveyor(kernel) {
  const p = project(kernel, "sample-conveyor", "Conveyor Line", 0);
  part(kernel, p.id, "line", { name: "Roller Line", partsPerMinute: 60, rampS: 0.5 });
  scenario(kernel, p.id, "jam", "Accumulation jam", { thresholdS: 2.5 });
  scenario(kernel, p.id, "weight", "Weight discrepancy", { expected: 2.0, actual: 1.4 });
  return p;
}

export function orchestration(kernel) {
  const p = project(kernel, "sample-orchestration", "Plant Orchestration", 0);
  part(kernel, p.id, "cells", { name: "Work Cells", count: 12 });
  part(kernel, p.id, "mainlines", { name: "Mainlines", count: 4 });
  part(kernel, p.id, "sorting", { name: "Sorting Fields", count: 2 });
  scenario(kernel, p.id, "interlock", "Safety interlock", { responseMs: 20 });
  scenario(kernel, p.id, "cascade", "Node disconnection", { dropped: 3 });
  return p;
}

export function differential(kernel) {
  const p = project(kernel, "sample-2wd", "Differential Drive", 2.5);
  part(kernel, p.id, "drive", { name: "Drive", wheelRadius: 0.04, track: 0.22, peakTorque: 4.5, maxSpeed: 15 });
  scenario(kernel, p.id, "caster-jam", "Caster jam", { resistance: 0.35 });
  scenario(kernel, p.id, "blind", "Blind path", { length: 5.0, encoderRate: 0.5 });
  return p;
}

export const PLATFORMS = [
  humanoid, mecanum, submarine, drone, fixedWing,
  helicopter, spacecraft, manipulator, conveyor, orchestration, differential
];
