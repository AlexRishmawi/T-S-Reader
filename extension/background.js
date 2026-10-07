const BACKEND_URL = 'https://t-s-reader.onrender.com/api/summarize';
const POSTHOG_URL = 'https://us.i.posthog.com';
const POSTHOG_API_KEY = 'phc_Bx8S9DD6zTjW9WqCoh8hYahzPimXn7DRLuGWbToc52R8';

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        trackEvent('extension_installed');
    } else if (details.reason === 'update') {
        trackEvent('extension_updated', { previous_version: details.previousVersion });
    }
})

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'stream-summary') {
        port.onMessage.addListener(async (msg) => {
            if (msg.action === 'SUMMARIZE') {
                await handleSummarize(port);
            }
        });
    }
});

async function handleSummarize(port) {
    const startTime = Date.now();
    let currentDomain = 'unknown';
    let isConnected = true;
    port.onDisconnect.addListener(() => {
        isConnected = false;
    });

    const safePost = (msg) => {
        if (isConnected) {
            try {
                port.postMessage(msg);
            } catch (e) {
                isConnected = false;
            }
        }
    };
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            return safePost({ success: false, error: 'No active tab found.' });
        }

        if (tab.url) {
            try {
                currentDomain = new URL(tab.url).hostname;
            } catch (_) {
                currentDomain = 'invalid';
            }
        }
        

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about://')) {
            trackEvent('summary_failed', { domain: currentDomain, errorType: 'internal_browser_page' });
            return safePost({ success: false, error: 'Cannot summarize internal browser pages.' });
        }

        trackEvent('summary_requested', { domain: currentDomain });

        const executionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        const extractedText = executionResult[0]?.result;
        if (!extractedText || typeof extractedText !== 'string' || !extractedText.trim()) {
            trackEvent('summary_failed', { domain: currentDomain, error_type: 'no_readable_text' });
            return safePost({ error: 'Could not extract readable text from this page.' });
        }

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: extractedText, url: tab.url })
        });

        if (!response.ok) {
            return safePost({ success: false, error: `Server responded with status ${response.status}` });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {

            if (!isConnected) {
                reader.cancel();
                break;
            }
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
                const chunk = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                if (chunk.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(chunk.substring(6));
                    if (data.error) {
                        safePost({ error: data.error });
                        trackEvent('summary_failed', { domain: currentDomain, error_type: data.error });
                    }
                    if (data.text) {
                        safePost({ status: 'chunk', text: data.text });
                    }
                    if (data.done) {
                        safePost({ status: 'done', cached: data.cached || false });
                        trackEvent('summary_completed', { domain: currentDomain, cached: Boolean(data.cached), duration_ms: Date.now() - startTime });
                    }
                    } catch (error) {
                        console.warn('Failed to parse chunk:', error);
                    }
                }
                boundary = buffer.indexOf('\n\n');
            }
        }

    } catch (error) {
        console.error('Background script error:', error);
        safePost({ success: false, error: 'An unexpected error occurred while summarizing.' });
    }
}


async function getDistinctId() {
    const data = await chrome.storage.local.get('anonymous_id');
    if (data.anonymous_id) {
        return data.anonymous_id;
    }
    const newId = crypto.randomUUID();
    await chrome.storage.local.set({ anonymous_id: newId });
    return newId;
}

async function trackEvent(event, properties = {}) {
    try {
        const distinctId = await getDistinctId();
        await fetch(`${POSTHOG_URL}/capture/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                event,
                properties: {
                    ...properties,
                    distinct_id: distinctId,
                    app_version: chrome.runtime.getManifest().version
                }
            })
        });
    } catch (error) {
        console.warn('Failed to capture analytics:', error);
    }
}