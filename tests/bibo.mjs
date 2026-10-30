/**
 * BIBO harness.
 * Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
 * AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
 *
 * Every function under test is characterized at four points:
 *   below  – just outside the lower boundary
 *   on     – exactly on the boundary (where discontinuities hide)
 *   within – a sample inside the accepted range
 *   above  – just outside the upper boundary
 *
 * A non-linear function also gets a sweep across its range.
 */
export function bibo(name, cases) {
  const required = ["below", "on", "within", "above"];
  for (const point of required) {
    if (!cases[point]) throw new Error(name + " has no " + point + " case");
    const c = cases[point];
    const got = c.fn();
    const ok = c.expect(got);
    if (!ok) throw new Error(name + " failed at " + point + ": " + JSON.stringify(got));
    console.log("PASS BIBO " + name + " " + point);
  }
  if (cases.sweep) {
    for (const step of cases.sweep) {
      const got = step.fn();
      if (!step.expect(got)) throw new Error(name + " failed sweep: " + JSON.stringify(got));
    }
    console.log("PASS BIBO " + name + " sweep");
  }
}
