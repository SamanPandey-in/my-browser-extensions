// StudyTube AI - Content Script
// Transforms YouTube into an interactive learning experience

(function () {
  'use strict';

  // Prevent double-initialization on the same page
  if (window.__StudyTubeAIActive) return;
  window.__StudyTubeAIActive = true;

  const QUIZ_TRIGGER_BEFORE = 1.5;  // Trigger quiz this many seconds before checkpoint
  const CHECK_INTERVAL_MS  = 800;   // How often we poll video.currentTime
  const MIN_VIDEO_DURATION = 60;    // Skip quizzes on videos shorter than 60s

  // ─── Main Controller ────────────────────────────────────────────────────────

  class StudyTubeAI {
    constructor() {
      this.video          = null;
      this.videoId        = null;
      this.transcript     = [];
      this.checkpoints    = [];   // [{time, segStart, segEnd, question, asked, generating}]
      this.monitorTimer   = null;
      this.overlayActive  = false;
      this.sessionStats   = { correct: 0, total: 0 };
      this.badge          = null;
      this.intervalMin    = 3;
      this.finalShown     = false;
      this.allQuestions   = [];   // collected for final quiz
    }

    async run() {
      const settings = await this.getSettings();
      if (!settings.enabled) return;
      if (!settings.apiKey) {
        this.showBadge('🔑 Add API key in extension popup', 'warn', 6000);
        return;
      }

      this.intervalMin = settings.intervalMinutes || 3;
      this.videoId     = this.parseVideoId();
      if (!this.videoId) return;

      // Wait for the <video> element to be ready
      this.video = await this.waitForVideo();
      if (!this.video) return;

      await this.waitForDuration();
      if (this.video.duration < MIN_VIDEO_DURATION) return;

      this.showBadge('📖 Fetching transcript…', 'info');

      const items = await this.fetchTranscript();
      if (!items || items.length === 0) {
        this.showBadge('⚠️ No captions found', 'warn', 5000);
        return;
      }
      this.transcript = items;

      this.showBadge('🧠 Generating questions…', 'info');
      this.buildCheckpoints();
      await this.preGenerateFirst(2);

      this.showBadge('✅ StudyTube AI active', 'ok', 3000);
      this.startMonitor();
      this.scheduleSeekbarDots();

      // Listen for video ending to show final quiz
      this.video.addEventListener('ended', () => this.maybeShowFinalQuiz());
    }

    // ─── Settings ─────────────────────────────────────────────────────────────

    getSettings() {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, response => {
          resolve(response || { enabled: true, apiKey: '', intervalMinutes: 3 });
        });
      });
    }

    // ─── Video Helpers ─────────────────────────────────────────────────────────

    parseVideoId() {
      try {
        return new URL(window.location.href).searchParams.get('v');
      } catch { return null; }
    }

    waitForVideo(timeout = 12000) {
      return new Promise(resolve => {
        const v = document.querySelector('video');
        if (v) { resolve(v); return; }
        const obs = new MutationObserver(() => {
          const el = document.querySelector('video');
          if (el) { obs.disconnect(); resolve(el); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
      });
    }

    waitForDuration() {
      return new Promise(resolve => {
        if (this.video.duration && !isNaN(this.video.duration) && this.video.duration > 0) {
          resolve(); return;
        }
        const handler = () => { this.video.removeEventListener('loadedmetadata', handler); resolve(); };
        this.video.addEventListener('loadedmetadata', handler);
        setTimeout(resolve, 5000);
      });
    }

    // ─── Transcript Extraction ─────────────────────────────────────────────────

    fetchCaptionPayloadFromPage(url, timeout = 8000) {
      return new Promise(resolve => {
        const requestId = `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const handler = e => {
          const payload = e?.data?.__StudyTubeCaptionPayload;
          if (!payload || payload.requestId !== requestId) return;
          window.removeEventListener('message', handler);
          clearTimeout(timer);
          resolve(payload);
        };

        window.addEventListener('message', handler);
        window.postMessage({ __StudyTubeFetchCaption: { requestId, url } }, '*');

        const timer = setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, timeout);
      });
    }

    buildCaptionCandidates(rawUrl) {
      const candidates = [];
      const seen = new Set();
      const add = (u) => {
        if (!u || seen.has(u)) return;
        seen.add(u);
        candidates.push(u);
      };

      add(rawUrl);

      try {
        const parsed = new URL(rawUrl);
        const v = parsed.searchParams.get('v') || this.videoId || this.parseVideoId();
        const lang = parsed.searchParams.get('lang') || 'en';
        const kind = parsed.searchParams.get('kind') || '';
        const name = parsed.searchParams.get('name') || '';

        if (v) {
          let simple = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(v)}&lang=${encodeURIComponent(lang)}`;
          if (kind) simple += `&kind=${encodeURIComponent(kind)}`;
          if (name) simple += `&name=${encodeURIComponent(name)}`;
          add(simple);
          add(simple + '&fmt=json3');

          let googleSimple = `https://video.google.com/timedtext?v=${encodeURIComponent(v)}&lang=${encodeURIComponent(lang)}`;
          if (kind) googleSimple += `&kind=${encodeURIComponent(kind)}`;
          if (name) googleSimple += `&name=${encodeURIComponent(name)}`;
          add(googleSimple);
          add(googleSimple + '&fmt=json3');
        }

        add(rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'fmt=json3');
      } catch (_) {
        add(rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'fmt=json3');
      }

      return candidates;
    }

    parseTranscriptFromPayload(text, contentType = '') {
      const trimmed = (text || '').trim();
      if (!trimmed) return [];

      const looksLikeJson = contentType.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[');
      if (looksLikeJson) {
        try {
          const data = JSON.parse(trimmed);
          if (data && data.events) {
            return data.events
              .filter(e => e.segs && e.tStartMs != null)
              .map(e => ({
                start: e.tStartMs / 1000,
                dur:   (e.dDurationMs || 2000) / 1000,
                text:  e.segs.map(s => s.utf8 || '').join(' ').replace(/\n/g, ' ').trim()
              }))
              .filter(e => e.text);
          }
        } catch (_) { /* ignore and try XML */ }
      }

      try {
        const doc = new DOMParser().parseFromString(trimmed, 'text/xml');
        return Array.from(doc.querySelectorAll('text')).map(el => ({
          start: parseFloat(el.getAttribute('start') || '0'),
          dur:   parseFloat(el.getAttribute('dur')   || '2'),
          text:  (el.textContent || '')
                    .replace(/&amp;/g,  '&')
                    .replace(/&lt;/g,   '<')
                    .replace(/&gt;/g,   '>')
                    .replace(/&#39;/g,  "'")
                    .replace(/&quot;/g, '"')
                    .trim()
        })).filter(e => e.text);
      } catch (_) {
        return [];
      }
    }

    fetchTranscript() {
      return new Promise(async resolve => {
        const url = await this.getCaptionUrl();
        if (!url) {
          this.showStatus('No caption URL available');
          resolve(null); return;
        }

        const candidates = this.buildCaptionCandidates(url);
        console.log('StudyTube: caption candidates ->', candidates);

        // Try each candidate until one parses into transcript items
        try {
          for (let index = 0; index < candidates.length; index++) {
            const candidate = candidates[index];
            this.showStatus(`Fetching captions ${index + 1}/${candidates.length}`);
            console.log('StudyTube: trying caption candidate ->', candidate);

            let response = await this.fetchCaptionPayloadFromPage(candidate, 8000);
            if (!response) {
              const bgRes = await new Promise(resolveMsg => {
                chrome.runtime.sendMessage({ type: 'FETCH_CAPTION_TEXT', url: candidate }, res => resolveMsg(res));
              });
              if (bgRes && bgRes.success) response = bgRes;
            }

            if (!response) {
              console.warn('StudyTube: no response for candidate', candidate);
              continue;
            }
            if (response.success === false) {
              console.warn('StudyTube: candidate fetch failed', response.error || response);
              continue;
            }
            if (!response.ok) {
              console.warn('StudyTube: candidate returned status', response.status, response.statusText);
              continue;
            }

            const items = this.parseTranscriptFromPayload(response.text || '', response.contentType || '');
            console.log('StudyTube: parsed items ->', items.length, 'from candidate', candidate);
            if (items.length > 0) {
              this.showStatus(`Transcript parsed: ${items.length} items`);
              resolve(items);
              return;
            }
          }

          this.showStatus('Failed to parse captions');
          resolve(null);
        } catch (err) {
          console.warn('StudyTube: captions fetch error', err);
          this.showStatus('Captions fetch error');
          resolve(null);
        }
      });
    }

    getCaptionUrl() {
      return new Promise(resolve => {
        this.showStatus('Waiting for caption URL…');
        let settled = false;
        let timeoutId = null;

        const finish = (value, statusText) => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          if (statusText) this.showStatus(statusText);
          resolve(value);
        };

        const msgHandler = e => {
          if (e.data && e.data.__StudyTubeCaptionUrl !== undefined) {
            window.removeEventListener('message', msgHandler);
            const url = e.data.__StudyTubeCaptionUrl;
            const statusText = url ? `Caption URL found: ${url.substring(0,120)}` : 'Caption URL not found';
            console.log('StudyTube: caption-url ->', url);
            finish(url, statusText);
          }
        };
        window.addEventListener('message', msgHandler);

        // Inject an external script (CSP-safe) to read from the page's JS context
        this.showStatus('Injecting caption reader script');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected/caption-reader.js');
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);

        timeoutId = setTimeout(() => {
          window.removeEventListener('message', msgHandler);
          finish(null, 'Timed out waiting for caption URL');
        }, 8000);
      });
    }

    // ─── Checkpoints ──────────────────────────────────────────────────────────

    buildCheckpoints() {
      const dur     = this.video.duration;
      const segSecs = this.intervalMin * 60;
      const count   = Math.floor(dur / segSecs);

      if (count === 0) {
        // Very short video – single checkpoint at halfway
        this.checkpoints.push({ time: dur * 0.5, segStart: 0, segEnd: dur * 0.5, question: null, asked: false, generating: false });
      } else {
        for (let i = 1; i <= count; i++) {
          this.checkpoints.push({
            time:      i * segSecs,
            segStart:  (i - 1) * segSecs,
            segEnd:    i * segSecs,
            question:  null,
            asked:     false,
            generating: false
          });
        }
      }
    }

    async preGenerateFirst(n) {
      const targets = this.checkpoints.slice(0, n);
      await Promise.all(targets.map(cp => this.generateFor(cp)));
    }

    async generateFor(cp) {
      if (cp.question || cp.generating) return;
      cp.generating = true;
      const text = this.getTextForRange(cp.segStart, cp.segEnd);
      if (!text) { cp.generating = false; return; }

      const result = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'GENERATE_QUESTION', text, checkpointTime: cp.time }, res => {
          resolve(res);
        });
      });

      cp.generating = false;
      if (result && result.success && result.question) {
        cp.question = result.question;
        this.refreshSeekbarDots();
      }
    }

    getTextForRange(start, end) {
      return this.transcript
        .filter(item => item.start >= start && item.start < end)
        .map(item => item.text)
        .join(' ')
        .substring(0, 4000);
    }

    // ─── Monitor Loop ──────────────────────────────────────────────────────────

    startMonitor() {
      this.monitorTimer = setInterval(() => {
        if (!this.video || this.overlayActive) return;
        const t = this.video.currentTime;

        for (const cp of this.checkpoints) {
          // Pre-generate if we're within 2 segments of it
          if (!cp.question && !cp.generating && !cp.asked && cp.time - t < this.intervalMin * 60 * 2) {
            this.generateFor(cp);
          }

          // Trigger quiz
          if (!cp.asked && cp.question && t >= cp.time - QUIZ_TRIGGER_BEFORE && t <= cp.time + 8) {
            cp.asked = true;
            this.video.pause();
            this.showQuizOverlay(cp.question, this.checkpoints.indexOf(cp));
            break;
          }
        }
      }, CHECK_INTERVAL_MS);
    }

    // ─── Quiz Overlay ──────────────────────────────────────────────────────────

    showQuizOverlay(question, cpIndex) {
      this.overlayActive = true;
      this.allQuestions.push({ question, selectedIndex: -1, answered: false });
      const qNum       = this.sessionStats.total + 1;
      const total      = this.checkpoints.length;
      const qIdx       = this.allQuestions.length - 1;

      const overlay = document.createElement('div');
      overlay.id    = 'lt-overlay';
      overlay.innerHTML = `
        <div class="lt-backdrop"></div>
        <div class="lt-card" role="dialog" aria-modal="true" aria-label="Comprehension Check">
          <div class="lt-card-header">
            <div class="lt-pill">
              <span class="lt-pill-icon">🎓</span>
              <span class="lt-pill-text">Quick Check</span>
            </div>
            <div class="lt-counter">${qNum} / ${total}</div>
          </div>

          <div class="lt-progress-bar">
            <div class="lt-progress-fill" style="width:${(qNum / total) * 100}%"></div>
          </div>

          <p class="lt-question">${this.escHtml(question.question)}</p>

          <div class="lt-options" role="radiogroup">
            ${question.options.map((opt, i) => `
              <button class="lt-option" data-idx="${i}" role="radio" aria-checked="false">
                <span class="lt-opt-badge">${'ABCD'[i]}</span>
                <span class="lt-opt-text">${this.escHtml(opt.replace(/^[A-D][.)]\s*/i, ''))}</span>
              </button>
            `).join('')}
          </div>

          <div class="lt-feedback" id="lt-feedback" aria-live="polite"></div>

          <div class="lt-footer">
            <button class="lt-btn-skip" id="lt-skip-btn">Skip</button>
            <button class="lt-btn-submit" id="lt-submit-btn" disabled>Submit Answer</button>
          </div>
        </div>
      `;

      // Mount on the YouTube player
      const mount = document.querySelector('#movie_player') || document.querySelector('.html5-video-player') || document.body;
      mount.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('lt-visible'));

      let selected = -1;

      // Option buttons
      overlay.querySelectorAll('.lt-option').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          overlay.querySelectorAll('.lt-option').forEach(b => { b.classList.remove('lt-selected'); b.setAttribute('aria-checked', 'false'); });
          btn.classList.add('lt-selected');
          btn.setAttribute('aria-checked', 'true');
          selected = parseInt(btn.dataset.idx);
          overlay.querySelector('#lt-submit-btn').disabled = false;
        });
      });

      // Submit
      overlay.querySelector('#lt-submit-btn').addEventListener('click', () => {
        if (selected === -1) return;
        const isCorrect = selected === question.correct;
        this.sessionStats.total++;
        if (isCorrect) this.sessionStats.correct++;

        // Store selection for final quiz
        this.allQuestions[qIdx].selectedIndex = selected;
        this.allQuestions[qIdx].answered = true;

        // Reveal answers
        overlay.querySelectorAll('.lt-option').forEach((btn, i) => {
          btn.disabled = true;
          btn.setAttribute('aria-checked', 'false');
          if (i === question.correct)    btn.classList.add('lt-correct');
          else if (i === selected)       btn.classList.add('lt-incorrect');
        });

        const fb = overlay.querySelector('#lt-feedback');
        fb.className = 'lt-feedback lt-fb-' + (isCorrect ? 'correct' : 'incorrect');
        fb.innerHTML = `
          <span class="lt-fb-icon">${isCorrect ? '✅' : '❌'}</span>
          <span class="lt-fb-text"><strong>${isCorrect ? 'Correct!' : 'Not quite.'}</strong> ${this.escHtml(question.explanation || '')}</span>
        `;

        overlay.querySelector('#lt-submit-btn').style.display = 'none';
        overlay.querySelector('#lt-skip-btn').textContent     = 'Continue Watching →';
      });

      // Skip / Continue
      overlay.querySelector('#lt-skip-btn').addEventListener('click', () => {
        overlay.classList.remove('lt-visible');
        setTimeout(() => { overlay.remove(); }, 300);
        this.overlayActive = false;
        this.video.play();
      });

      // Keyboard support
      overlay.addEventListener('keydown', e => {
        if (e.key === 'Escape') overlay.querySelector('#lt-skip-btn').click();
        if (e.key >= '1' && e.key <= '4') {
          const idx = parseInt(e.key) - 1;
          const btn = overlay.querySelectorAll('.lt-option')[idx];
          if (btn && !btn.disabled) btn.click();
        }
        if (e.key === 'Enter') {
          const sb = overlay.querySelector('#lt-submit-btn');
          if (sb && !sb.disabled) sb.click();
        }
      });

      overlay.focus();
    }

    // ─── Final Quiz ────────────────────────────────────────────────────────────

    maybeShowFinalQuiz() {
      if (this.finalShown || this.allQuestions.length === 0) return;
      this.finalShown = true;
      clearInterval(this.monitorTimer);
      setTimeout(() => this.showFinalQuiz(), 1000);
    }

    showFinalQuiz() {
      const answered  = this.allQuestions.filter(q => q.answered);
      const correct   = this.sessionStats.correct;
      const total     = this.sessionStats.total;
      const pct       = total > 0 ? Math.round((correct / total) * 100) : 0;
      const grade     = pct >= 80 ? '🏆 Excellent' : pct >= 60 ? '👍 Good' : pct >= 40 ? '📚 Keep going' : '🔄 Review recommended';

      const overlay = document.createElement('div');
      overlay.id    = 'lt-overlay';
      overlay.innerHTML = `
        <div class="lt-backdrop"></div>
        <div class="lt-card lt-final-card" role="dialog" aria-modal="true" aria-label="Session Summary">
          <div class="lt-card-header">
            <div class="lt-pill">
              <span class="lt-pill-icon">📊</span>
              <span class="lt-pill-text">Session Summary</span>
            </div>
          </div>

          <div class="lt-score-circle">
            <svg viewBox="0 0 100 100" class="lt-donut">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--lt-accent)" stroke-width="10"
                stroke-dasharray="${2.513 * pct} 251.3"
                stroke-dashoffset="62.8"
                stroke-linecap="round"
                style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dasharray 1s ease"/>
            </svg>
            <div class="lt-score-inner">
              <span class="lt-score-num">${pct}%</span>
              <span class="lt-score-label">${grade}</span>
            </div>
          </div>

          <div class="lt-stats-row">
            <div class="lt-stat">
              <span class="lt-stat-num">${total}</span>
              <span class="lt-stat-lbl">Questions</span>
            </div>
            <div class="lt-stat">
              <span class="lt-stat-num lt-stat-green">${correct}</span>
              <span class="lt-stat-lbl">Correct</span>
            </div>
            <div class="lt-stat">
              <span class="lt-stat-num lt-stat-red">${total - correct}</span>
              <span class="lt-stat-lbl">Incorrect</span>
            </div>
          </div>

          <div class="lt-divider"></div>
          <p class="lt-review-title">Review Your Answers</p>

          <div class="lt-review-list">
            ${this.allQuestions.map((item, i) => {
              const isCorrect = item.selectedIndex === item.question.correct;
              return `
                <div class="lt-review-item ${item.answered ? (isCorrect ? 'lt-rev-correct' : 'lt-rev-incorrect') : 'lt-rev-skipped'}">
                  <span class="lt-rev-icon">${item.answered ? (isCorrect ? '✅' : '❌') : '⏭️'}</span>
                  <span class="lt-rev-q">${this.escHtml(item.question.question)}</span>
                  ${!isCorrect && item.answered ? `<span class="lt-rev-ans">Answer: ${this.escHtml(item.question.options[item.question.correct] || '')}</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div class="lt-footer lt-final-footer">
            <button class="lt-btn-submit" id="lt-close-final">Close</button>
          </div>
        </div>
      `;

      const mount = document.querySelector('#movie_player') || document.body;
      mount.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('lt-visible'));

      overlay.querySelector('#lt-close-final').addEventListener('click', () => {
        overlay.classList.remove('lt-visible');
        setTimeout(() => overlay.remove(), 300);
      });
    }

    // ─── Seekbar Dots ──────────────────────────────────────────────────────────

    scheduleSeekbarDots() {
      const attempt = () => {
        const bar = document.querySelector('.ytp-progress-bar-container');
        if (bar) { this.renderSeekbarDots(bar); }
        else { setTimeout(attempt, 1500); }
      };
      setTimeout(attempt, 2000);
    }

    renderSeekbarDots(bar) {
      // Remove old dots
      bar.querySelectorAll('.lt-seekdot').forEach(d => d.remove());
      const dur = this.video.duration;
      this.checkpoints.forEach(cp => {
        const dot = document.createElement('div');
        dot.className    = 'lt-seekdot' + (cp.question ? ' lt-seekdot-ready' : '');
        dot.style.left   = `${(cp.time / dur) * 100}%`;
        dot.title        = `📚 Quiz at ${this.fmtTime(cp.time)}`;
        bar.appendChild(dot);
      });
    }

    refreshSeekbarDots() {
      const bar = document.querySelector('.ytp-progress-bar-container');
      if (bar) this.renderSeekbarDots(bar);
    }

    // ─── Status Badge ──────────────────────────────────────────────────────────

    showBadge(text, type = 'info', autoDismiss = 0) {
      if (this.badge) this.badge.remove();
      const b = document.createElement('div');
      b.id          = 'lt-badge';
      b.className   = `lt-badge lt-badge-${type}`;
      b.textContent = text;
      document.body.appendChild(b);
      this.badge = b;
      requestAnimationFrame(() => b.classList.add('lt-badge-visible'));
      if (autoDismiss > 0) {
        setTimeout(() => {
          b.classList.remove('lt-badge-visible');
          setTimeout(() => b.remove(), 400);
        }, autoDismiss);
      }
    }

    // Small persistent status element for debugging and visibility
    showStatus(text, type = 'info') {
      try {
        let el = document.getElementById('lt-status');
        if (!el) {
          el = document.createElement('div');
          el.id = 'lt-status';
          el.style.position = 'fixed';
          el.style.right = '12px';
          el.style.top = '12px';
          el.style.zIndex = 2147483647;
          el.style.background = 'rgba(0,0,0,0.7)';
          el.style.color = '#fff';
          el.style.padding = '6px 10px';
          el.style.borderRadius = '6px';
          el.style.fontSize = '12px';
          el.style.maxWidth = '320px';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'default';
          document.body.appendChild(el);
        }
        el.textContent = text;
        el.setAttribute('data-type', type);
      } catch (e) { /* ignore */ }
    }

    // ─── Utilities ─────────────────────────────────────────────────────────────

    fmtTime(s) {
      const m = Math.floor(s / 60), ss = Math.floor(s % 60);
      return `${m}:${ss.toString().padStart(2, '0')}`;
    }

    escHtml(str = '') {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
  }

  // ─── SPA Navigation Support ───────────────────────────────────────────────

  function tryInit() {
    window.__StudyTubeAIActive = false; // Allow re-init
    window.__StudyTubeAIActive = true;
    // Clean up old overlay/badge if any
    document.querySelectorAll('#lt-overlay, #lt-badge').forEach(el => el.remove());
    new StudyTubeAI().run();
  }

  // YouTube is a SPA – listen for navigation events
  document.addEventListener('yt-navigate-finish', () => {
    window.__StudyTubeAIActive = false;
    setTimeout(tryInit, 1200);
  });

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
