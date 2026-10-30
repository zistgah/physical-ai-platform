/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/education/board-correlation.js
 * FILE PURPOSE: Board correlation. Maps a board topic to a concept. A lesson holds if the learner is not enrolled.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Education span and board correlation – Iteration 20
 * Depth follows the band. A board topic without a mapping HOLDs.
 */
export const BANDS = ["preschool", "primary", "middle", "secondary", "undergraduate", "masters", "phd", "postdoc"];

const DEPTH = {
  preschool: "observe",
  primary: "describe",
  middle: "invent",
  secondary: "analyse",
  undergraduate: "design",
  masters: "research",
  phd: "defend",
  postdoc: "define"
};

export class BoardCorrelation {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; this.map = new Map(); }

  /** correlate: Performs correlate for this module. */
  correlate(board, topic, conceptId) {
    if (!board || !topic || !conceptId) return { outcome: "HOLD", reason: "Correlation inputs are UNSPECIFIED" };
    this.map.set(`${board}:${topic}`, conceptId);
    return { outcome: "OK", board, topic, conceptId };
  }

  /** lookup: Performs lookup for this module. */
  lookup(board, topic) {
    const conceptId = this.map.get(`${board}:${topic}`);
    if (!conceptId) return { outcome: "HOLD", reason: `No mapping for ${board}:${topic}` };
    return { outcome: "OK", conceptId };
  }

  /** path: Performs path for this module. */
  path(projectId, band) {
    if (!BANDS.includes(band)) return { outcome: "HOLD", reason: "Band is UNSPECIFIED" };
    const id = `path_${band}`;
    const path = this.kernel.upsert({
      id, type: "Curriculum", name: `${band} path`, band, depth: DEPTH[band],
      certifies: band === "phd" || band === "postdoc",
      provenance: { origin: "education", derivedFrom: projectId }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return path;
  }
}
