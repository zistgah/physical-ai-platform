/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/roles.js
 * FILE PURPOSE: Role registry. Registered roles, not arbitrary strings, for waivers and shutdown.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * WP-ROLES - Role model on Person
 *
 * Roles are semantic data carried by canonical Person entities. This overlay
 * deliberately does not introduce a relation or authority semantics.
 */

export const ROLES = Object.freeze([
  "Operator",
  "TestLead",
  "ComplianceLead",
  "ProjectAuthority",
  "Educator",
  "Researcher"
]);

const ROLE_SET = new Set(ROLES);

export class RoleModel {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) {
    if (!kernel) throw new Error("RoleModel requires a canonical kernel");
    this.kernel = kernel;
  }

  /**
   * Return true only when the canonical Person explicitly carries the role.
   * A role never implies AUTHORIZED_BY or any other relation.
   */
  hasRole(personId, role) {
    if (!ROLE_SET.has(role)) return false;
    const person = this.kernel.store.get(personId);
    return !!(person && person.type === "Person" && Array.isArray(person.roles) && person.roles.includes(role));
  }

  /**
   * Persist a role as data on the Person. Existing roles are preserved.
   */
  assignRole(personId, role) {
    if (!ROLE_SET.has(role)) throw new Error(`Unknown role: ${role}`);
    const person = this.kernel.store.get(personId);
    if (!person || person.type !== "Person") throw new Error(`Not a Person: ${personId}`);

    const roles = Array.isArray(person.roles) ? [...person.roles] : [];
    if (!roles.includes(role)) roles.push(role);
    roles.sort((a, b) => a.localeCompare(b));

    return this.kernel.upsert({
      ...person,
      roles,
      provenance: {
        ...person.provenance,
        origin: person.provenance?.origin || "package",
        derivedFrom: person.provenance?.derivedFrom ?? null,
        timestamp: this.kernel._now()
      }
    });
  }

  /**
   * Remove a role from the Person. No authority relation is created or removed.
   */
  removeRole(personId, role) {
    if (!ROLE_SET.has(role)) throw new Error(`Unknown role: ${role}`);
    const person = this.kernel.store.get(personId);
    if (!person || person.type !== "Person") throw new Error(`Not a Person: ${personId}`);
    const roles = (Array.isArray(person.roles) ? person.roles : []).filter(r => r !== role);
    return this.kernel.upsert({
      ...person,
      roles,
      provenance: {
        ...person.provenance,
        origin: person.provenance?.origin || "package",
        derivedFrom: person.provenance?.derivedFrom ?? null,
        timestamp: this.kernel._now()
      }
    });
  }

  /** rolesFor: Performs roles for for this module. */
  rolesFor(personId) {
    const person = this.kernel.store.get(personId);
    if (!person || person.type !== "Person") return [];
    return Array.isArray(person.roles) ? [...person.roles] : [];
  }
}
