(function (A) {
    'use strict';
    A.noticeText = {
        render(target, value) {
            const text = String(value ?? '');
            target.replaceChildren();
            target.style.whiteSpace = 'pre-wrap';
            target.style.overflowWrap = 'anywhere';
            let offset = 0;
            const appendText = (value) => {
                if (value) {
                    const span = document.createElement('span');
                    span.textContent = value;
                    target.append(span);
                }
            };
            for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) {
                let token = match[0].replace(/[.,;:!?]+$/g, '');
                while (
                    token.endsWith(')') &&
                    (token.match(/\)/g) || []).length > (token.match(/\(/g) || []).length
                )
                    token = token.slice(0, -1);
                appendText(text.slice(offset, match.index));
                let url;
                try {
                    url = new URL(token);
                } catch {}
                if (url && ['http:', 'https:'].includes(url.protocol) && url.hostname) {
                    const anchor = document.createElement('a');
                    anchor.href = url.href;
                    anchor.textContent = token;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    target.append(anchor);
                    appendText(match[0].slice(token.length));
                } else appendText(match[0]);
                offset = match.index + match[0].length;
            }
            appendText(text.slice(offset));
        }
    };
})((window.Arcadia = window.Arcadia || {}));
