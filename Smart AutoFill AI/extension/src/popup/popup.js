// popup.js
// Controls the popup UI: tab switching, profile save/load, fill trigger

// Profile field IDs mapping to storage keys
const PROFILE_FIELDS = [
  "full_name", "email", "phone",
  "linkedin", "github", "website",
  "city", "state", "country", "zip_code",
  "address",
  "university", "degree", "graduation_year",
  "current_company", "current_title", "years_experience",
];

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`tab-${target}`).classList.add("active");
  });
});

// Settings button → open settings tab
document.getElementById("settingsBtn").addEventListener("click", () => {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  document.querySelector('[data-tab="settings"]').classList.add("active");
  document.getElementById("tab-settings").classList.add("active");
});

// Profile Load on open
async function loadProfile() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_PROFILE" });
    if (response.success && response.profile) {
      const profile = response.profile;
      PROFILE_FIELDS.forEach((key) => {
        const el = document.getElementById(`p_${key}`);
        if (el && profile[key]) {
          el.value = profile[key];
        }
      });
      updateProfilePreview(profile);
    }
  } catch (err) {
    console.error("[SAF Popup] Load profile error:", err);
  }
}

function updateProfilePreview(profile) {
  const nameEl = document.getElementById("previewName");
  const detailEl = document.getElementById("previewDetail");

  if (profile && profile.full_name) {
    nameEl.textContent = profile.full_name;
    detailEl.textContent = profile.email || profile.current_title || "Profile active";
    nameEl.style.color = "var(--text)";
  } else {
    nameEl.textContent = "No profile set up";
    detailEl.textContent = "Go to Profile tab →";
    nameEl.style.color = "var(--text-muted)";
  }
}

// Profile Save
document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const profile = {};
  PROFILE_FIELDS.forEach((key) => {
    const el = document.getElementById(`p_${key}`);
    if (el) profile[key] = el.value.trim();
  });

  const btn = document.getElementById("saveProfileBtn");
  btn.disabled = true;
  btn.classList.add("loading");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_PROFILE",
      profile,
    });

    if (response.success) {
      const saveStatus = document.getElementById("saveStatus");
      saveStatus.classList.remove("hidden");
      setTimeout(() => saveStatus.classList.add("hidden"), 2500);
      updateProfilePreview(profile);
    }
  } catch (err) {
    console.error("[SAF Popup] Save error:", err);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});

// Smart Fill Trigger
document.getElementById("smartFillBtn").addEventListener("click", async () => {
  const btn = document.getElementById("smartFillBtn");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  btn.disabled = true;
  btn.classList.add("loading");
  statusDot.className = "status-dot active";
  statusText.textContent = "Analyzing page...";

  try {
    const response = await chrome.runtime.sendMessage({ type: "SMART_FILL_REQUEST" });

    if (response.success) {
      const stats = response.stats;
      showResults(stats);

      statusDot.className = "status-dot success";
      statusText.textContent = `${stats.filled} fields filled`;
    } else {
      statusDot.className = "status-dot error";
      statusText.textContent = response.error || "Fill failed";
      showError(response.error);
    }
  } catch (err) {
    statusDot.className = "status-dot error";
    statusText.textContent = "Error occurred";
    console.error("[SAF Popup] Fill error:", err);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});

function showResults(stats) {
  const card = document.getElementById("resultCard");
  card.classList.remove("hidden");

  document.getElementById("statFilled").textContent = stats.filled;
  document.getElementById("statMissing").textContent = stats.missing || 0;
  document.getElementById("statTotal").textContent = stats.total;
  document.getElementById("progressPct").textContent = `${stats.completionPercent}%`;
  document.getElementById("progressFill").style.width = `${stats.completionPercent}%`;
}

function showError(message) {
  const statusText = document.getElementById("statusText");
  statusText.textContent = message || "Something went wrong";
}

// Clear Highlights
document.getElementById("clearBtn").addEventListener("click", async () => {
  try {
    await chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHTS" });
    document.getElementById("resultCard").classList.add("hidden");
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    statusDot.className = "status-dot";
    statusText.textContent = "Ready to fill";
  } catch (err) {
    console.error("[SAF Popup] Clear error:", err);
  }
});

// Settings Load / Save
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    if (response.success && response.settings) {
      const s = response.settings;
      document.getElementById("s_highlightFilled").checked = s.highlightFilled;
      document.getElementById("s_highlightMissing").checked = s.highlightMissing;
    }
  } catch (err) {
    console.error("[SAF Popup] Load settings error:", err);
  }
}

// Auto-save settings on toggle change
["s_highlightFilled", "s_highlightMissing"].forEach((id) => {
  document.getElementById(id).addEventListener("change", async () => {
    const settings = {
      highlightFilled: document.getElementById("s_highlightFilled").checked,
      highlightMissing: document.getElementById("s_highlightMissing").checked,
      aiMode: false,
    };
    await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings });
  });
});

// Clear All Data
document.getElementById("clearDataBtn").addEventListener("click", async () => {
  const confirmed = confirm("This will delete your saved profile and all data. Continue?");
  if (!confirmed) return;

  await chrome.storage.local.clear();

  // Reset all profile inputs
  PROFILE_FIELDS.forEach((key) => {
    const el = document.getElementById(`p_${key}`);
    if (el) el.value = "";
  });

  updateProfilePreview(null);
  document.getElementById("resultCard").classList.add("hidden");
  alert("All data cleared.");
});

// Init
loadProfile();
loadSettings();
