# 🎓 StudyTube AI

Turn any captioned YouTube video into an interactive learning session with AI-powered comprehension checks.

## Features
- **Auto-quizzes** – Pauses the video at intervals (default: every 3 min) and asks a multiple-choice question generated from the transcript
- **Seekbar dots** – Purple dots on the YouTube progress bar show where quizzes will appear
- **Instant feedback** – Correct answer revealed with a brief explanation after each submission
- **Final summary** – Session score card shown when the video ends
- **Privacy-first** – All transcript processing happens locally in your browser; only the transcript text is sent to Google Generative API (Gemini) to generate questions

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `StudyTube-ai` folder

## Setup

1. Click the StudyTube AI icon in your Chrome toolbar
2. Enter your **Gemini / Google API key** (get one at https://console.cloud.google.com/apis/credentials)
3. Choose your preferred quiz interval
4. Hit **Save Settings**
5. Navigate to any YouTube video with captions – quizzes will start automatically!

## Requirements
- YouTube video must have **captions/subtitles** enabled
- A valid **Google API key** with access to the Generative Language API (uses a Gemini/Text-Bison model)
- Chrome / Chromium-based browser

## Notes
- Works on videos with English captions (or first available language)
- Very short videos (<60 seconds) are skipped
- Reloads active YouTube tabs when you save settings
