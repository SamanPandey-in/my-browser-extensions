// highlighter.js
// Adds visual highlights to filled, missing, and AI-drafted fields
// All styles injected via JS to avoid needing a separate CSS file in content

const Highlighter = {
  _styleInjected: false,

  // Inject the CSS once into the page
  injectStyles() {
    if (this._styleInjected) return;

    const style = document.createElement("style");
    style.id = "saf-highlight-styles";
    style.textContent = `
      .saf-filled {
        border: 2px solid #22c55e !important;
        background-color: rgba(34, 197, 94, 0.06) !important;
        transition: border-color 0.3s ease, background-color 0.3s ease;
      }

      .saf-missing {
        border: 2px solid #f97316 !important;
        background-color: rgba(249, 115, 22, 0.06) !important;
        animation: saf-pulse 1.5s ease-in-out 2;
      }

      .saf-ai-draft {
        border: 2px solid #818cf8 !important;
        background-color: rgba(129, 140, 248, 0.08) !important;
      }

      @keyframes saf-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.3); }
        50% { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15); }
      }

      .saf-badge {
        position: absolute;
        z-index: 9999;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        pointer-events: none;
        font-family: -apple-system, system-ui, sans-serif;
        letter-spacing: 0.02em;
      }

      .saf-badge-filled {
        background: #22c55e;
        color: white;
      }

      .saf-badge-missing {
        background: #f97316;
        color: white;
      }

      .saf-badge-ai {
        background: #818cf8;
        color: white;
      }

      .saf-completion-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        background: #0f172a;
        color: #f8fafc;
        padding: 14px 20px;
        border-radius: 12px;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 13px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: saf-slide-in 0.3s ease;
        max-width: 300px;
      }

      @keyframes saf-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0);   opacity: 1; }
      }

      .saf-toast-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .saf-toast-title {
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 2px;
      }

      .saf-toast-body {
        font-size: 11px;
        color: #94a3b8;
      }

      .saf-progress-bar {
        height: 3px;
        background: #1e293b;
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
      }

      .saf-progress-fill {
        height: 100%;
        border-radius: 2px;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.6s ease;
      }
    `;

    document.head.appendChild(style);
    this._styleInjected = true;
  },

  // Highlight a field as successfully filled
  markFilled(element) {
    element.classList.remove("saf-missing", "saf-ai-draft");
    element.classList.add("saf-filled");
  },

  // Highlight a field as required but empty
  markMissing(element) {
    element.classList.remove("saf-filled", "saf-ai-draft");
    element.classList.add("saf-missing");
  },

  // Highlight a field as AI-drafted (needs review)
  markAiDraft(element) {
    element.classList.remove("saf-filled", "saf-missing");
    element.classList.add("saf-ai-draft");
  },

  // Remove all highlights from a field
  clearField(element) {
    element.classList.remove("saf-filled", "saf-missing", "saf-ai-draft");
  },

  // Clear all highlights on the page
  clearAll() {
    document.querySelectorAll(".saf-filled, .saf-missing, .saf-ai-draft").forEach((el) => {
      this.clearField(el);
    });
    this._removeToast();
  },

  // Show a completion toast with fill stats
  showCompletionToast(stats) {
    this._removeToast();

    const toast = document.createElement("div");
    toast.id = "saf-toast";
    toast.className = "saf-completion-toast";

    const icon = stats.filled > 0 ? "✅" : "⚠️";
    const title =
      stats.filled > 0
        ? `Filled ${stats.filled} of ${stats.total} fields`
        : "No matching fields found";
    const body =
      stats.required > 0
        ? `${stats.requiredFilled}/${stats.required} required fields completed`
        : "Check your profile has the needed info";

    toast.innerHTML = `
      <div class="saf-toast-icon">${icon}</div>
      <div>
        <div class="saf-toast-title">${title}</div>
        <div class="saf-toast-body">${body}</div>
        <div class="saf-progress-bar">
          <div class="saf-progress-fill" style="width: ${stats.completionPercent}%"></div>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => this._removeToast(), 4500);
  },

  _removeToast() {
    const existing = document.getElementById("saf-toast");
    if (existing) existing.remove();
  },

  // Apply all highlights based on fill results
  applyResults(fillResults, allFields) {
    this.injectStyles();

    // Mark filled fields
    fillResults.filled.forEach(({ field }) => {
      this.markFilled(field.element);
    });

    // Mark required+empty fields
    allFields.forEach((field) => {
      if (field.required && (!field.element.value || field.element.value.trim() === "")) {
        const wasJustFilled = fillResults.filled.some((f) => f.field.element === field.element);
        if (!wasJustFilled) {
          this.markMissing(field.element);
        }
      }
    });
  },
};

window.Highlighter = Highlighter;
