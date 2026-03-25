# 🚀 Smart AutoFill AI — Phase 1

> Rule-based Chrome extension that intelligently detects and fills form fields using your saved profile.

## ✅ What's in Phase 1

- **Manifest V3** Chrome Extension
- **Profile storage** — name, email, phone, LinkedIn, GitHub, education, work experience
- **Rule-based autofill engine** — matches fields by label, name, placeholder, aria-label
- **Visual feedback** — green (filled), orange (missing required), completion toast
- **MutationObserver** — handles React/SPA dynamic forms
- **React-compatible filling** — fires native input events for controlled components
- **Polished dark popup UI** — DM Sans font, tab navigation, stats card

---

## 📁 Project Structure

```
extension/
├── manifest.json               ← Manifest V3 config
├── icons/                      ← 16px, 48px, 128px icons
└── src/
    ├── background/
    │   └── serviceWorker.js    ← Secure bridge between popup ↔ content
    ├── content/
    │   ├── index.js            ← Content script entry point
    │   ├── formExtractor.js    ← Detects all form fields on the page
    │   ├── fieldFiller.js      ← Rule-based fill engine
    │   ├── highlighter.js      ← Visual highlights + toast
    │   └── observer.js         ← MutationObserver for SPAs
    ├── popup/
    │   ├── popup.html          ← Extension popup UI
    │   ├── popup.css           ← Dark theme styles
    │   └── popup.js            ← Tab switching, save/load, fill trigger
    ├── storage/
    │   └── profileStorage.js   ← chrome.storage.local abstraction
    ├── messaging/
    │   └── messageTypes.js     ← Centralized message type constants
    └── utils/
        ├── constants.js        ← Field patterns, CSS classes, config
        └── domHelpers.js       ← DOM utility functions
```

---

## 🛠 How to Install (Developer Mode)

1. Go to `chrome://extensions/`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder (the one containing `manifest.json`)
5. Extension appears in toolbar

---

## 🔧 How to Use

1. Click the extension icon → popup opens
2. Go to **Profile tab** → fill in your details → click **Save Profile**
3. Navigate to any job application / contact form
4. Click **Smart Fill This Page**
5. Watch fields fill automatically with green highlights
6. Orange highlights = required fields your profile doesn't have data for

---

## 🧠 Field Matching Logic

The engine matches fields using 4 strategies (in order):

1. `input[type]` shortcut (e.g. `type="email"` → email field)
2. Label text patterns (e.g. "full name", "first name")
3. Name/ID attribute patterns (e.g. `name="firstname"`)
4. Placeholder text patterns

Patterns are defined in `src/utils/constants.js → FIELD_PATTERNS`.  
Add more patterns there to improve coverage.

---

## 🗺 Phases Roadmap

| Phase | Status | What's added |
|-------|--------|-------------|
| **Phase 1** | ✅ Current | Rule-based autofill, profile storage, UI |
| **Phase 2** | 🔜 Next | Node.js backend + AI semantic field mapping |
| **Phase 3** | 🔜 Later | Resume upload, open-ended AI answers, SaaS |

---

## 📊 Supported Field Types

- Text inputs (name, email, phone, address, etc.)
- Select dropdowns (country, state, degree)
- Radio buttons (best-match logic)
- Textarea (basic fill; AI generation in Phase 3)

---

## 🔒 Privacy

All data in Phase 1 is stored **locally** in `chrome.storage.local`.  
Nothing is sent to any server. No tracking. No analytics.

---

## 📝 Notes for Developers

- To add new field patterns → edit `src/utils/constants.js`
- To change popup UI → edit `src/popup/popup.html` + `popup.css`
- Content scripts load in order defined in `manifest.json` — order matters
- `DomHelpers`, `CONSTANTS`, etc. are injected as globals (no bundler needed)
