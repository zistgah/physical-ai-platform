/** © 1993–2026 Abhishek Choudhary. All rights reserved. AyeAI. Licensed under GPL-3.0-only.
 * Moved verbatim from an inline script in index.html so the page's Content-Security-Policy can be enforced. */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
let deferred;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; window.__pwaPrompt = e; });
