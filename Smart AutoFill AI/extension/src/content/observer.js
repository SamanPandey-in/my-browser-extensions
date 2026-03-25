// observer.js
// Watches for dynamically injected form elements (React SPAs, lazy-loaded forms)
// Debounces re-scans to avoid performance issues

const FormObserver = {
  _observer: null,
  _debounceTimer: null,
  _onFormChangeCallback: null,

  // Start observing the page for new form elements
  startObserving(onFormChange) {
    if (this._observer) this.stopObserving();

    this._onFormChangeCallback = onFormChange;

    this._observer = new MutationObserver((mutations) => {
      let hasFormChanges = false;

      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;

        // Check if any added nodes contain form elements
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          if (
            node.tagName === "INPUT" ||
            node.tagName === "TEXTAREA" ||
            node.tagName === "SELECT" ||
            node.tagName === "FORM" ||
            node.querySelector("input, textarea, select")
          ) {
            hasFormChanges = true;
            break;
          }
        }

        if (hasFormChanges) break;
      }

      if (hasFormChanges) {
        // Debounce: wait 500ms before re-scanning
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          if (this._onFormChangeCallback) {
            this._onFormChangeCallback();
          }
        }, 500);
      }
    });

    this._observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[SAF] Form observer started");
  },

  stopObserving() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
  },
};

window.FormObserver = FormObserver;
