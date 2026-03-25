document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput     = document.getElementById('api-key');
  const toggleEnabled   = document.getElementById('toggle-enabled');
  const toggleVis       = document.getElementById('toggle-visibility');
  const saveBtn         = document.getElementById('save-btn');
  const statusBar       = document.getElementById('status-bar');
  const intervalBtns    = document.querySelectorAll('.interval-btn');
  const statsSection    = document.getElementById('stats-section');
  const statTotal       = document.getElementById('stat-total');
  const statCorrect     = document.getElementById('stat-correct');
  const statPct         = document.getElementById('stat-pct');

  let selectedInterval = 3;

  const stored = await chrome.storage.local.get(['apiKey', 'enabled', 'intervalMinutes', 'sessionStats']);
  apiKeyInput.value          = stored.apiKey           || '';
  toggleEnabled.checked      = stored.enabled          !== false;
  selectedInterval           = stored.intervalMinutes  || 3;

  setActiveInterval(selectedInterval);

  // Show session stats if available
  const ss = stored.sessionStats;
  if (ss && ss.total > 0) {
    statsSection.style.display = '';
    statTotal.textContent      = ss.total;
    statCorrect.textContent    = ss.correct;
    const pct                  = Math.round((ss.correct / ss.total) * 100);
    statPct.textContent        = pct + '%';
    if (pct >= 70) statPct.classList.add('green');
  }

  toggleVis.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    toggleVis.textContent = apiKeyInput.type === 'password' ? '👁' : '🙈';
  });

  // Interval selection
  intervalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedInterval = parseInt(btn.dataset.min);
      setActiveInterval(selectedInterval);
    });
  });

  function setActiveInterval(min) {
    intervalBtns.forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.min) === min);
    });
    selectedInterval = min;
  }

  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (key && key.length < 10) {
      showStatus('API key looks too short', 'error');
      return;
    }

    await chrome.storage.local.set({
      apiKey:          key,
      enabled:         toggleEnabled.checked,
      intervalMinutes: selectedInterval
    });

    showStatus('✅ Settings saved!', 'success');

    // Reload active YouTube tabs so new settings take effect
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/watch*' }).catch(() => []);
    tabs.forEach(tab => chrome.tabs.reload(tab.id));
  });

  function showStatus(msg, type) {
    statusBar.textContent  = msg;
    statusBar.className    = `status-bar show ${type}`;
    setTimeout(() => { statusBar.className = 'status-bar'; }, 3000);
  }
});
