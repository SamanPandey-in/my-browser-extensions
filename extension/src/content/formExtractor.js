// formExtractor.js
// Detects all interactive form fields on the page
// Returns structured list of fields with metadata

const FormExtractor = {
  // Find all fillable fields on the current page
  // Returns array of field descriptors
  extractFields() {
    const fields = [];
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([type="image"])',
      "textarea",
      "select",
    ];

    const elements = document.querySelectorAll(selectors.join(", "));

    elements.forEach((el) => {
      // Skip invisible fields
      if (!DomHelpers.isVisible(el)) return;
      // Skip disabled fields
      if (el.disabled || el.readOnly) return;

      const label = DomHelpers.getFieldLabel(el);
      const fieldDescriptor = {
        element: el,
        label: label,
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || el.id || "",
        id: el.id || "",
        placeholder: el.placeholder || "",
        required: DomHelpers.isRequired(el),
        tagName: el.tagName.toLowerCase(),
        currentValue: el.value || "",
      };

      // For select elements, include available options
      if (el.tagName === "SELECT") {
        fieldDescriptor.options = Array.from(el.options).map((o) => ({
          value: o.value,
          label: o.text,
        }));
      }

      fields.push(fieldDescriptor);
    });

    return fields;
  },

  // Get a sanitized, lightweight HTML snapshot of the form for AI analysis
  // Used in Phase 2+ for backend processing
  extractFormHTML() {
    const forms = document.querySelectorAll("form");
    let html = "";

    if (forms.length > 0) {
      // Use the largest form (most fields) as the target
      let targetForm = forms[0];
      forms.forEach((f) => {
        if (f.elements.length > targetForm.elements.length) {
          targetForm = f;
        }
      });
      html = targetForm.outerHTML;
    } else {
      // No <form> tag — grab the body (some SPAs don't use <form>)
      html = document.body.innerHTML;
    }

    // Sanitize: remove scripts, styles, SVGs, images
    html = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/\s{2,}/g, " ");

    // Truncate to 15KB max
    if (html.length > 15000) {
      html = html.substring(0, 15000) + "...";
    }

    return html;
  },

  // Count how many required fields exist and how many are filled
  getCompletionStats(fields) {
    const required = fields.filter((f) => f.required);
    const filled = fields.filter((f) => f.currentValue && f.currentValue.trim() !== "");
    const requiredFilled = required.filter((f) => f.currentValue && f.currentValue.trim() !== "");

    return {
      total: fields.length,
      filled: filled.length,
      required: required.length,
      requiredFilled: requiredFilled.length,
      completionPercent: fields.length > 0 ? Math.round((filled.length / fields.length) * 100) : 0,
    };
  },
};

window.FormExtractor = FormExtractor;
