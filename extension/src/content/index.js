// content/index.js
// Main content script — runs in every page context
// Loads all modules via manifest content_scripts order and wires them together

// Module load order in manifest.json must be:
// constants.js → domHelpers.js → formExtractor.js → fieldFiller.js → highlighter.js → observer.js → index.js
