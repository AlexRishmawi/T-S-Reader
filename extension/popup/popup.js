if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
    const stateIdle = document.getElementById('state-idle');
    const stateLoading = document.getElementById('state-loading');
    const stateError = document.getElementById('state-error');
    const stateSuccess = document.getElementById('state-success');

    const summarizeBtn = document.getElementById('summarize-btn');
    const retryBtn = document.getElementById('retry-btn');

    const summaryContent = document.getElementById('summary-content');
    const cacheIndicator = document.getElementById('cache-indicator');

    const errorIcon = document.getElementById('error-icon');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');

    function setState(state) {
        stateIdle?.classList.remove('active');
        stateLoading?.classList.remove('active');
        stateError?.classList.remove('active');
        stateSuccess?.classList.remove('active');

        switch (state) {
            case 'idle':
                stateIdle.classList.add('active');
                break;
            case 'loading':
                stateLoading.classList.add('active');
                break;
            case 'error':
                stateError.classList.add('active');
                break;
            case 'success':
                stateSuccess.classList.add('active');
                break;
        }
    }

    function requestSummary() {
        setState('loading');
        summaryContent.replaceChildren();
        let fullText = '';

        const port = chrome.runtime.connect({ name: "stream-summary" });

        port.postMessage({ action: 'SUMMARIZE' });

        port.onMessage.addListener((msg) => {
            if (msg.error) {
                handleError(msg.error);
                port.disconnect();
            } else if (msg.status === 'chunk') {
                setState('success');
                fullText += msg.text;
                summaryContent.replaceChildren(formatMarkDown(fullText));
            } else if (msg.status === 'done') {
                cacheIndicator.style.display = msg.cached ? 'flex' : 'none';
                port.disconnect();
            }
        });
    }

    function handleError(error) {
        const errorMsg = String(error?.toLowerCase())
        let title = "Something Went Wrong";
        let message = "We were unable to process this page. Our service may be temporarily unavailable. Please try again later.";

        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            title = "Rate Limit Exceeded";
            message = "You have had made too many requests recently. Please wait and try again later.";
        } else if (errorMsg.includes('internal server error')) {
            title = "Internal Server Error";
            message = "The server encountered an unexpected condition. Please try again later.";
        } else if (errorMsg.includes('invalid input')) {
            title = "Invalid Input";
            message = "The input text provided is invalid or empty. Please check and try again.";
        } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('500')) {
            title = "Service Unavailable";
            message = "Our service is unavailable at the moment. Please check your connection and try again later.";
        }
        if (title) errorTitle.textContent = title;
        if (message) errorMessage.textContent = message;
        setState('error');
    }

    if (summarizeBtn) summarizeBtn.addEventListener('click', requestSummary);
    if (retryBtn) retryBtn.addEventListener('click', () => setState('idle'));

    });
}

function formatMarkDown(text, doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc) return null;
    const fragment = doc.createDocumentFragment();
    if (!text) return fragment;

    const lines = text.split('\n');
    let currentList = null;

    function appendInlineFormattedText(parent, str) {
        if (!str) return;
        const parts = str.split(/(\*\*.*?\*\*)/g);
        for (const part of parts) {
            if (!part) continue;
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const strong = doc.createElement('strong');
                strong.textContent = part.slice(2, -2);
                parent.appendChild(strong);
            } else {
                parent.appendChild(doc.createTextNode(part));
            }
        }
    }

    lines.forEach(line => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!currentList) {
                currentList = doc.createElement('ul');
                fragment.appendChild(currentList);
            }
            const li = doc.createElement('li');
            appendInlineFormattedText(li, line.substring(2));
            currentList.appendChild(li);
        } else {
            currentList = null;
            const p = doc.createElement('p');
            appendInlineFormattedText(p, line);
            fragment.appendChild(p);
        }
    });

    return fragment;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatMarkDown };
}