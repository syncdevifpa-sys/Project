const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
    vm = require('node:vm');
const { validateNotice } = require('../backend/src/services/notice-edit.service');
const png =
    'data:image/png;base64,' +
    fs.readFileSync('front/public/arcadia-logo-64.png').toString('base64');
test('capa aceita raster válido e remoção explícita; recusa URL, SVG, assinatura falsa e tipo inválido', () => {
    assert.equal(validateNotice({ capa: png }).capa, png);
    assert.equal(validateNotice({ capa: '' }).capa, null);
    assert.equal(Object.hasOwn(validateNotice({ titulo: 'Texto' }), 'capa'), false);
    for (const capa of [
        'https://example.test/photo.jpg',
        'data:image/svg+xml;base64,PHN2Zz4=',
        'data:image/png;base64,YWJj',
        {},
        false
    ])
        assert.throws(() => validateNotice({ capa }));
});
test('renderização ignora fontes executáveis e só adiciona capa quando há imagem', () => {
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/notice-cover.js', 'utf8'), {
        window: { Arcadia: A }
    });
    assert.equal(A.noticeCover.markup('javascript:alert(1)'), '');
    assert.equal(A.noticeCover.markup(''), '');
    assert.match(A.noticeCover.markup(png), /loading="lazy"/);
    const calls = [];
    const card = {
        classList: { add: (v) => calls.push(v) },
        insertAdjacentHTML: (position, html) => calls.push([position, html])
    };
    A.noticeCover.decorate(card, null);
    assert.equal(calls.length, 0);
    A.noticeCover.decorate(card, png);
    assert.equal(calls[0], 'ar-notice-with-cover');
});
