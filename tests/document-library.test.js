const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const {
    createLibrary,
    fileInfo,
    url,
    LIMITS
} = require('../backend/src/services/document-library.service');
const pdf = Buffer.from('%PDF-1.7\nmaterial\n%%EOF');
test('descrição aceita parágrafos, CRLF, tabulações e Unicode em PDF e edição', async () => {
    const f = database();
    const details = 'Resumo acadêmico com ação e 😀.\r\n\r\nSegundo parágrafo.\tReferência.';
    await f.library.create(
        7,
        { titulo: 'Resumo', nome_arquivo: 'resumo.pdf', descricao: details },
        pdf
    );
    assert.equal(f.writes[0].args[3], details.replace(/\r\n/g, '\n'));
    await f.library.update(7, 3, { descricao: details });
    assert.equal(f.writes.at(-1).args[1], details.replace(/\r\n/g, '\n'));
    assert.equal((await f.library.list(7)).limits.description, LIMITS.description);
});
test('descrição respeita limite Unicode compatível com maxlength sem truncar', async () => {
    for (const details of ['á'.repeat(3000), '😀'.repeat(1500)]) {
        const f = database();
        await f.library.create(7, {
            titulo: 'Limite',
            url: 'https://example.com',
            descricao: details
        });
        assert.equal(f.writes[0].args[3], details);
    }
    for (const details of ['á'.repeat(3001), '😀'.repeat(1500) + 'x']) {
        const f = database();
        await assert.rejects(
            f.library.create(7, {
                titulo: 'Limite',
                url: 'https://example.com',
                descricao: details
            }),
            { status: 400, message: 'Descrição muito longa. Use até 3000 caracteres.' }
        );
        await assert.rejects(f.library.update(7, 3, { descricao: details }), {
            status: 400,
            message: 'Descrição muito longa. Use até 3000 caracteres.'
        });
        assert.equal(f.writes.length, 0);
    }
});
test('descrição distingue tipo inválido e controles proibidos, sem recusar texto opcional vazio', async () => {
    const f = database();
    for (const value of [[], {}, 7])
        await assert.rejects(
            f.library.create(7, { titulo: 'Resumo', url: 'https://example.com', descricao: value }),
            { status: 400, message: 'Descrição inválida. Informe um texto.' }
        );
    for (const value of ['a\0b', 'a\x1bb', 'a\x7fb'])
        await assert.rejects(
            f.library.create(7, { titulo: 'Resumo', url: 'https://example.com', descricao: value }),
            {
                status: 400,
                message: 'Descrição inválida. Remova os caracteres de controle e tente novamente.'
            }
        );
    await f.library.create(7, {
        titulo: 'Resumo',
        url: 'https://example.com',
        descricao: ' \n\t '
    });
    assert.equal(f.writes[0].args[3], null);
});
test('autoria da obra é declarada, opcional e independente do publicador e permissões', async () => {
    const f = database({ withAuthors: true, currentAuthor: 'Autoria original' });
    const author = 'Autora & Autor 😀';
    await f.library.create(7, {
        titulo: 'Obra',
        url: 'https://example.com',
        autor_obra: author,
        publicador: 'Nome forjado',
        id_usuario: 99
    });
    assert.equal(f.writes[0].args[0], 7);
    assert.equal(f.writes[0].args.at(-1), author);
    await f.library.update(7, 3, { descricao: 'Resumo atualizado' });
    assert.equal(f.writes.at(-1).args[5], 'Autoria original');
    await f.library.update(7, 3, { autor_obra: '' });
    assert.equal(f.writes.at(-1).args[5], null);
    assert.equal((await f.library.list(7)).canSetAuthorship, true);
    await f.library.publicList();
    const projection = f.queries.at(-1).sql.split(' FROM ')[0];
    assert.match(projection, /i.autor_obra/);
    assert.match(projection, /u.nome AS publicador/);
    assert.doesNotMatch(projection, /email|senha/);
});
test('autoria valida Unicode e base legada não perde descrição nem inventa autor', async () => {
    const old = database();
    assert.equal((await old.library.list(7)).canSetAuthorship, false);
    await assert.rejects(
        old.library.create(7, { titulo: 'Obra', url: 'https://example.com', autor_obra: 'Autora' }),
        { status: 503 }
    );
    assert.equal(old.writes.length, 0);
    const f = database({ withAuthors: true });
    await f.library.create(7, {
        titulo: 'Obra',
        url: 'https://example.com',
        autor_obra: '😀'.repeat(250)
    });
    for (const autor_obra of ['a'.repeat(501), 'Nome\nOutro', {}, ['Nome']])
        await assert.rejects(
            f.library.create(7, { titulo: 'Obra', url: 'https://example.com', autor_obra }),
            { status: 400 }
        );
    assert.equal(f.writes.length, 1);
});
function database({
    teacher = false,
    admin = false,
    foreignFolder = false,
    foreignItem = false,
    folderHasItems = false,
    used = 0,
    total = 0,
    itemCount = 0,
    inactive = false,
    missing = false,
    reviewState = 'nenhuma',
    savedForeign = false,
    withAuthors = false,
    currentAuthor = null
} = {}) {
    const writes = [],
        queries = [],
        lifecycle = [];
    let created;
    const user = {
        id_usuario: 7,
        tipo_usuario: teacher ? 'docente' : 'discente',
        is_admin: admin ? 1 : 0,
        situacao: inactive ? 'inativo' : 'ativo'
    };
    const db = {
        async execute(sql, args = []) {
            queries.push({ sql, args });
            if (sql.includes('information_schema.COLUMNS'))
                return [withAuthors ? [{ COLUMN_TYPE: 'varchar(500)', IS_NULLABLE: 'YES' }] : []];
            if (missing) throw Object.assign(Error('missing'), { code: 'ER_NO_SUCH_TABLE' });
            if (/^SELECT .+ FROM usuarios WHERE id_usuario = \?/.test(sql)) return [[user]];
            if (sql.includes('FROM documento_pastas')) {
                if (sql.includes('COUNT')) return [[{ count: 0 }]];
                if (sql.includes('id_pasta ='))
                    return [foreignFolder ? [] : [{ id_pasta: args[0], nome: 'Aulas' }]];
                return [[{ id_pasta: 2, nome: 'Aulas' }]];
            }
            if (sql.includes('FROM documento_armazenamento')) return [[{ id: 1 }]];
            if (sql.startsWith('SELECT tamanho')) return [[{ tamanho: total }]];
            if (sql.includes('FROM documento_salvos')) {
                if (sql.includes('UNION ALL')) return [folderHasItems ? [{ id_item: 3 }] : []];
                if (sql.includes('COUNT'))
                    return [[{ count: sql.includes('FROM documento_itens') ? itemCount : 0 }]];
                if (sql.includes('id_salvo =')) return [savedForeign ? [] : [{ id_salvo: 12 }]];
                return [[]];
            }
            if (sql.includes('FROM documento_itens')) {
                if (sql.includes('COUNT')) return [[{ count: itemCount, used }]];
                if (sql.includes('JOIN usuarios')) {
                    if (sql.includes('i.id_item ='))
                        return [
                            foreignItem
                                ? []
                                : [
                                      {
                                          tipo: 'arquivo',
                                          nome_arquivo: 'aula.pdf',
                                          mime: 'application/pdf',
                                          conteudo: pdf
                                      }
                                  ]
                        ];
                    return [
                        [
                            {
                                id_item: 2,
                                titulo: 'Material',
                                autor: 'Docente',
                                tipo: 'link',
                                url: 'https://example.com'
                            }
                        ]
                    ];
                }
                if (sql.includes('LIMIT 1')) return [folderHasItems ? [{ id_item: 3 }] : []];
                if (sql.includes('id_item ='))
                    return [
                        foreignItem
                            ? []
                            : [
                                  {
                                      id_item: 3,
                                      id_usuario: 8,
                                      revisao: reviewState,
                                      versao_revisao: 1,
                                      id_pasta: 2,
                                      titulo: 'Material',
                                      autor_obra: currentAuthor,
                                      tipo: 'link',
                                      url: 'https://example.com',
                                      visibilidade: 'privado'
                                  }
                              ]
                    ];
                return [created ? [created] : []];
            }
            writes.push({ sql, args });
            if (sql.startsWith('INSERT INTO documento_itens'))
                created = {
                    id_item: 3,
                    id_pasta: args[1],
                    titulo: args[2],
                    descricao: args[3],
                    visibilidade: args[4],
                    tipo: args[5],
                    url: args[6],
                    nome_arquivo: args[7],
                    mime: args[8],
                    tamanho: args[9]
                };
            return [{ insertId: 3, affectedRows: 1 }];
        },
        async getConnection() {
            return {
                execute: db.execute,
                async beginTransaction() {
                    lifecycle.push('begin');
                },
                async commit() {
                    lifecycle.push('commit');
                },
                async rollback() {
                    lifecycle.push('rollback');
                },
                release() {
                    lifecycle.push('release');
                }
            };
        }
    };
    return { db, library: createLibrary(db), writes, queries, lifecycle };
}
test('biblioteca persiste links com pasta e descrição sem aceitar dono ou publicação forjados', async () => {
    const f = database();
    await f.library.create(7, {
        titulo: 'Aula',
        descricao: 'Leitura',
        url: 'https://example.com/aula',
        id_pasta: 2,
        id_usuario: 99
    });
    const write = f.writes[0];
    assert.equal(write.args[0], 7);
    assert.equal(write.args[1], 2);
    assert.equal(write.args[4], 'privado');
    const listed = await f.library.list(7);
    assert.equal(listed.items[0].titulo, 'Aula');
    assert.equal(listed.items[0].descricao, 'Leitura');
    assert.equal(listed.items[0].conteudo, undefined);
    assert.equal(listed.canPublish, false);
    await assert.rejects(
        f.library.create(7, {
            titulo: 'Ataque',
            url: 'https://example.com',
            visibilidade: 'publico',
            is_admin: true
        }),
        { status: 403 }
    );
    assert.ok(f.lifecycle.includes('rollback'));
});
test('professor ou admin publica conscientemente e aluno não acessa pasta/item de outra identidade', async () => {
    for (const role of [{ teacher: true }, { admin: true }]) {
        const f = database(role);
        await f.library.create(7, {
            titulo: 'Aula',
            url: 'https://example.com',
            visibilidade: 'publico'
        });
        assert.equal(f.writes[0].args[4], 'publico');
        assert.equal((await f.library.list(7)).canPublish, true);
    }
    const foreign = database({ foreignFolder: true, foreignItem: true });
    await assert.rejects(
        foreign.library.create(7, { titulo: 'Aula', url: 'https://example.com', id_pasta: 900 }),
        { status: 404 }
    );
    await assert.rejects(foreign.library.update(7, 900, { titulo: 'Mudança' }), { status: 404 });
    await assert.rejects(foreign.library.remove(7, 900), { status: 404 });
    await assert.rejects(foreign.library.download(7, 900), { status: 404 });
    assert.equal(foreign.writes.length, 0);
});
test('arquivos validam tamanho e assinatura e não seguem links nem aceitam HTML executável', () => {
    assert.equal(fileInfo(pdf, 'aula.pdf').mime, 'application/pdf');
    for (const [buffer, name] of [
        [Buffer.from('<html>script</html>'), 'aula.pdf'],
        [pdf, 'x.png'],
        [pdf, '../x.pdf'],
        [pdf, 'x.html']
    ])
        assert.throws(() => fileInfo(buffer, name));
    assert.throws(() => fileInfo(Buffer.alloc(LIMITS.file + 1), 'x.pdf'), { status: 413 });
    for (const address of [
        'javascript:alert(1)',
        'data:text/html,hi',
        'file:///tmp/a',
        'https://user:pass@example.com'
    ])
        assert.throws(() => url(address), { status: 400 });
    assert.equal(url('https://example.com/a'), 'https://example.com/a');
});
test('quotas recusam gravação e a quota total é lida com bloqueio após o mutex global', async () => {
    for (const options of [
        { used: LIMITS.user },
        { total: LIMITS.total },
        { itemCount: LIMITS.items }
    ]) {
        const f = database(options);
        await assert.rejects(
            f.library.create(7, { titulo: 'Aula', nome_arquivo: 'aula.pdf' }, pdf),
            { status: 409 }
        );
        assert.equal(f.writes.length, 0);
        assert.ok(f.lifecycle.includes('rollback'));
    }
    const f = database();
    await f.library.create(7, { titulo: 'Aula', nome_arquivo: 'aula.pdf' }, pdf);
    const mutex = f.queries.findIndex((q) => q.sql.includes('documento_armazenamento'));
    const currentRead = f.queries.findIndex(
        (q) => q.sql === 'SELECT tamanho FROM documento_itens FOR UPDATE'
    );
    assert.ok(mutex >= 0 && currentRead > mutex);
    assert.equal(f.writes[0].args[10], pdf);
});
test('pastas podem ser renomeadas; pasta ocupada não exclui conteúdo e transferência valida destino', async () => {
    const f = database({ folderHasItems: true });
    await f.library.saveFolder(7, { nome: 'Revisão' }, 2);
    assert.equal(f.writes[0].args[0], 'Revisão');
    await assert.rejects(f.library.removeFolder(7, 2), { status: 409 });
    assert.equal(f.writes.filter((w) => w.sql.startsWith('DELETE')).length, 0);
    const foreign = database({ foreignFolder: true });
    await assert.rejects(foreign.library.update(7, 3, { id_pasta: 8 }), { status: 404 });
    assert.equal(foreign.writes.length, 0);
});
test('catálogo público usa projeção sem blobs, contatos ou pastas e exige autor ativo autorizado', async () => {
    const f = database();
    const rows = await f.library.publicList();
    assert.equal(rows.length, 1);
    const query = f.queries.find((entry) =>
        entry.sql.includes('FROM documento_itens i JOIN usuarios')
    ).sql;
    assert.match(query, /visibilidade = 'publico'/);
    assert.match(query, /u.situacao = 'ativo'/);
    assert.match(query, /u.tipo_usuario = 'docente' OR u.is_admin = 1/);
    assert.doesNotMatch(query.split(' FROM ')[0], /conteudo|id_pasta|email|senha/);
});

test('salvar público cria só referência privada e mover/remover referência exige propriedade', async () => {
    const f = database();
    await f.library.savePublic(7, 3, { id_pasta: 2, id_usuario: 99 });
    assert.equal(f.writes.length, 1);
    assert.match(f.writes[0].sql, /INSERT INTO documento_salvos/);
    assert.deepEqual(f.writes[0].args, [7, 3, 2]);
    await f.library.changeSaved(7, 12, { id_pasta: null });
    assert.match(f.writes[1].sql, /UPDATE documento_salvos/);
    const foreign = database({ savedForeign: true });
    await assert.rejects(foreign.library.changeSaved(7, 12, null), { status: 404 });
    assert.equal(foreign.writes.length, 0);
});

test('aluno envia privado sem publicar; apenas administração decide e recusa exige motivo', async () => {
    const student = database();
    await student.library.submit(7, 3);
    assert.match(student.writes[0].sql, /revisao = 'pendente'/);
    assert.doesNotMatch(student.writes[0].sql, /visibilidade = 'publico'/);
    const teacher = database({ teacher: true, reviewState: 'pendente' });
    await assert.rejects(teacher.library.review(7, 3, { decisao: 'aprovar', versao: 1 }), {
        status: 403
    });
    await assert.rejects(teacher.library.reviewList(7), { status: 403 });
    const admin = database({ admin: true, reviewState: 'pendente' });
    await assert.rejects(
        admin.library.review(7, 3, { decisao: 'recusar', versao: 1, motivo: '' }),
        { status: 400 }
    );
    await admin.library.review(7, 3, { decisao: 'aprovar', versao: 1 });
    assert.deepEqual(admin.writes[0].args, ['aprovado', 'publico', null, 7, 3]);
    assert.doesNotMatch(admin.writes[0].sql, /id_usuario\s*=/);
    const refused = database({ admin: true, reviewState: 'pendente' });
    await refused.library.review(7, 3, {
        decisao: 'recusar',
        versao: 1,
        motivo: 'Revisar referências'
    });
    assert.equal(refused.writes[0].args[0], 'recusado');
    assert.equal(refused.writes[0].args[1], 'privado');
    assert.equal(refused.writes[0].args[2], 'Revisar referências');
    const stale = database({ admin: true, reviewState: 'pendente' });
    await assert.rejects(stale.library.review(7, 3, { decisao: 'aprovar', versao: 2 }), {
        status: 409
    });
    assert.equal(stale.writes.length, 0);
    const finished = database({ admin: true, reviewState: 'aprovado' });
    await assert.rejects(
        finished.library.review(7, 3, { decisao: 'recusar', versao: 1, motivo: 'Duplicado' }),
        { status: 409 }
    );
});

test('HTTP exige sessão, recebe binário limitado e entrega attachment privado sem cache', async (t) => {
    process.env.JWT_SECRET =
        process.env.JWT_SECRET || 'library-http-tests-secret-with-32-characters';
    const f = database();
    const db = require('../backend/src/config/database');
    const token = jwt.sign({ id_usuario: 7, tipo_usuario: 'discente' }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    t.mock.method(db, 'execute', async (sql, args) =>
        sql.includes('FROM tokens t')
            ? [args[0] === hash && args[1] === 7 ? [{ id_token: 1, is_admin: 0 }] : []]
            : sql.includes('i.id_item =') && args[0] === 900
              ? [[]]
              : f.db.execute(sql, args)
    );
    t.mock.method(db, 'getConnection', () => f.db.getConnection());
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use('/api/document-library', require('../backend/src/routes/documentLibrary.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(
        () =>
            new Promise((resolve) => {
                server.close(resolve);
                server.closeAllConnections();
            })
    );
    const base = `http://127.0.0.1:${server.address().port}/api/document-library`;
    const previews = require('../backend/src/services/document-preview.service');
    let rendered = 0;
    t.mock.method(previews, 'preview', async () => {
        rendered++;
        return Buffer.from('thumbnail');
    });
    assert.equal((await fetch(base)).status, 401);
    const headers = { Authorization: 'Bearer ' + token };
    assert.equal((await fetch(base + '/items/3/preview')).status, 401);
    assert.equal((await fetch(base + '/items/900/preview', { headers })).status, 404);
    assert.equal((await fetch(base + '/reviews/3/preview', { headers })).status, 403);
    assert.equal(rendered, 0);
    const thumbnail = await fetch(base + '/items/3/preview', { headers });
    assert.equal(thumbnail.status, 200);
    assert.equal(thumbnail.headers.get('Cache-Control'), 'no-store');
    assert.equal(thumbnail.headers.get('Content-Type'), 'image/png');
    assert.equal(thumbnail.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(rendered, 1);
    const summary = 'Primeiro parágrafo: ação, ç e 😀.\n\nSegundo parágrafo do documento.';
    const metadata = new URLSearchParams({
        titulo: 'Aula',
        nome_arquivo: 'aula.pdf',
        id_usuario: '99',
        descricao: summary
    });
    const upload = await fetch(base + '/files?' + metadata, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/octet-stream' },
        body: pdf
    });
    assert.equal(upload.status, 201);
    assert.equal(f.writes[0].args[0], 7);
    assert.equal(f.writes[0].args[3], summary);
    const form = new FormData();
    form.append('titulo', 'Texto Unicode');
    form.append('descricao', '漢'.repeat(2998) + '\n\n');
    form.append('nome_arquivo', 'aula.pdf');
    form.append('arquivo', new Blob([pdf]), 'aula.pdf');
    const multipart = await fetch(base + '/files', { method: 'POST', headers, body: form });
    assert.equal(multipart.status, 201);
    assert.equal(f.writes.at(-1).args[3], '漢'.repeat(2998));
    const download = await fetch(base + '/items/3/download', { headers });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('Content-Type'), 'application/octet-stream');
    assert.equal(download.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(download.headers.get('Cache-Control'), 'no-store');
    assert.match(download.headers.get('Content-Disposition'), /^attachment;/);
    assert.ok(Buffer.from(await download.arrayBuffer()).equals(pdf));
    const tooLarge = await fetch(base + '/files?titulo=Excesso&nome_arquivo=x.pdf', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/octet-stream' },
        body: Buffer.alloc(LIMITS.file + 1)
    });
    assert.equal(tooLarge.status, 413);
});
