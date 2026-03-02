// background/serviceWorker.js
// Background Service Worker (Manifest V3)
// Acts as the secure bridge between popup and content scripts

const API_BASE_URL = "http://localhost:5000"; // Phase 2: update to deployed URL
const PROFILE_KEY = "smart_autofill_profile";
const SETTINGS_KEY = "smart_autofill_settings";

// Message handler from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "SMART_FILL_REQUEST":
      handleSmartFillRequest(sendResponse);
      return true;

    case "SAVE_PROFILE":
      saveProfile(message.profile, sendResponse);
      return true;

    case "GET_PROFILE":
      loadProfile(sendResponse);
      return true;

    case "SAVE_SETTINGS":
      saveSettings(message.settings, sendResponse);
      return true;

    case "GET_SETTINGS":
      loadSettings(sendResponse);
      return true;

    case "CLEAR_HIGHLIGHTS":
      forwardToActiveTab({ type: "CLEAR_HIGHLIGHTS" }, sendResponse);
      return true;

    default:
      break;
  }
});

// Smart Fill: load profile → forward to content script
async function handleSmartFillRequest(sendResponse) {
  try {
    const profile = await getStoredProfile();

    if (!profile) {
      sendResponse({ success: false, error: "No profile saved. Please set up your profile first." });
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      sendResponse({ success: false, error: "No active tab found." });
      return;
    }

    // Forward fill request to content script
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "SMART_FILL_REQUEST",
      profile: profile,
    });

    sendResponse(result);
  } catch (err) {
    console.error("[SAF Background] SmartFill error:", err);
    sendResponse({ success: false, error: err.message });
  }
}

// Forward message to active tab content script
async function forwardToActiveTab(message, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ success: false, error: "No active tab" });
      return;
    }
    const result = await chrome.tabs.sendMessage(tab.id, message);
    sendResponse(result);
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// Storage helpers
function getStoredProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PROFILE_KEY], (result) => {
      resolve(result[PROFILE_KEY] || null);
    });
  });
}

function saveProfile(profile, sendResponse) {
  chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
}

function loadProfile(sendResponse) {
  chrome.storage.local.get([PROFILE_KEY], (result) => {
    sendResponse({ success: true, profile: result[PROFILE_KEY] || null });
  });
}

function saveSettings(settings, sendResponse) {
  chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
}

function loadSettings(sendResponse) {
  const defaults = {
    highlightFilled: true,
    highlightMissing: true,
    aiMode: false,
    confirmBeforeFill: false,
  };
  chrome.storage.local.get([SETTINGS_KEY], (result) => {
    sendResponse({ success: true, settings: { ...defaults, ...(result[SETTINGS_KEY] || {}) } });
  });
}
