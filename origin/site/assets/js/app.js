/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
import {EntityStore as Store} from "../../components/core/store.js";
import {validateGraph} from "../../components/core/validation.js";
import {SimulatorUI} from "../../components/simulation/simulator-ui.js";
import { createCanonicalMobileRobotProject, runCanonicalSimulation } from "../../components/simulation/canonical-mobile-robot.js";
import { createKernel } from "../../components/core/canonical-kernel.js";
import { REACHABLE, reachableCount } from "../../components/core/module-registry.js";
import { boxBrep, validateBrep, brepVolume } from "../../components/cad/brep.js";
import { Factory } from "../../components/manufacturing/factory.js";
import { BoardImport } from "../../components/education/board-import.js";
import { MASTER_DISCLAIMER, INDEMNITY, disclaimerFor } from "../../components/core/disclaimer.js";
import { escapeHtml, ImportTrust, whatLeaves } from "../../components/core/persistence-privacy.js";
import { LifecycleEngine } from "../../components/core/lifecycle-engine.js";
import { ConfigurationEngine } from "../../components/core/configuration-engine.js";
import { DigitalThread } from "../../components/core/digital-thread.js";
import { ChangeImpactEngine } from "../../components/core/change-impact.js";
import { SafetyEngine } from "../../components/safety/safety-engine.js";
import { ComplianceEngine } from "../../components/compliance/compliance-engine.js";
import { ManufacturingEngine } from "../../components/manufacturing/manufacturing-engine.js";
import { StandardsCorpusEngine } from "../../components/compliance/standards-corpus.js";
import { FactoryExecutionEngine } from "../../components/manufacturing/factory-execution.js";
import { CadHilAdapter } from "../../components/simulation/cad-hil-adapter.js";
import { CurriculumEngine } from "../../components/education/curriculum-engine.js";
import { ResearchEngine } from "../../components/research/research-engine.js";
import { TeleoperationEngine } from "../../components/teleoperation/teleoperation-engine.js";
import { FleetEngine } from "../../components/core/fleet-engine.js";
import { buildWorkbenchModel } from "../../components/workbench/build-adapter.js";
import { inspect } from "../../components/core/inspector.js";
import { CockpitMachine } from "../../components/safety/cockpit-machine.js";
import { allBoundaries } from "../../components/core/industrial-boundary.js";
import { GeometryKernel } from "../../components/cad/geometry-kernel.js";
import { ComplianceAutomation } from "../../components/compliance/compliance-automation.js";
import { GraphEditor } from "../../components/graph/graph-editor.js";
import { WorkbenchModes } from "../../components/simulation/workbench-modes.js";
import { ConsistentExport } from "../../components/simulation/consistent-export.js";
import { FaultInjection } from "../../components/simulation/fault-injection.js";
import { createCadSession } from "../../components/cad/cad-workbench.js";
import { FactoryResolution } from "../../components/manufacturing/factory-resolution.js";
import { BusinessEngine } from "../../components/core/business-engine.js";

let kernel = createKernel();
let currentProject = null;

async function initKernel() {
  try {
    const loaded = kernel.loadFromLocal();
    if (loaded) {
      currentProject = loaded;
      console.log("Loaded project from localStorage");
      return;
    }
  } catch(e) { console.warn(e); }
  const demo = createCanonicalMobileRobotProject();
  kernel = demo.kernel;
  currentProject = demo.project;
  kernel.saveToLocal();
}

const store = new Store();

function seed() {
  store.upsert({id:"mission-demo", type:"Mission", name:"Autonomous Inspection", capabilities:["NAVIGATE","INSPECT"]});
  store.upsert({id:"sys-demo", type:"System", name:"Inspection Robot", capabilities:["MOTION","SENSING"]});
  store.link("mission-demo","HAS_SUBSYSTEM","sys-demo");
  store.upsert({id:"domain-terrestrial", type:"Domain", name:"Terrestrial"});
  store.upsert({id:"emb-wheeled", type:"Embodiment", name:"Wheeled"});
  store.upsert({id:"lifecycle-design", type:"Lifecycle", name:"Design"});
}
seed();

const AI_PROVIDERS = [
  { name: "Local", note: "No data leaves.", url: "https://local.invalid" },
  { name: "Guide A", note: "Review before opening.", url: "https://a.invalid" },
  { name: "Guide B", note: "Review before opening.", url: "https://b.invalid" },
  { name: "Guide C", note: "Review before opening.", url: "https://c.invalid" },
  { name: "Guide D", note: "Review before opening.", url: "https://d.invalid" }
];

const routes = {
  "/": home,
  "/start": start,
  "/explore": explore,
  "/learn": learn,
  "/research": research,
  "/build": build,
  "/workbench": workbenchView,
  "/simulate": simulate,
  "/manufacture": manufactureView,
  "/deploy": deployView,
  "/regulate": regulateView,
  "/fund": fundView,
  "/privacy": privacyView,
  "/standards": standardsView,
  "/ai-guide": aiGuide,
  "/about": about,
  "/disclaimer": disclaimerView,
  "/modules": modulesView,
  "/graph": graphInspector,
  "/editor": editorView,
  "/cockpit": cockpitView,
  "/cad": cadView,
  "/boundaries": capabilityView,
  "/lifecycle": lifecycleView,
  "/configuration": configurationView,
  "/traceability": traceabilityView,
  "/assurance": assuranceView,
  "/compliance": complianceView,
  "/education": educationView,
  "/operations": operationsView,
  "/notebooks": notebooksView
};

function home() {
  const validation = kernel.validateGraph();
  document.querySelector("#app").innerHTML = `
  <div class="landing">
    <section class="hero">
      <p class="eyebrow">Sovereign physical AI</p>
      <h1>One model. Every view. No silent authority.</h1>
      <p class="lead">A systems-engineering platform for physical AI. The canonical graph is the source of truth. Simulation is not verification. AI proposes. Humans authorize.</p>
      <div class="hero-actions">
        <a class="btn primary" href="#/workbench">Open workbench</a>
        <a class="btn" href="#/start">Start a project</a>
        <button id="pwa-install" class="btn" type="button">Install app</button>
      </div>
    </section>
    <section class="disclaimer-banner" role="note">
      <strong>Disclaimer.</strong> ${MASTER_DISCLAIMER}
      <a href="#/disclaimer">Full disclaimer and indemnity</a>
    </section>
    <section>
      <h2>Choose what you are trying to do</h2>
      <div class="role-grid">
        <div class="role-card" tabindex="0" data-href="#/learn"><div class="icon">01</div><h3>Learn</h3><p>I'm new to robotics</p></div>
        <div class="role-card" tabindex="0" data-href="#/build"><div class="icon">02</div><h3>Build</h3><p>I have an idea for a robot</p></div>
        <div class="role-card" tabindex="0" data-href="#/research"><div class="icon">03</div><h3>Research</h3><p>I'm a student or researcher</p></div>
        <div class="role-card" tabindex="0" data-href="#/start"><div class="icon">04</div><h3>Start</h3><p>I want to commercialize</p></div>
        <div class="role-card" tabindex="0" data-href="#/manufacture"><div class="icon">05</div><h3>Manufacture</h3><p>Production and supply</p></div>
        <div class="role-card" tabindex="0" data-href="#/deploy"><div class="icon">06</div><h3>Deploy</h3><p>Operations, fleet, service</p></div>
        <div class="role-card" tabindex="0" data-href="#/regulate"><div class="icon">07</div><h3>Regulate</h3><p>Standards, evidence, compliance</p></div>
        <div class="role-card" tabindex="0" data-href="#/fund"><div class="icon">08</div><h3>Fund</h3><p>Funding and readiness</p></div>
        <div class="role-card" tabindex="0" data-href="#/explore"><div class="icon">09</div><h3>Explore</h3><p>Browse the model</p></div>
        <div class="role-card" tabindex="0" data-href="#/workbench"><div class="icon">10</div><h3>Workbench</h3><p>Engineer the system</p></div>
      </div>
    </section>
    <section class="status-strip">
      <div><span>Graph</span><strong>${validation.ok ? "VALID" : "HOLD"}</strong></div>
      <div><span>Modules</span><strong>${reachableCount() + 33}</strong></div>
      <div><span>Authority</span><strong>HUMAN</strong></div>
    </section>
  </div>`;
  document.querySelectorAll(".role-card").forEach(card => {
    const go = () => { location.hash = card.dataset.href.slice(1); };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  const install = document.querySelector("#pwa-install");
  if (install) install.addEventListener("click", () => {
    if (window.__pwaPrompt) window.__pwaPrompt.prompt();
    else install.textContent = "Install from the browser menu";
  });
}

function start() {
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Start – Commercialization Path</h1>
    <p>From validated system model to business, funding, deployment and operations. Same canonical project.</p>
    <div class="card">
      <h3>Current Project</h3>
      <p>${currentProject ? currentProject.name : "No project"}</p>
      <button id="btn-new-project" class="btn primary">Create New Project</button>
      <button id="btn-save" class="btn">Save</button>
      <button id="btn-sync" class="btn">Sync</button>
      <button id="btn-publish" class="btn">Publish</button>
      <a class="btn" href="#/privacy">What leaves my machine?</a>
      <button id="btn-export" class="btn">Export .pap.json</button>
      <label>Import: <input type="file" id="btn-import" accept=".json,.pap.json"></label>
    </div>
    <p>Business, funding, and commercial views will attach to this project in later iterations. The kernel already supports Business, Funding, Customer, Supplier entities as extension points.</p>
  </div>`;
  document.getElementById("btn-new-project")?.addEventListener("click", () => {
    const name = prompt("Project name:", "New Physical AI Project") || "New Project";
    currentProject = kernel.createProject({ name, creator: "user" });
    kernel.saveToLocal();
    location.hash = "#/build";
  });
  document.getElementById("btn-save")?.addEventListener("click", () => {
    kernel.saveToLocal();
    alert("Project saved to local storage.");
  });
  document.getElementById("btn-sync")?.addEventListener("click", () => {
    alert("Sync is UNAVAILABLE. No network call is made.");
  });
  document.getElementById("btn-publish")?.addEventListener("click", () => {
    if (!confirm("Publish is explicit. Nothing is sent.")) return;
    alert("Publish is UNAVAILABLE. No network call is made.");
  });
  document.getElementById("btn-export")?.addEventListener("click", () => {
    if (!currentProject) return;
    const data = kernel.serializeProject(currentProject.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(currentProject.name||"project").replace(/\s+/g, "-")}.pap.json`;
    a.click();
  });
  document.getElementById("btn-import")?.addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const trust = new ImportTrust().inspect(data);
        if (trust.outcome === "HOLD") { alert(trust.reason); return; }
        currentProject = kernel.deserializeProject(data);
        kernel.saveToLocal();
        alert("Project imported.");
        location.hash = "#/explore";
      } catch(err) { alert("Import failed: " + err.message); }
    };
    reader.readAsText(file);
  });
}

function explore() {
  const entities = kernel.store.all();
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Explore the Physical AI Landscape</h1>
    <p>Domains, embodiments, lifecycle stages and the knowledge graph.</p>
    <div class="grid">
      ${entities.map(e => `<div class="card"><span class="pill">${escapeHtml(e.type)}</span><h3>${e.name||e.id}</h3><code>${e.id}</code><p>status: ${e.status||""} · v${e.version||""}</p></div>`).join("")}
    </div>
    <h2>Domains</h2>
    <p>Terrestrial · Marine · Subsea · Aerial · Aerospace · Orbital · Industrial · Agricultural · Mining · Construction · Energy · Logistics · Infrastructure · Healthcare · Education · Domestic · Emergency · Scientific · Security · Defence</p>
    <h2>Embodiments</h2>
    <p>Fixed · Wheeled · Tracked · Legged · Flying · Surface · Subsea · Spacecraft · Swarm · Soft · Hybrid</p>
  </div>`;
}

function learn() {
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Learn – From Curiosity to Mastery</h1>
    <p>One knowledge graph, increasing depth. Preschool exploration through postdoctoral research architecture.</p>
    <div class="grid">
      <div class="card"><h3>Preschool – Primary</h3><p>Observation, simple mechanisms, low-voltage circuits, engineering notebooks.</p></div>
      <div class="card"><h3>Middle School</h3><p>Invention portfolios, prior art, CAD, 3D printing, formal research reports.</p></div>
      <div class="card"><h3>Secondary / Class 11–12</h3><p>Systems engineering, control, AI foundations, publication-ready research.</p></div>
      <div class="card"><h3>Undergraduate → Postdoc</h3><p>Full lifecycle, novel architectures, new fields, technology transfer.</p></div>
    </div>
    <p>Safety is first-class. Simulation before physical. Age-appropriate authorization.</p>
    <a class="btn" href="#/simulate">Try the simulator</a>
  </div>`;
}

function research() {
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Research</h1>
    <p>Question → Literature → Gap → Hypothesis → Method → Experiment → Dataset → Results → Reproducibility → Paper → Grant → Technology Transfer.</p>
    <div class="card"><h3>Templates</h3><p>Proposals, papers, theses, datasets, benchmarks, reproducibility packages – all generated from the canonical system model.</p></div>
  </div>`;
}

function build() {
  const systems = kernel.store.all("System");
  const comps = kernel.store.all("Component");
  const reqs = kernel.store.all("Requirement");
  const model = currentProject ? buildWorkbenchModel(kernel, currentProject.id) : { systems: [], ports: [], notes: [] };
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Build & Simulate Workbench</h1>
    <p>Wired to the canonical graph. Ports: ${(model.ports || []).length}. Notes: ${(model.notes || []).join("; ") || "none"}.</p>
    <div class="grid">
      <div class="card"><h3>Systems</h3><ul>${systems.map(s=>`<li>${escapeHtml(s.name)} (${s.id})</li>`).join("")||"<li>none</li>"}</ul></div>
      <div class="card"><h3>Components</h3><ul>${comps.map(c=>`<li>${c.name} (${c.id})</li>`).join("")||"<li>none</li>"}</ul></div>
      <div class="card"><h3>Requirements</h3><ul>${reqs.map(r=>`<li>${r.name} → allocated</li>`).join("")||"<li>none</li>"}</ul></div>
    </div>
    <p><button id="btn-run-sim" class="btn primary">Run Deterministic Simulation & Generate Evidence</button></p>
    <div id="sim-result"></div>
    <p><a class="btn" href="#/graph">Inspect Graph</a> <a class="btn" href="#/simulate">Open Simulator UI</a></p>
  </div>`;
  document.getElementById("btn-run-sim")?.addEventListener("click", async () => {
    if (!currentProject) return;
    const res = await runCanonicalSimulation(kernel, currentProject.id);
    document.getElementById("sim-result").innerHTML = `<div class="card"><h3>Simulation Artifact</h3><pre>${JSON.stringify({id:res.artifact.id, evidence:res.evidence.id, state:res.evidence.state}, null, 2)}</pre><p>Evidence state: ${res.evidence.state} (not inferred as VERIFIED)</p></div>`;
    kernel.saveToLocal();
  });
}

function simulate() {
  const el = document.querySelector("#app");
  el.innerHTML = `<div class="page"><h1>Simulate</h1><p>Deterministic mobile-robot simulation with telemetry, replay and fault injection. Consumes canonical component model. Same model progresses across fidelity levels.</p><div id="sim-root"></div><p><button id="btn-gen-evidence" class="btn">Generate Evidence from current run</button></p></div>`;
  new SimulatorUI(document.querySelector("#sim-root"));
  document.getElementById("btn-gen-evidence")?.addEventListener("click", async () => {
    if (!currentProject) return;
    const res = await runCanonicalSimulation(kernel, currentProject.id);
    alert(`Evidence generated: ${res.evidence.id} (state: ${res.evidence.state})`);
  });
}

function graphInspector() {
  const entities = kernel.store.all();
  const selectedIdProbe = (location.hash.split("?")[1] || "");
  const inspected = currentProject && selectedIdProbe ? inspect(kernel, currentProject.id, selectedIdProbe) : null;
  const selectedId = (location.hash.split("?")[1] || entities[0]?.id || "").split("&")[0];
  const selected = selectedId ? kernel.inspect(selectedId) : null;
  const entity = selectedId ? kernel.store.get(selectedId) : null;

  let detail = "<p>Select an object from the list.</p>";
  if (selected && entity) {
    const relIn = (selected.incoming || []).map(r => `<li>${r.relation} ← ${r.source}</li>`).join("");
    const relOut = (selected.outgoing || []).map(r => `<li>${r.relation} → ${r.target}</li>`).join("");
    const allocs = (selected.allocations || []).map(a => `<li>${a.name || a.id} (${a.type})</li>`).join("");
    const tests = (selected.tests || []).map(t => `<li>${t.name || t.id}</li>`).join("");
    const evds = (selected.evidences || []).map(e => `<li>${e.id} [${e.state}]</li>`).join("");
    const conns = (selected.connections || []).map(c => `<li>${c.source}.${c.metadata?.fromPort || ""} → ${c.target}.${c.metadata?.toPort || ""}</li>`).join("");
    detail = `
      <div class="card">
        <h3>Identity</h3>
        <p><strong>${entity.name || entity.id}</strong> · ${entity.type} · v${entity.version || ""} · ${entity.status || ""}</p>
        <p>Creator: ${entity.creator || "—"} · Created: ${entity.created || "—"}</p>
        <h3>Provenance</h3>
        <pre>${JSON.stringify(entity.provenance || {}, null, 2)}</pre>
        <h3>Incoming relations</h3><ul>${relIn || "<li>none</li>"}</ul>
        <h3>Outgoing relations</h3><ul>${relOut || "<li>none</li>"}</ul>
        ${allocs ? `<h3>Allocations</h3><ul>${allocs}</ul>` : ""}
        ${tests ? `<h3>Tests</h3><ul>${tests}</ul>` : ""}
        ${evds ? `<h3>Evidence</h3><ul>${evds}</ul>` : ""}
        ${conns ? `<h3>Connections</h3><ul>${conns}</ul>` : ""}
      </div>`;
  }

  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Knowledge Graph Inspector</h1>
    <p>Semantic inspector over the canonical graph. Same store as the workbench.</p>
    <div class="grid" style="grid-template-columns: 280px 1fr; gap: 1rem;">
      <div class="card" style="max-height: 70vh; overflow: auto;">
        <h3>Objects</h3>
        <ul style="list-style: none; padding: 0;">
          ${entities.map(e => `<li style="margin: 0.3rem 0;"><a href="#/graph?${e.id}" style="font-weight: ${e.id === selectedId ? "700" : "400"}">${escapeHtml(e.type)}: ${escapeHtml(e.name || e.id)}</a></li>`).join("")}
        </ul>
      </div>
      <div>${detail}</div>
    </div>
  </div>`;
}

function aiGuide() {
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>AI Guide</h1>
    <p>AI output is a proposal until validated. AI must not be the sole safety authority.</p>
    <div class="grid">
      ${AI_PROVIDERS.map(p => `<div class="card"><h3>${escapeHtml(p.name)}</h3><p>${p.note}</p><button class="btn" data-url="${p.url}" data-prompt="${encodeURIComponent('Project: ' + (currentProject?.name || 'UNSPECIFIED') + '. Context from the canonical model.')}">Open with prompt</button></div>`).join("")}
    </div>
    <div class="card">
      <h3>Sample prompt</h3>
      <pre>You are assisting with a sovereign physical AI / robotics systems engineering task.
Context: Role=Engineer, Domain=Subsea, Embodiment=AUV, Stage=Architecture.
Question: What functional contracts should the energy-storage and thruster subsystems declare so that chemistry and motor technology remain substitutable?</pre>
    </div>
  </div>`;
  document.querySelectorAll("button[data-url]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const p = decodeURIComponent(btn.dataset.prompt);
      try { await navigator.clipboard.writeText(p); } catch(e) {}
      window.open(btn.dataset.url, "_blank", "noopener");
    });
  });
}


function disclaimerView() {
  const d = disclaimerFor("simulation");
  document.querySelector("#app").innerHTML = `
    <div class="page legal">
      <h1>Disclaimer and indemnity</h1>
      <p class="lead">${d.master}</p>
      <h2>Indemnity</h2>
      <p>${d.indemnity}</p>
      <h2>Contextual</h2>
      <ul>
        <li><strong>Simulation.</strong> ${disclaimerFor("simulation").context}</li>
        <li><strong>HIL.</strong> ${disclaimerFor("hil").context}</li>
        <li><strong>Compliance.</strong> ${disclaimerFor("compliance").context}</li>
        <li><strong>Manufacturing.</strong> ${disclaimerFor("manufacturing").context}</li>
        <li><strong>Education.</strong> ${disclaimerFor("education").context}</li>
        <li><strong>Teleoperation.</strong> ${disclaimerFor("teleoperation").context}</li>
        <li><strong>CAD.</strong> ${disclaimerFor("cad").context}</li>
      </ul>
      <p>Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.</p>
    </div>`;
}

function modulesView() {
  const names = Object.keys(REACHABLE).sort();
  const rows = names.map(n => `<li><code>${n}</code></li>`).join("");
  document.querySelector("#app").innerHTML = `
    <div class="page">
      <h1>Modules reachable from the entry point</h1>
      <p>${names.length} modules imported through the registry, plus those imported directly by app.js.</p>
      <ul class="module-list">${rows}</ul>
    </div>`;
}

function about() {
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>About</h1>
    <p>Sovereign Physical AI and Robotics Guidance Platform.</p>
    <p>One canonical system model. Many views, simulations, implementations, documents and physical realizations.</p>
    <p>Static GitHub Pages. Local-first projects. GitHub as optional persistence. No mandatory backend or proprietary AI.</p>
    <p>See <code>docs/MRD.md</code> for the full Master Requirements Document and <code>sources/mrd-predecessor/</code> for the verbatim source architecture documents.</p>
    <p>Iteration 01: Canonical kernel activated. Spine preserved.</p>
    <p>Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. GPL v3.</p>
  </div>`;
}


function lifecycleView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const le = new LifecycleEngine(kernel);
  const lc = le.getLifecycle(currentProject.id);
  const stage = le.getCurrentStage(currentProject.id);
  const gate = le.getCurrentGate(currentProject.id);
  const evalR = gate ? le.evaluateGate(currentProject.id, gate.id) : null;
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Lifecycle</h1>
    <p>Current stage: <strong>${stage?.name || "—"}</strong></p>
    <p>Current gate: <strong>${gate?.id || "—"} ${gate?.name || ""}</strong> (${gate?.status || ""})</p>
    <div class="card">
      <h3>Gate evaluation</h3>
      <pre>${evalR ? JSON.stringify(evalR, null, 2) : "no gate"}</pre>
    </div>
    <h3>Gates</h3>
    <ul>${lc.gates.map(g => `<li>${g.id} ${g.name} – ${g.status}</li>`).join("") || "<li>none</li>"}</ul>
    <h3>Decisions</h3>
    <ul>${lc.decisions.map(d => `<li>${d.gateId}: ${d.outcome}</li>`).join("") || "<li>none</li>"}</ul>
  </div>`;
}

function configurationView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const ce = new ConfigurationEngine(kernel);
  const cfgs = kernel.store.all("Configuration").filter(c => kernel.store.relations.some(r => r.source === currentProject.id && r.target === c.id));
  const baselines = kernel.store.all("Baseline");
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Configuration</h1>
    <div class="grid">
      ${cfgs.map(c => `<div class="card"><h3>${c.name}</h3><p>${c.id} · ${c.status} · ${c.kind}</p><p>Items: ${(c.items||[]).length}</p>${c.fingerprint ? `<code>${c.fingerprint}</code>` : ""}</div>`).join("") || "<p>none</p>"}
    </div>
    <h3>Baselines</h3>
    <ul>${baselines.map(b => `<li>${b.name} (${b.kind}) – ${b.status}</li>`).join("") || "<li>none</li>"}</ul>
  </div>`;
}

function traceabilityView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const dt = new DigitalThread(kernel);
  const thread = dt.getDigitalThread(currentProject.id);
  const findings = dt.getTraceabilityFindings(currentProject.id);
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Digital Thread & Traceability</h1>
    <p>Entities: ${thread.entities} · Relations: ${thread.relations}</p>
    <h3>Thread breaks / findings</h3>
    <ul>${findings.map(f => `<li><strong>${f.type}</strong> ${f.id}: ${f.reason}</li>`).join("") || "<li>none</li>"}</ul>
    <h3>By type</h3>
    <ul>${Object.entries(thread.byType).map(([k,v]) => `<li>${k}: ${v.length}</li>`).join("")}</ul>
  </div>`;
}

function assuranceView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const se = new SafetyEngine(kernel);
  const readiness = se.evaluateReadiness(currentProject.id);
  const hazards = kernel.store.all("Hazard");
  const cases = kernel.store.all("AssuranceCase");
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Assurance & Safety</h1>
    <div class="card"><h3>Readiness</h3><pre>${JSON.stringify(readiness, null, 2)}</pre></div>
    <h3>Hazards</h3>
    <ul>${hazards.map(h => `<li>${h.name} [${h.status}] (${h.hazardType})</li>`).join("") || "<li>none</li>"}</ul>
    <h3>Assurance cases</h3>
    <ul>${cases.map(c => `<li>${c.name} (${c.kind})</li>`).join("") || "<li>none</li>"}</ul>
  </div>`;
}

function complianceView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const ce = new ComplianceEngine(kernel);
  const app = ce.applicabilityEngine(currentProject.id);
  const cases = kernel.store.all("ComplianceCase");
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Compliance & Standards</h1>
    <p>Applicability is informational / profiled. Not a legal determination.</p>
    <h3>Candidate profiles</h3>
    <ul>${app.candidates.map(c => `<li>${c.name} [${c.status}] – ${c.applicabilityReason}</li>`).join("") || "<li>none</li>"}</ul>
    <h3>Compliance cases</h3>
    <ul>${cases.map(c => `<li>${c.name} – ${c.state}</li>`).join("") || "<li>none</li>"}</ul>
    <p>Inputs: domain=${app.inputs.domain}, embodiment=${app.inputs.embodiment}</p>
  </div>`;
}

function manufactureView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const me = new ManufacturingEngine(kernel);
  const boms = me.generateBOMs(currentProject.id);
  const sov = me.sovereigntyAnalysis(currentProject.id);
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Manufacturing</h1>
    <p>BOM projections over the canonical graph. Not independent stores. Not proof of physical manufacture.</p>
    <div class="grid">
      <div class="card"><h3>EBOM</h3><ul>${boms.ebom.items.map(i => `<li>${i.name}</li>`).join("")}</ul></div>
      <div class="card"><h3>HBOM</h3><ul>${boms.hbom.items.map(i => `<li>${i.name}</li>`).join("") || "<li>—</li>"}</ul></div>
      <div class="card"><h3>SBOM</h3><ul>${boms.sbom.items.map(i => `<li>${i.name}</li>`).join("") || "<li>—</li>"}</ul></div>
      <div class="card"><h3>MBOM</h3><ul>${boms.mbom.items.map(i => `<li>${i.name}</li>`).join("")}</ul></div>
    </div>
    <h3>Sovereignty analysis</h3>
    <pre>${JSON.stringify(sov, null, 2)}</pre>
  </div>`;
}


function standardsView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const eng = new StandardsCorpusEngine(kernel);
  const graph = kernel.getProjectGraph(currentProject.id);
  const sys = graph.entities.find(e => e.type === "System");
  const hits = eng.query({ domain: sys?.domain, embodiment: sys?.embodiment });
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Standards Corpus</h1>
    <p>Provenance-labelled profiles. Not a legal determination.</p>
    <ul>${hits.map(s => `<li><strong>${escapeHtml(s.name)}</strong> [${escapeHtml(s.layer)}] – ${escapeHtml(s.topic)} <em>(${s.authority})</em></li>`).join("") || "<li>none</li>"}</ul>
    <h3>Automated compliance</h3>
    <pre id="compliance-out">checking</pre>
  </div>`;
  const result = new ComplianceAutomation(kernel).run(currentProject.id);
  const el = document.querySelector("#compliance-out");
  if (el) el.textContent = JSON.stringify(result, null, 2);
}

function educationView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const eng = new CurriculumEngine(kernel);
  const paths = kernel.store.all("Curriculum");
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Education</h1>
    <p>Learning paths are projections of the canonical graph. Simulation before physical.</p>
    <ul>${paths.map(p => `<li>${escapeHtml(p.name)} (${p.grade})</li>`).join("") || "<li>No paths yet</li>"}</ul>
  </div>`;
}

function researchView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const exps = kernel.store.all("Experiment");
  const pubs = kernel.store.all("Publication");
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Research</h1>
    <ul>${exps.map(e => `<li>${escapeHtml(e.name)}: ${e.question || ""}</li>`).join("") || "<li>none</li>"}</ul>
    <h3>Publications</h3>
    <ul>${pubs.map(p => `<li>${escapeHtml(p.name)} [${p.status}]</li>`).join("") || "<li>none</li>"}</ul>
  </div>`;
}

function operationsView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const fleets = kernel.store.all("Fleet");
  const deps = kernel.store.all("Deployment");
  const biz = new BusinessEngine(kernel);
  const cost = biz.aggregateCost(currentProject.id);
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Operations & Business</h1>
    <h3>Fleet</h3>
    <ul>${fleets.map(f => `<li>${f.name}</li>`).join("") || "<li>none</li>"}</ul>
    <h3>Deployments</h3>
    <ul>${deps.map(d => `<li>${escapeHtml(d.name)} [${d.status}]</li>`).join("") || "<li>none</li>"}</ul>
    <h3>Cost substrate</h3>
    <pre>${JSON.stringify(cost, null, 2)}</pre>
  </div>`;
}


function deployView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const graph = kernel.getProjectGraph(currentProject.id);
  const deployments = graph.entities.filter(e => e.type === "Deployment");
  document.querySelector("#app").innerHTML = `<div class="page"><h1>Deploy</h1><p>${deployments.length} deployment records in this project.</p><ul>${deployments.map(d => `<li>${escapeHtml(d.name)}</li>`).join("") || "<li>none</li>"}</ul></div>`;
}

function regulateView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const graph = kernel.getProjectGraph(currentProject.id);
  const standards = graph.entities.filter(e => e.type === "Standard");
  document.querySelector("#app").innerHTML = `<div class="page"><h1>Regulate</h1><p>Not a legal determination.</p><ul>${standards.map(s => `<li>${escapeHtml(s.name)} (${escapeHtml(s.status)})</li>`).join("") || "<li>none</li>"}</ul></div>`;
}

function fundView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = "<div class='page'><p>No project</p></div>"; return; }
  const graph = kernel.getProjectGraph(currentProject.id);
  const funding = graph.entities.filter(e => e.type === "Funding");
  document.querySelector("#app").innerHTML = `<div class="page"><h1>Fund</h1><ul>${funding.map(f => `<li>${escapeHtml(f.name)}</li>`).join("") || "<li>none</li>"}</ul></div>`;
}

function privacyView() {
  const payload = currentProject ? kernel.serializeProject(currentProject.id) : {};
  const review = whatLeaves("sync", payload);
  document.querySelector("#app").innerHTML = `<div class="page"><h1>What leaves my machine?</h1><pre>${escapeHtml(JSON.stringify(review, null, 2))}</pre><p>Save stays local. Sync and publish are explicit.</p></div>`;
}


function notebooksView() {
  document.querySelector("#app").innerHTML = `
  <div class="page">
    <h1>Notebooks</h1>
    <p>Optional remote workbenches. They are not the kernel. They do not certify a result. Open one by uploading it to a remote notebook runtime.</p>
    <ul>
      <li><a href="./notebooks/COLAB_CAD_WORKBENCH.ipynb" download>CAD workbench</a> — upload the cad package, run the package tests.</li>
      <li><a href="./notebooks/circuit-backend-lab.ipynb" download>Circuit backend lab</a> — upload the circuit package, run the solver tests.</li>
      <li><a href="./notebooks/circuit-design-space-lab.ipynb" download>Circuit design-space lab</a> — upload the design-space package, run the analytical samples.</li>
    </ul>
    <p>A remote open link requires a published repository. Until then, download the notebook and upload it to the remote runtime.</p>
  </div>`;
}

function router() {
  const p = (location.hash.slice(1) || "/").split("?")[0];
  const fn = routes[p] || home;
  fn();
  document.querySelectorAll("nav a").forEach(a => {
    a.style.fontWeight = a.getAttribute("href") === location.hash || (location.hash === "" && a.getAttribute("href") === "#/") ? "700" : "400";
  });
}

window.addEventListener("hashchange", router);
document.getElementById("nav-toggle")?.addEventListener("click", () => {
  document.getElementById("main-nav").classList.toggle("open");
});

// Initialize
initKernel().then(() => router());

function cockpitView() {
  if (!currentProject) return;
  const machine = new CockpitMachine(kernel, currentProject.id);
  machine.start();
  document.querySelector("#app").innerHTML = `<div class="page"><h1>Cockpit</h1><p>State records, not a vehicle cockpit. Current: ${machine.current()}</p><p>Advance past S0 requires a frozen configuration.</p></div>`;
}
function boundaryView() {
  const items = allBoundaries().map(b => `<li><strong>${b.name}</strong> — ${b.status}: ${b.reason}</li>`).join("");
  document.querySelector("#app").innerHTML = `<div class="page"><h1>Industrial boundary</h1><p>These are not subsystems.</p><ul>${items}</ul></div>`;
}

function cadView() {
  if (!currentProject) return;
  const cad = new GeometryKernel(kernel);
  const session = createCadSession(kernel, currentProject.id);
  const draw = () => {
    const view = session.viewport(cad);
    const tree = session.features().map(f => `<li data-id="${f.id}" class="${f.id === session.state.selectedId ? "sel" : ""}">${f.type} ${f.name}${f.volume != null ? " · " + f.volume : ""}</li>`).join("");
    document.querySelector("#app").innerHTML = `
      <div class="page cad-page">
        <h1>CAD workbench</h1>
        <p>${view.message || "Sketch, extrude, subtract. Volume comes from the mesh."}</p>
        <div class="cad-layout">
          <div>
            <canvas id="cad-canvas" width="640" height="420"></canvas>
            <div class="sim-controls">
              <label>X <input id="pt-x" type="number" value="20"></label>
              <label>Y <input id="pt-y" type="number" value="10"></label>
              <button id="pt-add">Add point</button>
              <label>Height <input id="cad-h" type="number" value="${session.state.height}"></label>
              <button id="cad-extrude">Extrude</button>
              <button id="cad-subtract">Subtract cutter</button>
            </div>
          </div>
          <aside>
            <h3>Feature tree</h3>
            <ul id="cad-tree">${tree || "<li>none</li>"}</ul>
            <p>Volume ${view.volume ?? "—"} mm3 · triangles ${view.triangleCount}</p>
          </aside>
        </div>
      </div>`;
    paintCad(view);
    document.querySelector("#pt-add").onclick = () => {
      session.addPoint(document.querySelector("#pt-x").value, document.querySelector("#pt-y").value);
      draw();
    };
    document.querySelector("#cad-extrude").onclick = () => {
      session.state.height = Number(document.querySelector("#cad-h").value) || 10;
      session.extrude(cad);
      draw();
    };
    document.querySelector("#cad-subtract").onclick = () => {
      session.state.height = Number(document.querySelector("#cad-h").value) || 10;
      session.subtract(cad);
      draw();
    };
    document.querySelectorAll("#cad-tree li").forEach(li => {
      li.onclick = () => { session.state.selectedId = li.dataset.id; draw(); };
    });
  };
  draw();
}

function paintCad(view) {
  const canvas = document.querySelector("#cad-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#090c10";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const project = (p) => ({ x: 80 + p.x * 4 - p.z * 1.2, y: 300 - p.y * 4 - p.z * 1.2 });
  const mesh = view.mesh;
  if (mesh) {
    ctx.strokeStyle = "#8b949e";
    for (const face of mesh.faces) {
      ctx.beginPath();
      face.forEach((i, n) => {
        const q = project(mesh.vertices[i]);
        if (n === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "#58a6ff";
    ctx.beginPath();
    view.points.forEach((p, i) => {
      const q = project({ ...p, z: 0 });
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.stroke();
  }
}

function capabilityView() {
  document.querySelector("#app").innerHTML = `<div class="page"><h1>Capabilities</h1><p>Every domain is in scope. Geometry CAD is implemented.</p><p><a href="#/cad">Open CAD workbench</a></p></div>`;
}

function workbenchView() {
  if (!currentProject) { document.querySelector("#app").innerHTML = `<div class="page"><h1>Workbench</h1><p>Start a project first.</p><a class="btn" href="#/start">Start</a></div>`; return; }
  const g = kernel.getProjectGraph(currentProject.id);
  const byType = {};
  for (const e of g.entities) byType[e.type] = (byType[e.type] || 0) + 1;
  const tree = g.entities.map(e => `<li data-id="${e.id}"><span class="tag">${escapeHtml(e.type)}</span> ${escapeHtml(e.name || e.id)}</li>`).join("");
  const rows = Object.entries(byType).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  document.querySelector("#app").innerHTML = `
    <div class="workbench">
      <header class="wb-bar">
        <strong>Workbench</strong>
        <span>${escapeHtml(currentProject.name)}</span>
        <span class="spacer"></span>
        <button data-view="architecture" class="wb-tab">Architecture</button>
        <button data-view="physical" class="wb-tab">Physical</button>
        <button data-view="electrical" class="wb-tab">Electrical</button>
        <button data-view="manufacturing" class="wb-tab">Manufacturing</button>
        <button id="wb-component" class="btn">Add component</button>
      </header>
      <aside class="wb-tree">
        <h2>Model</h2>
        <ul>${tree || "<li>Empty</li>"}</ul>
      </aside>
      <section class="wb-canvas" id="wb-canvas">
        <h2 id="wb-view-title">Architecture</h2>
        <table><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>
        <p>${g.entities.length} entities, ${g.relations.length} relations. ${disclaimerFor("simulation").context}</p>
        <div id="wb-brep"></div>
        <div id="wb-out"></div>
      </section>
      <aside class="wb-props">
        <h2>Properties</h2>
        <p>Select a node. Connections are typed. Incompatible ports are rejected.</p>
        <p><a href="#/disclaimer">Disclaimer</a></p>
      </aside>
    </div>`;
  document.querySelectorAll(".wb-tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelector("#wb-view-title").textContent = btn.dataset.view[0].toUpperCase() + btn.dataset.view.slice(1);
  }));
  const solid = boxBrep(10);
  const check = validateBrep(solid.solid);
  const vol = brepVolume(solid.solid);
  document.querySelector("#wb-brep").textContent = check.ok ? "B-rep closed, volume " + vol.volume + " mm3" : "B-rep open";
  document.querySelector("#wb-component").onclick = () => {
    const id = "wb_" + Math.random().toString(36).slice(2, 6);
    kernel.upsert({ id, type: "Component", name: "Workbench part", provenance: { origin: "workbench", derivedFrom: currentProject.id } });
    kernel.link(currentProject.id, "CONTAINS", id);
    document.querySelector("#wb-out").textContent = "Added " + id;
    workbenchView();
  };
}

function editorView() {
  if (!currentProject) return;
  const editor = new GraphEditor(kernel);
  const draw = (name = "architecture") => {
    const result = editor.view(currentProject.id, name);
    const rows = (result.entities || []).map(e => `<li>${escapeHtml(e.type)} ${escapeHtml(e.name)}</li>`).join("") || "<li>none</li>";
    document.querySelector("#app").innerHTML = `
      <div class="page">
        <h1>Graph editor</h1>
        <div class="sim-controls">
          <button data-view="architecture">Architecture</button>
          <button data-view="physical">Physical</button>
          <button data-view="electrical">Electrical</button>
          <button data-view="manufacturing">Manufacturing</button>
          <button data-view="software">Software</button>
          <button data-view="event">Event / State</button>
          <button data-view="commercial">Commercial</button>
          <button data-view="regulatory">Regulatory</button>
          <button data-view="physical3d">Physical 3D</button>
        </div>
        <p>Mode ${currentProject.mode || "Novice"}. View ${name}. ${result.entities?.length || 0} entities.</p>
        <ul>${rows}</ul>
      </div>`;
    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.onclick = () => draw(btn.dataset.view);
    });
  };
  draw("architecture");
}
