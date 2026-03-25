// domHelpers.js
// DOM utility functions used by content scripts

const DomHelpers = {
  /**
   * Get the visible label text associated with a form field
   * Checks: <label for="">, aria-label, placeholder, title, name, id
   */
  getFieldLabel(element) {
    // Method 1: Associated <label> via id
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim().toLowerCase();
    }

    // Method 2: Wrapping <label>
    const parentLabel = element.closest("label");
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      // Remove the input itself from the clone to get just the label text
      const inputs = clone.querySelectorAll("input, select, textarea");
      inputs.forEach((i) => i.remove());
      const text = clone.textContent.trim().toLowerCase();
      if (text) return text;
    }

    // Method 3: aria-label
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel.toLowerCase();

    // Method 4: aria-labelledby
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent.trim().toLowerCase();
    }

    // Method 5: placeholder
    const placeholder = element.getAttribute("placeholder");
    if (placeholder) return placeholder.toLowerCase();

    // Method 6: title
    const title = element.getAttribute("title");
    if (title) return title.toLowerCase();

    // Method 7: name attribute
    const name = element.getAttribute("name");
    if (name) return name.toLowerCase().replace(/[_-]/g, " ");

    // Method 8: id
    const id = element.getAttribute("id");
    if (id) return id.toLowerCase().replace(/[_-]/g, " ");

    return "";
  },

  // Simulate typing into a field (works with React/Vue controlled inputs)
  simulateInput(element, value) {
    try {
      // Native input value setter (bypasses React's own setter)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      );
      const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      );

      const setter =
        element.tagName === "TEXTAREA" ? nativeTextareaValueSetter : nativeInputValueSetter;

      if (setter && setter.set) {
        setter.set.call(element, value);
      } else {
        element.value = value;
      }

      // Fire events that frameworks listen to
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));

      return true;
    } catch (e) {
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  },

  // Select an option from a <select> element by value or label match
  selectOption(selectEl, value) {
    const lowerValue = value.toLowerCase();

    // Try exact value match first
    for (const option of selectEl.options) {
      if (option.value.toLowerCase() === lowerValue) {
        selectEl.value = option.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }

    // Try label/text match
    for (const option of selectEl.options) {
      if (option.text.toLowerCase().includes(lowerValue) || lowerValue.includes(option.text.toLowerCase())) {
        selectEl.value = option.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }

    return false;
  },

  // Check if an element is visible on the page
  isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      element.offsetParent !== null
    );
  },

  // Check if an input is a required field
  isRequired(element) {
    return (
      element.required ||
      element.getAttribute("aria-required") === "true" ||
      element.getAttribute("data-required") === "true"
    );
  },
};

window.DomHelpers = DomHelpers;
