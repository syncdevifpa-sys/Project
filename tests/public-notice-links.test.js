const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createPublicNoticeRouter } = require('../backend/src/routes/public-notice.routes');
const { path } = require('../frontend/js/notice-links');

test('notícia pública entrega endereço canônico, texto e capa próprios no HTML inicial', async (t) => {
    const rows = {
        9: { id_aviso: 9, titulo: 'Biblioteca & extensão', resumo: 'Novidades <script>alert(1)</script>', descricao: 'Conteúdo público', situacao: 'publicado', publico_alvo: 'todos', capa: 'data:image/png;base64,aGVsbG8=' },
        10: { id_aviso: 10, titulo: 'Título secreto', descricao: 'Texto secreto', situacao: 'publicado', publico_alvo: 'docente', capa: 'data:image/png;base64,aGVsbG8=' },
        11: { id_aviso: 11, titulo: 'Rascunho secreto', situacao: 'rascunho', publico_alvo: 'todos' }
    };
    const app = express();
    app.use(createPublicNoticeRouter({ findNoticeById: async id => rows[id] }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
    const origin = 'http://127.0.0.1:' + server.address().port;
    assert.equal(path(rows[9]), '/noticias/9/biblioteca-extensao');
    const response = await fetch(origin + path(rows[9]));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /og:title" content="Biblioteca &amp; extensão/);
    assert.match(html, /og:image" content="https:\/\/portalarcadia.vercel.app\/noticias\/9\/capa/);
    assert.match(html, /data-notice-id="9"/);
    assert.match(html, /<base href="\/">/);
    assert.match(html, /Conteúdo público/);
    assert.ok(!html.includes('<script>alert(1)</script>'));
    const oldSlug = await fetch(origin + '/noticias/9/outro-titulo', { redirect: 'manual' });
    assert.equal(oldSlug.headers.get('location'), path(rows[9]));
    assert.equal((await fetch(origin + '/noticias/9/capa')).headers.get('content-type'), 'image/png');
    for (const id of [10, 11]) {
        const restricted = await fetch(origin + '/noticias/' + id + '/reservado');
        const body = await restricted.text();
        assert.match(body, /noindex,nofollow/);
        assert.ok(!body.includes(rows[id].titulo));
        assert.equal((await fetch(origin + '/noticias/' + id + '/capa')).status, 404);
    }
    assert.equal((await fetch(origin + '/noticias/99/ausente')).status, 404);
});
