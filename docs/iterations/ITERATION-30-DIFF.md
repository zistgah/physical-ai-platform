# Iteration 30 Diff

Against Iteration 29.

## Added
- site/components/core/module-registry.js
- site/components/core/disclaimer.js
- site/manifest.webmanifest
- site/sw.js
- tools/conformance-test-iter30.mjs

## Changed
- app.js imports the registry, renders a modern landing, an industrial workbench, and disclaimer and modules routes.
- index.html links the manifest, registers the service worker, and links the disclaimer.
