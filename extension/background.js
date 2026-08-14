const BACKEND_URL = 'http://localhost:5000/api/summarize';

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

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
            return safePost({ success: false, error: 'Cannot summarize internal browser pages.' });
        }

        const executionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        const extractedText = executionResult[0]?.result;

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
                    const data = JSON.parse(chunk.substring(6));
                    if (data.error) safePost({ error: data.error });
                    if (data.text) safePost({ status: 'chunk', text: data.text });
                    if (data.done) safePost({ status: 'done', cached: data.cached || false });
                }
                boundary = buffer.indexOf('\n\n');
            }
        }

    } catch (error) {
        console.error('Background script error:', error);
        safePost({ success: false, error: 'An unexpected error occurred while summarizing.' });
    }
}
