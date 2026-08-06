const BACKEND_URL = 'http://localhost:5000/api/summarize';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
       handleSummarize(sendResponse);
       return true; // Keep the message channel open for asynchronous response
    }
});

async function handleSummarize(sendResponse) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            return sendResponse({ success: false, error: 'No active tab found.' });\
        }

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
            return sendResponse({ success: false, error: 'Cannot summarize internal browser pages.' });
        }

        const executionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        const extractedText = executionResult[0].result;

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: extractedText, url: tab.url })
        });
        
        const data = await response.json();

        if (!response.ok) {
            return sendResponse({ success: false, error: data.error || 'An error occurred while summarizing.' });
        }

        sendResponse({ success: true, summary: data.summary, cached: data.cached || false });

    } catch (error) {
        console.error('Background script error:', error);
        sendResponse({ success: false, error: 'Failed to connect to proxy.' });
    }
}
