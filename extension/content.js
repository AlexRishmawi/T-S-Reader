(() => {
    function extractTermsText() {
        const contentSelectors = [
            'main',
            'article',
            '[role="main"]',
            '#terms',
            '#tos',
            '#privacy',
            '.terms',
            '.tos',
            '.terms-of-service',
            '.legal-content',
            '.entry-content',
            '.content'
        ];

        let targetElement = null;
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText && element.innerText.trim().length > 100) {
                targetElement = element;
                break;
            }
        }

        if (!targetElement) {
            targetElement = document.body;
        }

        const clone = targetElement.cloneNode(true);

        const noiseSelectors = [
            'script',
            'style',
            'noscript',
            'iframe',
            'svg',
            'canvas',
            'nav',
            'header',
            'footer',
            'aside',
            'button',
            'input',
            'select',
            'textarea',
            'form',
            '[aria-hidden="true"]',
            '[hidden]',
            '.nav',
            '.navbar',
            '.footer',
            '.sidebar',
            '.header',
            '.cookie-banner',
            '.cookie-consent',
            '.ad',
            '.banner',
            '.social-share'
        ];

        noiseSelectors.forEach(selector => {
            clone.querySelectorAll(selector).forEach(el => el.remove());
        });

        let text = clone.innerText || clone.content || '';

        text = text
            .replace(/[\t\u00A0]/g, ' ')            // Replace non-breaking spaces and tabs
            .replace(/[ ]+/g, ' ')                   // Collapse consecutive spaces
            .replace(/\r\n/g, '\n')                  // Normalize line breaks
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)         // Remove empty lines
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');             // Cap consecutive blank lines to max 2

        return text.trim();
    }
    return extractTermsText();
})();
