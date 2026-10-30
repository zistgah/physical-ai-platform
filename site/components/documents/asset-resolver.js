/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/documents/asset-resolver.js
 * FILE PURPOSE: asset resolver. Document system. Reads from the kernel. Does not create a second ontology.
 * License: GPL-3.0-only.
 */
/**
 * Evidence-first asset resolver. It never fabricates an image.
 */
const FIDELITY = ["CONCEPTUAL","FUNCTIONAL_MODEL","KINEMATIC_MODEL","DYNAMIC_MODEL","PHYSICS_MODEL","SIL","HIL","PHIL","PHYSICAL_TEST","FIELD_VALIDATION"];
export class AssetResolver {
  constructor(kernel) { this.kernel = kernel; }

  candidates(projectId, purpose) {
    const graph = this.kernel.getProjectGraph(projectId);
    return graph.entities.filter(e => ["Artifact","Evidence","Asset"].includes(e.type) &&
      (!purpose || e.purpose === purpose || e.kind === purpose || e.assetType === purpose));
  }

  resolve(projectId, {purpose, configurationId, minimumFidelity = "CONCEPTUAL"} = {}) {
    const min = FIDELITY.indexOf(minimumFidelity);
    const candidates = this.candidates(projectId,purpose).filter(a => {
      if (configurationId && a.configurationId !== configurationId) return false;
      const level = FIDELITY.indexOf(a.fidelity || a.levelName || "CONCEPTUAL");
      return level >= min && a.uri && a.caption && a.altText && a.provenance;
    }).sort((a,b)=>FIDELITY.indexOf(b.fidelity || b.levelName)-FIDELITY.indexOf(a.fidelity || a.levelName));
    if (!candidates.length) return {outcome:"MISSING",reason:"No provenance-bearing asset satisfies the requested purpose/configuration/fidelity"};
    const asset=candidates[0];
    if (["HIL","PHIL"].includes(asset.fidelity) &&
        !(asset.deviceId && asset.transportId && asset.hardwareIoLog)) {
      return {outcome:"HOLD",reason:"HIL/PHIL asset lacks physical I/O provenance"};
    }
    return {outcome:"OK",asset,alternatives:candidates.slice(1).map(x=>x.id)};
  }
}

/** Editable SVG architecture view generated from canonical graph entities. */
export function architectureSvg(projectGraph) {
  const entities=(projectGraph?.entities || []).filter(e=>["System","Subsystem","Component"].includes(e.type));
  const width=900, row=92, height=Math.max(160,entities.length*row+40);
  const nodes=entities.map((e,i)=>{
    const x=40+(i%3)*280, y=25+Math.floor(i/3)*row;
    const label=String(e.name || e.id).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    return `<g><rect x="${x}" y="${y}" width="240" height="58" rx="8" fill="#f4f6f8" stroke="#52606d"/><text x="${x+12}" y="${y+24}" font-size="13" fill="#17212b">${e.type}</text><text x="${x+12}" y="${y+43}" font-size="12" fill="#17212b">${label}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Canonical system graph view</title>${nodes}</svg>`;
}
