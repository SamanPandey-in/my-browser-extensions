(async function(){
  function post(url){ window.postMessage({ __StudyTubeCaptionUrl: url || null }, '*'); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  // Bridge: allow content script to request caption URL fetch in page context
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (!event.data || !event.data.__StudyTubeFetchCaption) return;

    const req = event.data.__StudyTubeFetchCaption;
    const requestId = req.requestId;
    const url = req.url;
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      const text = await res.text();
      window.postMessage({
        __StudyTubeCaptionPayload: {
          requestId,
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get('content-type') || '',
          text
        }
      }, '*');
    } catch (e) {
      window.postMessage({
        __StudyTubeCaptionPayload: {
          requestId,
          ok: false,
          status: 0,
          statusText: 'fetch-error',
          contentType: '',
          text: '',
          error: String(e && e.message ? e.message : e)
        }
      }, '*');
    }
  });

  try {
    // Try multiple times to allow the player to populate
    let resp = null;
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Try common places where YouTube stores the player response
      resp = window.ytInitialPlayerResponse || null;

      // Older players embed JSON in ytplayer.config.args.player_response
      if (!resp && window.ytplayer && window.ytplayer.config && window.ytplayer.config.args && window.ytplayer.config.args.player_response) {
        try { resp = JSON.parse(window.ytplayer.config.args.player_response); } catch (e) { /* ignore */ }
      }

      // Try to parse inline scripts for ytInitialPlayerResponse
      if (!resp) {
        const scripts = Array.from(document.scripts || []);
        for (const s of scripts) {
          const txt = s.textContent || '';
          const m = txt.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;/) || txt.match(/var ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;/);
          if (m) {
            try { resp = JSON.parse(m[1]); break; } catch (e) { /* ignore parse errors */ }
          }
        }
      }

      const tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      let track = tracks.find(t => t.languageCode === 'en')
                 || tracks.find(t => (t.languageCode || '').startsWith('en'))
                 || tracks[0];

      if (track && track.baseUrl) {
        console.debug('StudyTube: found caption track from player response', track);
        post(track.baseUrl);
        return;
      }

      // wait a bit before retrying
      await sleep(500);
    }

    // Fallback: try the timedtext API by video id
    let vid = null;
    try { vid = new URL(location.href).searchParams.get('v'); } catch (e) { /* ignore */ }
    if (!vid && resp && resp.videoDetails && resp.videoDetails.videoId) vid = resp.videoDetails.videoId;
    if (vid) {
      try {
        const listRes = await fetch(`https://video.google.com/timedtext?type=list&v=${vid}`);
        const listText = await listRes.text();
        const listDoc = new DOMParser().parseFromString(listText, 'text/xml');
        const tracks = Array.from(listDoc.querySelectorAll('track'));
        let chosen = tracks.find(t => (t.getAttribute('lang_code') || '').toLowerCase() === 'en')
                  || tracks.find(t => (t.getAttribute('lang_code') || '').toLowerCase().startsWith('en'))
                  || tracks[0];

        if (chosen) {
          const lang = chosen.getAttribute('lang_code');
          const name = chosen.getAttribute('name');
          const kind = chosen.getAttribute('kind');
          let url = `https://www.youtube.com/api/timedtext?v=${vid}&lang=${encodeURIComponent(lang || '')}`;
          if (name) url += `&name=${encodeURIComponent(name)}`;
          if (kind) url += `&kind=${encodeURIComponent(kind)}`;
          console.debug('StudyTube: found timedtext track list, posting URL', url);
          post(url);
          return;
        }
      } catch (e) {
        console.warn('StudyTube: timedtext list fetch failed', e);
      }

      // fallback simple timedtext URL (may return XML)
      const fallback = `https://www.youtube.com/api/timedtext?v=${vid}&lang=en`;
      console.debug('StudyTube: posting fallback timedtext URL', fallback);
      post(fallback);
      return;
    }

    post(null);
  } catch (e) {
    console.error('StudyTube: caption-reader error', e);
    post(null);
  }
})();
