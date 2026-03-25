// Centralized message type constants
// Always use these constants — never raw strings

const MESSAGE_TYPES = {
  // Popup → Background
  SMART_FILL_REQUEST: "SMART_FILL_REQUEST",
  GET_PROFILE: "GET_PROFILE",
  SAVE_PROFILE: "SAVE_PROFILE",

  // Background → Content
  FILL_FORM: "FILL_FORM",
  EXTRACT_FORM: "EXTRACT_FORM",

  // Content → Background (responses)
  FORM_EXTRACTED: "FORM_EXTRACTED",
  FILL_COMPLETE: "FILL_COMPLETE",
  FILL_ERROR: "FILL_ERROR",

  // General
  GET_STATUS: "GET_STATUS",
  STATUS_RESPONSE: "STATUS_RESPONSE",
};

// Export for use in both background and content scripts
// (works without bundler via global assignment)
if (typeof module !== "undefined") {
  module.exports = MESSAGE_TYPES;
} else {
  window.MESSAGE_TYPES = MESSAGE_TYPES;
}
