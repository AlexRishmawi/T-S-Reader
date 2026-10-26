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

    function appendFormattedInline(parent, text) {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        parts.forEach((part, index) => {
            if (!part) return;
            if (index % 2 === 1) {
                const strong = document.createElement('strong');
                strong.textContent = part;
                parent.appendChild(strong);
            } else {
                parent.appendChild(document.createTextNode(part));
            }
        });
    }

    function getSectionClass(headingText) {
        const lower = headingText.toLowerCase();
        if (lower.includes('red flag') || lower.includes('gotcha')) return 'section-warning';
        if (lower.includes('data') || lower.includes('privacy')) return 'section-privacy';
        if (lower.includes('billing') || lower.includes('cancel')) return 'section-billing';
        if (lower.includes('right')) return 'section-rights';
        return 'section-default';
    }

    function renderSummary(container, text) {
        if (!text) {
            container.replaceChildren();
            return;
        }

        const fragment = document.createDocumentFragment();
        const lines = text.split('\n');
        let currentSection = null;
        let currentList = null;

        const ensureSection = () => {
            if (!currentSection) {
                currentSection = document.createElement('section');
                currentSection.className = 'summary-section section-default';
                fragment.appendChild(currentSection);
            }
            return currentSection;
        };

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.startsWith('#')) {
                const headingText = trimmed.replace(/^#{1,4}\s*/, '').trim();
                if (!headingText) return;

                currentList = null;
                currentSection = document.createElement('section');
                currentSection.className = `summary-section ${getSectionClass(headingText)}`;

                const h3 = document.createElement('h3');
                h3.className = 'section-title';
                appendFormattedInline(h3, headingText);
                currentSection.appendChild(h3);
                fragment.appendChild(currentSection);
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const section = ensureSection();
                if (!currentList) {
                    currentList = document.createElement('ul');
                    section.appendChild(currentList);
                }
                const li = document.createElement('li');
                appendFormattedInline(li, trimmed.substring(2).trim());
                currentList.appendChild(li);
            } else {
                currentList = null;
                const section = ensureSection();
                const p = document.createElement('p');
                appendFormattedInline(p, trimmed);
                section.appendChild(p);
            }
        });

        container.replaceChildren(fragment);
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
                renderSummary(summaryContent, fullText);
            } else if (msg.status === 'done') {
                cacheIndicator.style.display = msg.cached ? 'flex' : 'none';
                port.disconnect();
            }
        });
    }

    function handleError(error) {
        const errorMsg = String(error || '').toLowerCase();
        let icon = '⚠️';
        let title = 'Unable to Summarize';
        let message = "We couldn't finish summarizing this page right now. Please try again in a moment.";

        if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('high demand')) {
            icon = '⏳';
            title = 'High Demand Right Now';
            message = 'The summarization service is experiencing temporary high traffic. Please wait a few seconds and try again.';
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            icon = '⏱️';
            title = 'Too Many Requests';
            message = "You've reached the temporary request limit. Please wait a little while before summarizing another page.";
        } else if (errorMsg.includes('internal browser page')) {
            icon = '🔒';
            title = 'Unsupported Page';
            message = "Browser settings and internal pages can't be summarized. Open a website's Terms or Privacy page instead.";
        } else if (errorMsg.includes('extract readable text') || errorMsg.includes('invalid input') || errorMsg.includes('no active tab')) {
            icon = '📄';
            title = 'No Readable Terms Found';
            message = "We couldn't find enough readable text on this page. Try opening the full Terms of Service or Privacy Policy.";
        } else if (errorMsg.includes('failed to fetch')) {
            icon = '🔌';
            title = 'Unable to Connect';
            message = 'Could not reach the summarization server. Check your internet connection or try again shortly.';
        } else if (errorMsg.includes('internal server error') || errorMsg.includes('500')) {
            icon = '⚠️';
            title = 'Temporary Server Issue';
            message = 'Something went wrong on our end while analyzing this page. Please try again shortly.';
        }

        if (errorIcon) errorIcon.textContent = icon;
        if (errorTitle) errorTitle.textContent = title;
        if (errorMessage) errorMessage.textContent = message;
        setState('error');
    }

    if (summarizeBtn) summarizeBtn.addEventListener('click', requestSummary);
    if (retryBtn) retryBtn.addEventListener('click', () => setState('idle'));

});