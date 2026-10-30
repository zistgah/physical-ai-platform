/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/core/distributed.js
 * FILE PURPOSE: Distributed runtime. Nodes and mailboxes. A down node cannot run a job. This is an in-process scheduler, not a cluster.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Distributed runtime – Iteration 17
 * Nodes, mailbox, schedule. A down node cannot run a job.
 */
export class DistributedRuntime {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor() { this.nodes = new Map(); this.results = []; }

  /** node: Performs node for this module. */
  node(id, { up = true } = {}) { this.nodes.set(id, { id, up, mailbox: [] }); return this.nodes.get(id); }

  /** submit: Queues a job on a node. A missing or down node holds. */
  submit(nodeId, job) {
    const node = this.nodes.get(nodeId);
    if (!node) return { outcome: "HOLD", reason: "Node is UNSPECIFIED" };
    if (!node.up) return { outcome: "HOLD", reason: `Node ${nodeId} is down` };
    node.mailbox.push(job);
    return { outcome: "QUEUED", nodeId, job: job.id };
  }

  /** tick: Runs queued jobs on up nodes. */
  tick() {
    const done = [];
    for (const node of this.nodes.values()) {
      if (!node.up) continue;
      while (node.mailbox.length) {
        const job = node.mailbox.shift();
        const value = job.fn();
        done.push({ nodeId: node.id, jobId: job.id, value });
      }
    }
    this.results.push(...done);
    return done;
  }
}
