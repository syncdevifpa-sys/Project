const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { valid, contrast, readable } = require('../front/js/class-appearance');

test('cores de banner rejeitam valores inválidos e corrigem contraste insuficiente', () => {
    assert.equal(valid('var(--ink)'), false);
    assert.equal(valid('#112233'), true);
    assert.equal(readable('#ffffff', '#ffffff'), '#000000');
    assert.equal(readable('#000000', '#000000'), '#ffffff');
    assert.equal(readable('#112233', '#ffffff'), '#ffffff');
    assert.equal(readable('red', '#ffffff'), null);
    assert.equal(contrast('#ffffff', '#000000'), 21);
    // Confere todo o intervalo de cinza e cores intermediárias, inclusive próximas do limiar.
    for (let n = 0; n <= 255; n++) {
        const background = '#' + n.toString(16).padStart(2, '0').repeat(3);
        assert.ok(contrast(background, readable(background, '#777777')) >= 4.5);
    }
});

test('todos os banners de página carregam personalização e estilos circulares do calendário', () => {
    const front = path.join(__dirname, '../front');
    const pages = readdirSync(front).filter((p) => p.endsWith('.html'));
    let count = 0;
    for (const page of pages) {
        const html = readFileSync(path.join(front, page), 'utf8');
        if (!/class="(?:ar-hero |ar-detail |hero-card")/.test(html)) continue;
        count++;
        assert.equal((html.match(/src="js\/class-appearance.js"/g) || []).length, 1, page);
        assert.ok(html.includes('href="banner-appearance.css"'), page);
        assert.ok(html.includes('href="content-views.css"'), page);
    }
    assert.equal(count, 11);
});
