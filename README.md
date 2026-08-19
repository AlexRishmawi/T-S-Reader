# Terms of Service (T&S) Reader

An AI-powered Chrome Extension and Node.js backend that extracts, analyzes, and streams summaries of Terms of Service, Privacy Policies, and End User License Agreements (EULAs) in real time using Google Gemini.

---

## Features

* **Real-Time Token Streaming:** Uses Server-Sent Events (SSE) and persistent Chrome extension ports to stream summaries chunk-by-chunk directly into the popup UI.
* **Consumer Advocate Breakdown:** Parses legal text into key sections:
  * Red Flags & Gotchas (arbitration clauses, waivers, auto-renewals, penalties)
  * Data & Privacy (data harvesting, third-party sharing, tracking)
  * Billing & Cancellation (refund policies, termination terms)
  * User Rights (opt-out terms, deletion rights, content ownership)
* **SHA-256 Response Caching:** Hashes extracted text to return instant responses for identical pages without consuming API credits.
* **Rate Limiting & Queueing:** Employs `express-rate-limit` and `Bottleneck` to manage request volume and avoid exceeding Google Gemini rate limits.
* **Secure CORS Protection:** Restricts backend access exclusively to requests originating from your specific Chrome extension ID.

---

## Project Structure

```text
ts-reader/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── summarize.js      # SSE route handler and IP rate limiter
│   │   ├── services/
│   │   │   └── geminiService.js  # Gemini SDK client, prompt logic, and cache
│   │   └── server.js             # Express app, CORS, and middleware setup
│   ├── .env                      # Environment variables (API keys, ports)
│   └── package.json
└── extension/
    ├── manifest.json             # Chrome Manifest V3 configuration
    ├── popup.html                # Extension UI layout
    ├── popup.js                  # UI state management and Markdown renderer
    ├── background.js             # Service worker handling ports and SSE fetch
    ├── content.js                # Content script extracting visible page text
    └── styles.css                # Extension stylesheet
```

---

## Prerequisites

* **Node.js:** v18.0.0 or newer (v20+ recommended)
* **Google Gemini API Key:** Obtain an API key from Google AI Studio
* **Google Chrome / Chromium-based Browser:** For loading the unpacked extension

---

## Installation & Setup

### 1. Backend Setup

Clone the repository and navigate to the backend directory:

```bash
cd ts-reader/backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the `backend/` root directory:

```
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
EXTENSION_ID=default-extension-id
```

Start the backend server in development mode:

```bash
npm run dev
```

The server will start listening at `http://localhost:5000`.

### 2. Chrome Extension Setup

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` directory within this project.
5. Copy the generated ID for the extension (e.g., `abcdefghijklmnopqrstuvwxyz123456`).
6. Update your `backend/.env` file with the extension ID:

```
EXTENSION_ID=your_copied_extension_id
```

7. Restart the backend server to apply the updated CORS origin.

---

## How to Use

1. Navigate to any website containing a Terms of Service, Privacy Policy, or EULA (e.g., Google Terms of Service, Reddit User Agreement).
2. Click the **T&S Reader** icon in your browser toolbar to open the popup.
3. Click **Summarize Page**.
4. The extension will extract page text, initiate a streaming request, and render formatted Markdown directly onto your screen in real time.
5. If the exact same document is scanned again, the backend delivers the cached result instantly.

---

## API Endpoints

### `POST /api/summarize`

Receives text extracted from a browser tab and streams back generated analysis using Server-Sent Events.

**Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
  "text": "Full legal text to summarize...",
  "url": "https://example.com/terms"
}
```

**Response:** `text/event-stream` returning data chunks formatted as `data: {"text": "..."}\n\n` and ending with `data: {"done": true, "cached": false}\n\n`.

### `GET /health`

Returns the operational status of the server.

**Response:** `200 OK`

```json
{
  "status": "ok"
}
```
