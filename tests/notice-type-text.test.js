const { test, after } = require('node:test'),
    assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
const db = require('../backend/src/config/database'),
    model = require('../backend/src/models/notices.model'),
    { editNotice, validateNotice } = require('../backend/src/services/notice-edit.service');
after(() => db.end());
test('links renderizam apenas HTTP/HTTPS por DOM, preservando texto malicioso e quebras', () => {
    function node(tag) {
        return {
            tag,
            style: {},
            children: [],
            textContent: '',
            append(...v) {
                this.children.push(...v);
            },
            replaceChildren() {
                this.children = [];
            }
        };
    }
    const A = {},
        context = { window: { Arcadia: A }, document: { createElement: node }, URL };
    vm.runInNewContext(fs.readFileSync('front/js/notice-text.js', 'utf8'), context);
    const target = node('p'),
        text =
            '<img src=x onerror=alert(1)>\nhttps://example.test/a?x=1&y=2. (http://example.test/path) javascript:alert(1) data:text/html,no';
    A.noticeText.render(target, text);
    const links = target.children.filter((n) => n.tag === 'a');
    assert.equal(links.length, 2);
    assert.equal(links[0].href, 'https://example.test/a?x=1&y=2');
    assert.equal(links[1].href, 'http://example.test/path');
    assert.ok(links.every((n) => n.rel === 'noopener noreferrer' && n.target === '_blank'));
    assert.equal(target.children.map((n) => n.textContent).join(''), text);
    assert.equal(target.style.whiteSpace, 'pre-wrap');
    assert.equal(
        target.children.some((n) => n.tag === 'img' || n.tag === 'script'),
        false
    );
});
test('banco legado consulta Aviso por alias e não grava Notícia sem migração', async (t) => {
    const calls = [];
    t.mock.method(db, 'execute', async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SHOW COLUMNS')) return [[]];
        return sql.includes('SELECT')
            ? [[{ id_aviso: 7, tipo_publicacao: 'aviso' }]]
            : [{ insertId: 7 }];
    });
    assert.equal((await model.listNotices())[0].tipo_publicacao, 'aviso');
    assert.ok(calls.some((c) => c.sql.includes("'aviso' AS tipo_publicacao")));
    await model.createNotice({
        id_usuario: 4,
        titulo: 'Legado',
        resumo: 'Resumo',
        tipo_publicacao: 'aviso'
    });
    const insert = calls.find((c) => c.sql.includes('INSERT'));
    assert.doesNotMatch(insert.sql, /tipo_publicacao/);
    let updates = 0;
    t.mock.method(db, 'getConnection', async () => {
        updates++;
    });
    await assert.rejects(
        model.createNotice({
            id_usuario: 4,
            titulo: 'Notícia',
            resumo: 'r',
            tipo_publicacao: 'noticia'
        }),
        (e) => e.status === 409
    );
    await assert.rejects(editNotice(7, { tipo_publicacao: 'noticia' }, 4), (e) => e.status === 409);
    assert.equal(updates, 0);
});
test('banco migrado persiste tipo na criação, leitura e edição sem alterar categoria', async (t) => {
    let saved = { id_aviso: 7, id_usuario: 4, categoria: 'evento', tipo_publicacao: 'aviso' };
    t.mock.method(db, 'execute', async (sql, params) => {
        if (sql.startsWith('SHOW COLUMNS')) return [[{ Field: 'tipo_publicacao' }]];
        if (sql.includes('INSERT')) {
            assert.match(sql, /tipo_publicacao/);
            saved.tipo_publicacao = params.at(-1);
            return [{ insertId: 7 }];
        }
        return [[saved]];
    });
    await model.createNotice({
        id_usuario: 4,
        titulo: 'Nova',
        resumo: 'Texto',
        tipo_publicacao: 'noticia'
    });
    assert.equal((await model.findNoticeById(7)).tipo_publicacao, 'noticia');
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql, params) => {
            if (sql.startsWith('SELECT id_usuario, is_admin'))
                return [[{ id_usuario: 4, is_admin: 0 }]];
            if (sql.startsWith('SELECT')) return [[{ id_usuario: 4 }]];
            assert.match(sql, /tipo_publicacao = \?/);
            saved.tipo_publicacao = params[0];
            return [{ affectedRows: 1 }];
        }
    }));
    await editNotice(7, { tipo_publicacao: 'aviso' }, 4);
    assert.equal((await model.findNoticeById(7)).tipo_publicacao, 'aviso');
    assert.equal(saved.categoria, 'evento');
    assert.throws(
        () => validateNotice({ tipo_publicacao: 'edital' }),
        (e) => e.status === 400
    );
    const sql = fs.readFileSync('backend/db/history/pre-1.1.25/add-notice-type.sql', 'utf8');
    assert.match(sql, /information_schema\.COLUMNS/);
    assert.match(sql, /DEFAULT ''aviso''/);
    assert.doesNotMatch(sql, /\bDROP\b|\bDELETE\b|\bUPDATE\b/);
});
