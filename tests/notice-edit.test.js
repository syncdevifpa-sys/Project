const { test, after } = require('node:test'),
    assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
const db = require('../backend/src/config/database'),
    { editNotice, validateNotice } = require('../backend/src/services/notice-edit.service');
after(() => db.end());
function tx(t, { actor = { id_usuario: 4, is_admin: 0 }, owner = 4, fail = false } = {}) {
    const calls = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => calls.push('begin'),
        commit: async () => calls.push('commit'),
        rollback: async () => calls.push('rollback'),
        release: () => calls.push('release'),
        execute: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.startsWith('SELECT id_usuario, is_admin')) return [actor ? [actor] : []];
            if (sql.startsWith('SELECT id_usuario FROM avisos'))
                return [owner === null ? [] : [{ id_usuario: owner }]];
            if (fail && sql.startsWith('UPDATE')) throw Error('db failure');
            return [{ affectedRows: 1 }];
        }
    }));
    return calls;
}
test('autor edita publicação e público externo sem transferir autoria ou privilégios', async (t) => {
    const calls = tx(t);
    await editNotice(
        7,
        {
            titulo: 'Novo título',
            publico_alvo: 'externo',
            situacao: 'rascunho',
            id_usuario: 99,
            is_admin: true
        },
        4
    );
    const update = calls.find((c) => c.sql?.startsWith('UPDATE'));
    assert.doesNotMatch(update.sql, /id_usuario|is_admin/);
    assert.deepEqual(update.params, ['Novo título', 'externo', 'rascunho', 7]);
    assert.equal(calls.at(-2), 'commit');
});
test('outro autor ou sessão inativa não edita; admin atual pode editar outros', async (t) => {
    for (const setup of [{ owner: 9 }, { actor: null }]) {
        const calls = tx(t, setup);
        await assert.rejects(editNotice(7, { resumo: 'Resumo' }, 4), (e) => e.status === 403);
        assert.equal(
            calls.some((c) => c.sql?.startsWith('UPDATE')),
            false
        );
        assert.equal(calls.at(-2), 'rollback');
    }
    const calls = tx(t, { owner: 9, actor: { id_usuario: 4, is_admin: 1 } });
    await editNotice(7, { resumo: 'Resumo' }, 4);
    assert.equal(calls.at(-2), 'commit');
});
test('edição valida campos, ID e opções; erro de gravação faz rollback', async (t) => {
    for (const body of [
        { publico_alvo: 'admin' },
        { situacao: 'externo' },
        { titulo: '' },
        { titulo: 'a'.repeat(151) },
        { data_prazo: '2026-02-30' },
        { vagas: -1 },
        { fixado: 'true' },
        { id_usuario: 99 }
    ])
        await assert.rejects(editNotice(7, body, 4), (e) => e.status === 400);
    await assert.rejects(editNotice('7 OR 1=1', { titulo: 'Novo' }, 4), (e) => e.status === 400);
    const calls = tx(t, { fail: true });
    await assert.rejects(editNotice(7, { titulo: 'Novo' }, 4), /db failure/);
    assert.equal(calls.at(-2), 'rollback');
    assert.throws(
        () => validateNotice({ titulo: 't', resumo: 'r', publico_alvo: 'inválido' }, true),
        (e) => e.status === 400
    );
});
function fixture(fail = false, role = 'discente') {
    const nodes = [],
        requests = [];
    function element(tag) {
        const n = {
            tag,
            children: [],
            events: {},
            attributes: {},
            value: '',
            append(...v) {
                this.children.push(...v);
            },
            setAttribute(k, v) {
                this.attributes[k] = v;
            },
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            focus() {
                this.focused = true;
            },
            showModal() {
                this.open = true;
            },
            close() {
                this.open = false;
                this.events.close?.();
            },
            remove() {
                this.removed = true;
            }
        };
        nodes.push(n);
        return n;
    }
    const A = {
        auth: { getSessao: () => ({ id_usuario: 4, tipo_usuario: role }) },
        showToast() {},
        api: {
            expect: (p) => p,
            post: async (path, body) => {
                requests.push({ path, body });
                if (fail) throw Error('Falha de teste');
                return {};
            },
            patch: async (path, body) => {
                requests.push({ path, body });
                if (fail) throw Error('Falha de teste');
                return {};
            },
            put: async (path, body) => {
                requests.push({ path, body });
                if (fail) throw Error('Falha de teste');
                return {};
            }
        }
    };
    const document = { body: element('body'), createElement: element };
    const context = { window: { Arcadia: A }, document };
    for (const p of ['content-fields', 'notice-actions', 'notice-editor'])
        vm.runInNewContext(fs.readFileSync('front/js/' + p + '.js', 'utf8'), context);
    const notice = {
        id_aviso: 7,
        id_usuario: 4,
        titulo: 'Título atual',
        resumo: 'Resumo atual',
        descricao: 'Texto atual',
        publico_alvo: 'externo',
        categoria: 'evento',
        situacao: 'rascunho',
        data_prazo: '2026-10-25T00:00:00.000Z',
        vagas: 4,
        urgente: 1,
        fixado: 0
    };
    return { A, nodes, notice, requests };
}
test('editor pré-carrega texto/público/estado/prazo; cancelar não envia alteração', () => {
    const f = fixture(),
        dialog = f.A.noticeEditor.open(f.notice, () => {});
    assert.equal(f.nodes.find((n) => n.name === 'titulo').value, 'Título atual');
    assert.equal(f.nodes.find((n) => n.name === 'publico_alvo').value, 'externo');
    assert.equal(f.nodes.find((n) => n.name === 'data_prazo').value, '2026-10-25');
    assert.equal(f.nodes.find((n) => n.name === 'situacao').value, 'rascunho');
    assert.equal(f.nodes.find((n) => n.name === 'urgente').checked, true);
    f.nodes.find((n) => n.textContent === 'Cancelar').events.click();
    assert.equal(dialog.removed, true);
    assert.equal(f.requests.length, 0);
    assert.equal(
        f.A.noticeEditor.open({ ...f.notice, id_usuario: 9 }, () => {}),
        undefined
    );
});
test('salvar envia allowlist e atualiza tela; falha mantém editor e conteúdo digitado', async () => {
    for (const fail of [false, true]) {
        const f = fixture(fail);
        let updated = false;
        const dialog = f.A.noticeEditor.open(f.notice, () => {
            updated = true;
        });
        f.nodes.find((n) => n.name === 'titulo').value = 'Título alterado';
        await f.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
        assert.equal(f.requests[0].body.publico_alvo, 'externo');
        assert.equal(f.requests[0].body.titulo, 'Título alterado');
        assert.equal(Object.hasOwn(f.requests[0].body, 'id_usuario'), false);
        assert.equal(updated, !fail);
        if (fail) {
            assert.equal(dialog.open, true);
            assert.equal(f.nodes.find((n) => n.name === 'titulo').value, 'Título alterado');
            assert.match(
                f.nodes.find((n) => n.attributes.role === 'alert').textContent,
                /Falha de teste/
            );
        } else assert.equal(dialog.removed, true);
    }
});

test('criação/edição compartilham todos os campos por módulo e preservam criação em falha', async () => {
    const definitions = require('../front/js/content-fields');
    for (const kind of ['notices', 'tasks', 'documents', 'projects', 'calendar']) {
        const create = fixture(false, 'servidor');
        create.A.contentEditor.open(kind, null, () => {});
        const createdNames = create.nodes.filter((n) => n.name).map((n) => n.name);
        const record = {
            id_usuario: 4,
            status: 'solicitado',
            ...definitions[kind].defaults,
            [definitions[kind].id]: 7,
            titulo: 'Registro',
            descricao: 'Descrição',
            resumo: 'Resumo',
            data_evento: '2026-10-20'
        };
        const edit = fixture(false, 'servidor');
        edit.A.contentEditor.open(kind, record, () => {});
        assert.deepEqual(
            edit.nodes.filter((n) => n.name).map((n) => n.name),
            createdNames,
            kind
        );
        assert.deepEqual(
            createdNames,
            definitions[kind].fields.map((f) => f[0])
        );
        for (const [name, value] of Object.entries(record)) {
            const input = create.nodes.find((n) => n.name === name);
            if (input && input.type !== 'checkbox') input.value = String(value ?? '');
        }
        if (kind === 'notices')
            create.nodes.find((n) => n.name === 'tipo_publicacao').value = 'noticia';
        await create.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
        assert.equal(create.requests[0].path, definitions[kind].endpoint);
        assert.equal(Object.hasOwn(create.requests[0].body, 'id_usuario'), false);
        if (kind === 'notices') assert.equal(create.requests[0].body.tipo_publicacao, 'noticia');
    }
    const failed = fixture(true, 'servidor'),
        dialog = failed.A.contentEditor.open('notices', null, () => {});
    failed.nodes.find((n) => n.name === 'titulo').value = 'Rascunho digitado';
    failed.nodes.find((n) => n.name === 'tipo_publicacao').value = 'noticia';
    await failed.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    assert.equal(dialog.open, true);
    assert.equal(failed.nodes.find((n) => n.name === 'titulo').value, 'Rascunho digitado');
});
