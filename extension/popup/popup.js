document.addEventListener('DOMContentLoaded', () => {
    const stateIdle = document.getElementById('state-idle');
    const stateLoading = document.getElementById('state-loading');
    const stateError = document.getElementById('state-error');
    const stateSuccess = document.getElementById('state-success');

    const summarizeBtn = document.getElementById('summarize-btn');
    const retryBtn = document.getElementById('retry-btn');

    const summaryContent = document.getElementById('summary-content');
    const errorMessage = document.getElementById('error-message');
    const cacheIndicator = document.getElementById('cache-indicator');

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

    function formatMarkDown(text) {
        if(!text) return '';
        let formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        const lines = formatted.split('\n');
        let inList = false;
        let htmlResult = '';

        lines.forEach(line => {
            if (line.startsWith('- ') || line.startsWith('* ')) {
                if (!inList) {
                    htmlResult += '<ul>';
                    inList = true;
                }
                htmlResult += `<li>${line.substring(2)}</li>`;
            } else {
                if (inList) {
                    htmlResult += '</ul>';
                    inList = false;
                }
                htmlResult += `<p>${line}</p>`;
            }
        });

        if (inList) {
            htmlResult += '</ul>';
        }

        return htmlResult;
    }

    function requestSummary() {
        setState('loading');
        summaryContent.innerHTML = '';
        let fullText = '';

        const port = chrome.runtime.connect({ name: "stream-summary" });

        port.postMessage({ action: 'SUMMARIZE' });

        port.onMessage.addListener((msg) => {
            if (msg.error) {
                errorMessage.textContent = msg.error;
                setState('error');
                port.disconnect();
            } else if (msg.status === 'chunk') {
                setState('success');
                fullText += msg.text;
                summaryContent.innerHTML = formatMarkDown(fullText);
            } else if (msg.status === 'done') {
                cacheIndicator.style.display = msg.cached ? 'flex' : 'none';
                port.disconnect();
            }
        });
    }

    if (summarizeBtn) summarizeBtn.addEventListener('click', requestSummary);
    if (retryBtn) retryBtn.addEventListener('click', () => setState('idle'));

});