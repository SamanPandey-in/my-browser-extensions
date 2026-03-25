// fieldFiller.js
// Core rule-based autofill engine
// Phase 1: Pure pattern matching against CONSTANTS.FIELD_PATTERNS
// Phase 2+: Will receive AI-mapped results from backend

const FieldFiller = {
  // Match a single field to a profile key using label/attr/placeholder patterns
  matchFieldToProfileKey(fieldDescriptor) {
    const { label, name, id, placeholder, type } = fieldDescriptor;

    const candidates = [
      label,
      name.toLowerCase().replace(/[_-]/g, " "),
      id.toLowerCase().replace(/[_-]/g, " "),
      placeholder.toLowerCase(),
    ].filter(Boolean);

    for (const [profileKey, patterns] of Object.entries(CONSTANTS.FIELD_PATTERNS)) {
      // Check input type shortcut (e.g. type="email" → email field)
      if (patterns.inputType && patterns.inputType.includes(type)) {
        return profileKey;
      }

      // Check label patterns
      if (patterns.labels) {
        for (const pattern of patterns.labels) {
          if (candidates.some((c) => c.includes(pattern))) {
            return profileKey;
          }
        }
      }

      // Check attribute patterns (name/id)
      if (patterns.attrs) {
        for (const pattern of patterns.attrs) {
          const nameId = [name.toLowerCase(), id.toLowerCase()].filter(Boolean);
          if (nameId.some((c) => c.includes(pattern) || pattern.includes(c))) {
            return profileKey;
          }
        }
      }

      // Check placeholder patterns
      if (patterns.placeholders) {
        for (const pattern of patterns.placeholders) {
          if (candidates.some((c) => c.includes(pattern))) {
            return profileKey;
          }
        }
      }
    }

    return null;
  },

  // Fill all detected fields on the page using the user profile
  fillFields(fields, profile) {
    const results = {
      filled: [],
      skipped: [],
      missing: [],
    };

    for (const field of fields) {
      const profileKey = this.matchFieldToProfileKey(field);

      if (!profileKey) {
        results.skipped.push({ field, reason: "no_match" });
        continue;
      }

      const value = profile[profileKey];

      if (!value || value.trim() === "") {
        results.missing.push({ field, profileKey, reason: "no_profile_value" });
        continue;
      }

      const element = field.element;
      let filled = false;

      if (field.tagName === "select") {
        filled = DomHelpers.selectOption(element, value);
      } else if (field.type === "radio") {
        filled = this._fillRadio(element, value);
      } else if (field.type === "checkbox") {
        // Skip checkboxes — too risky to auto-check
        results.skipped.push({ field, reason: "checkbox_skipped" });
        continue;
      } else {
        filled = DomHelpers.simulateInput(element, value);
      }

      if (filled) {
        results.filled.push({ field, profileKey, value });
      } else {
        results.missing.push({ field, profileKey, reason: "fill_failed" });
      }
    }

    return results;
  },

  // Handle radio button groups
  _fillRadio(element, value) {
    const name = element.name;
    if (!name) return false;

    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    const lowerValue = value.toLowerCase();

    for (const radio of radios) {
      const radioLabel = DomHelpers.getFieldLabel(radio);
      if (
        radio.value.toLowerCase() === lowerValue ||
        radioLabel.includes(lowerValue) ||
        lowerValue.includes(radio.value.toLowerCase())
      ) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }

    return false;
  },

  // Build a profile value from full_name if individual parts missing
  enrichProfile(profile) {
    const enriched = { ...profile };

    // Derive first/last from full name if not set
    if (enriched.full_name && !enriched.first_name) {
      const parts = enriched.full_name.trim().split(" ");
      enriched.first_name = parts[0] || "";
      enriched.last_name = parts.slice(1).join(" ") || "";
    }

    return enriched;
  },
};

window.FieldFiller = FieldFiller;
