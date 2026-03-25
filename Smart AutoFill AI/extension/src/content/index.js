// content/index.js
// Main content script — runs in every page context
// Loads all modules via manifest content_scripts order and wires them together

// Module load order in manifest.json must be:
// constants.js → domHelpers.js → formExtractor.js → fieldFiller.js → highlighter.js → observer.js → index.js

(function () {
  "use strict";

  // Prevent double-init on SPA navigation
  if (window.__SAF_INITIALIZED__) return;
  window.__SAF_INITIALIZED__ = true;

  console.log("[SAF] Content script initialized on", window.location.hostname);

  // Listen for messages from the Background Service Worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "SMART_FILL_REQUEST":
        handleSmartFill(message.profile, sendResponse);
        return true; // Keep channel open for async response

      case "CLEAR_HIGHLIGHTS":
        Highlighter.clearAll();
        sendResponse({ success: true });
        break;

      case "GET_FORM_STATS":
        const fields = FormExtractor.extractFields();
        const stats = FormExtractor.getCompletionStats(fields);
        sendResponse({ stats });
        break;

      default:
        break;
    }
  });

  // Main autofill handler
  function handleSmartFill(profile, sendResponse) {
    try {
      if (!profile) {
        sendResponse({ success: false, error: "No profile found. Please set up your profile first." });
        return;
      }

      // Step 1: Extract all fields
      const fields = FormExtractor.extractFields();

      if (fields.length === 0) {
        sendResponse({ success: false, error: "No fillable form fields found on this page." });
        return;
      }

      // Step 2: Enrich profile (derive first/last name from full name etc.)
      const enrichedProfile = FieldFiller.enrichProfile(profile);

      // Step 3: Fill fields using rule-based engine
      const fillResults = FieldFiller.fillFields(fields, enrichedProfile);

      // Step 4: Refresh field states (values may have changed)
      const updatedFields = FormExtractor.extractFields();
      const stats = FormExtractor.getCompletionStats(updatedFields);

      // Step 5: Apply visual highlights
      Highlighter.applyResults(fillResults, updatedFields);
      Highlighter.showCompletionToast({
        ...stats,
        filled: fillResults.filled.length,
        total: fields.length,
      });

      sendResponse({
        success: true,
        stats: {
          filled: fillResults.filled.length,
          skipped: fillResults.skipped.length,
          missing: fillResults.missing.length,
          total: fields.length,
          completionPercent: stats.completionPercent,
        },
      });
    } catch (err) {
      console.error("[SAF] Fill error:", err);
      sendResponse({ success: false, error: err.message });
    }
  }

  // Watch for dynamically loaded forms (SPAs, React apps)
  FormObserver.startObserving(() => {
    console.log("[SAF] New form elements detected on page");
    // Re-apply highlights if user already filled earlier in this session
  });
})();
