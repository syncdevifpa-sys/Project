const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('páginas da API carregam um único aviso de conexão antes dos controladores, inclusive com defer', () => {
    const files = fs.readdirSync('frontend').filter((name) => name.endsWith('.html'));
    for (const name of files) {
        const html = fs.readFileSync(path.join('frontend', name), 'utf8');
        const scripts = [
            ...html.matchAll(/<script\b([^>]*\bsrc="([^"]+)"[^>]*)>\s*<\/script>/g)
        ].map((match) => ({ source: match[2], deferred: /\bdefer\b/.test(match[1]) }));
        if (!scripts.some((script) => script.source === 'js/api.js')) continue;
        assert.equal(
            scripts.filter((script) => script.source === 'js/connection-feedback.js').length,
            1,
            name
        );
        const ordered = [
            ...scripts.filter((script) => !script.deferred),
            ...scripts.filter((script) => script.deferred)
        ];
        assert.ok(
            ordered.findIndex((script) => script.source === 'js/connection-feedback.js') <
                ordered.findIndex((script) => script.source === 'js/api.js'),
            name
        );
        assert.equal((html.match(/href="connection-feedback\.css"/g) || []).length, 1, name);
    }
});
test('documentos legais possuem aviso de rede quando abertos como página', () => {
    for (const name of ['cookies.html', 'privacy.html', 'terms.html']) {
        const html = fs.readFileSync(path.join('frontend', name), 'utf8');
        assert.match(html, /src="js\/connection-feedback\.js"/, name);
        assert.match(html, /href="connection-feedback\.css"/, name);
    }
});
