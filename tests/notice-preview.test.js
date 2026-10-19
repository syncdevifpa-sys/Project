const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../tools/final-ui-preview.cjs');
const db = require('../backend/src/config/database');
let server, base;
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.end();
});
const send = (path, method, data) =>
    fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
test('prévia salva a troca de Aviso para Notícia e os públicos selecionados sem transação de banco', async () => {
    assert.equal((await send('/api/notices/7', 'PUT', { tipo_publicacao: 'aviso' })).status, 200);
    const previous = await (await fetch(base + '/api/notices/7')).json();
    assert.equal(previous.tipo_publicacao, 'aviso');
    assert.equal(
        (
            await send('/api/notices/7', 'PUT', {
                tipo_publicacao: 'noticia',
                publico_alvo: ['docente', 'servidor'],
                id_usuario: 99
            })
        ).status,
        200
    );
    const saved = await (await fetch(base + '/api/notices/7')).json();
    assert.equal(saved.tipo_publicacao, 'noticia');
    assert.equal(saved.publico_alvo, 'docente,servidor');
    assert.equal(saved.id_usuario, 4);
    assert.equal(saved.data_publicacao, previous.data_publicacao);
    assert.equal((await (await fetch(base + '/api/notices')).json())[0].tipo_publicacao, 'noticia');
});
test('prévia cria Notícia; falha de validação preserva a publicação existente', async () => {
    const created = await send('/api/notices', 'POST', {
        titulo: 'Notícia fictícia',
        resumo: 'Teste em memória',
        tipo_publicacao: 'noticia',
        publico_alvo: ['docente', 'servidor']
    });
    assert.equal(created.status, 201);
    const { noticeId } = await created.json();
    const saved = await (await fetch(base + '/api/notices/' + noticeId)).json();
    assert.equal(saved.tipo_publicacao, 'noticia');
    assert.equal(saved.publico_alvo, 'docente,servidor');
    assert.equal(
        (await send('/api/notices/' + noticeId, 'PUT', { tipo_publicacao: 'invalido' })).status,
        400
    );
    assert.equal(
        (await (await fetch(base + '/api/notices/' + noticeId)).json()).tipo_publicacao,
        'noticia'
    );
});
