chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_QUESTION') {
    handleGenerateQuestion(message.text, message.checkpointTime)
      .then(question => sendResponse({ success: true, question }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['apiKey', 'enabled', 'intervalMinutes'], (result) => {
      sendResponse({
        apiKey: result.apiKey || '',
        enabled: result.enabled !== false,
        intervalMinutes: result.intervalMinutes || 3
      });
    });
    return true;
  }
});

async function handleGenerateQuestion(text, checkpointTime) {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) throw new Error('API key not configured. Please open the StudyTube AI popup and enter your Gemini/Google API key.');

  const truncated = text.substring(0, 3500);

  // Build a single prompt for the Gemini/Text-Bison model
  const promptText = `You are a learning assistant. Based on the following video transcript segment, generate exactly 1 multiple-choice comprehension question.\n\nThe question should:\n- Test understanding of a key concept or fact from the transcript\n- Have 4 answer choices (exactly one correct)\n- Be clear and specific\n\nTranscript segment:\n${truncated}\n\nRespond ONLY with a valid JSON object, no markdown, no extra text:\n{\n  "question": "Your question here?",\n  "options": ["First option", "Second option", "Third option", "Fourth option"],\n  "correct": 0,\n  "explanation": "Brief 1-2 sentence explanation of why the correct answer is right."\n}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: { text: promptText },
      temperature: 0.2,
      maxOutputTokens: 600
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Generative API error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();

  // Extract text from a couple of possible response shapes
  let rawText = '';
  if (Array.isArray(data.candidates) && data.candidates.length) {
    rawText = data.candidates.map(c => c.output || c.content || '').join(' ');
  } else if (data.output && Array.isArray(data.output) && data.output.length) {
    // Older / alternate shapes
    rawText = (data.output[0].content && typeof data.output[0].content === 'string') ? data.output[0].content : (JSON.stringify(data.output[0].content) || '');
  } else if (data.candidate && data.candidate.output) {
    rawText = data.candidate.output;
  } else {
    rawText = JSON.stringify(data);
  }

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(cleaned);

  // Validate structure
  if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
    throw new Error('Invalid question format from API');
  }
  if (typeof parsed.correct !== 'number' || parsed.correct < 0 || parsed.correct > 3) {
    parsed.correct = 0;
  }

  return parsed;
}
