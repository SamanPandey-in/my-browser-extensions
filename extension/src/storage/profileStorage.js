// profileStorage.js
// All chrome.storage.local interactions go here
// Never access chrome.storage directly outside this module

const PROFILE_KEY = "smart_autofill_profile";
const SETTINGS_KEY = "smart_autofill_settings";

const ProfileStorage = {
  //Save the user profile
  async saveProfile(profile) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  },

  // Load the user profile
  async loadProfile() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([PROFILE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[PROFILE_KEY] || null);
        }
      });
    });
  },

  // Save settings
  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  },

  // Load settings with defaults
  async loadSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const defaults = {
            highlightFilled: true,
            highlightMissing: true,
            aiMode: false, // OFF by default — helps Chrome approval
            confirmBeforeFill: false,
          };
          resolve({ ...defaults, ...(result[SETTINGS_KEY] || {}) });
        }
      });
    });
  },

  // Clear all stored data
  async clearAll() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  },
};

// Make available to content/popup scripts
window.ProfileStorage = ProfileStorage;
