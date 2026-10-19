const { test, after } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
const db = require('../backend/src/config/database'),
    model = require('../backend/src/models/notices.model');
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
            if (fail && sql.startsWith('DELETE FROM avisos WHERE')) throw Error('DB failure');
            return [{ affectedRows: 1 }];
        }
    }));
    return calls;
}
test('autor institucional pode excluir publicação e leituras atomicamente', async (t) => {
    const calls = tx(t);
    await model.deleteNotice(7, 4);
    assert.deepEqual(
        calls.filter((c) => c.sql?.startsWith('DELETE')).map((c) => c.params),
        [[7], [7]]
    );
    assert.equal(calls.at(-2), 'commit');
});
test('outro usuário e identidade externa/inativa não podem excluir; nenhum delete acontece', async (t) => {
    for (const input of [{ owner: 9 }, { actor: null }]) {
        const calls = tx(t, input);
        await assert.rejects(model.deleteNotice(7, 4), (e) => e.status === 403);
        assert.equal(
            calls.some((c) => c.sql?.startsWith('DELETE')),
            false
        );
        assert.equal(calls.at(-2), 'rollback');
    }
});
test('admin atual do banco pode excluir publicação de outro autor', async (t) => {
    const calls = tx(t, { actor: { id_usuario: 4, is_admin: 1 }, owner: 9 });
    await model.deleteNotice(7, 4);
    assert.equal(calls.at(-2), 'commit');
});
test('ID adulterado, aviso ausente e falha de dependência não deixam exclusão parcial', async (t) => {
    await assert.rejects(model.deleteNotice('7 OR 1=1', 4), (e) => e.status === 400);
    let calls = tx(t, { owner: null });
    await assert.rejects(model.deleteNotice(7, 4), (e) => e.status === 404);
    assert.equal(calls.at(-2), 'rollback');
    calls = tx(t, { fail: true });
    await assert.rejects(model.deleteNotice(7, 4), /DB failure/);
    assert.equal(calls.at(-2), 'rollback');
});
function ui(confirm = true, fail = false) {
    const requests = [],
        state = {
            rows: [{ id_aviso: 7, id_usuario: 4, titulo: 'Minha publicação' }],
            confirmations: []
        };
    const A = {
        auth: { getSessao: () => ({ id_usuario: 4, tipo_usuario: 'discente' }) },
        showToast() {},
        confirmAction: async (options) => {
            state.confirmations.push([options.title, options.message, ...options.items].join('\n'));
            return confirm;
        },
        api: {
            del: (path) => {
                requests.push(path);
                return fail ? Promise.reject(Error('negado')) : Promise.resolve({});
            },
            expect: (p) => p
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/notice-actions.js', 'utf8'), {
        window: {
            Arcadia: A,
            confirm: (text) => {
                state.confirmations.push(text);
                return confirm;
            }
        }
    });
    return { A, state, requests };
}
test('UI distingue dono/admin/externo; cancelar não envia DELETE; sucesso recarrega listagem', async () => {
    const f = ui(false);
    assert.equal(f.A.noticeActions.canDelete({ id_usuario: 9 }), false);
    assert.equal(
        f.A.noticeActions.canDelete(
            { id_usuario: 9 },
            { id_usuario: 4, tipo_usuario: 'servidor', is_admin: true }
        ),
        true
    );
    assert.equal(
        f.A.noticeActions.canDelete(
            { id_usuario: 4 },
            { id_usuario: 4, tipo_usuario: 'externo', is_admin: true }
        ),
        false
    );
    await f.A.noticeActions.remove(f.state.rows, () => {
        f.state.rows = [];
    });
    assert.equal(f.requests.length, 0);
    assert.equal(f.state.rows.length, 1);
    const yes = ui();
    await yes.A.noticeActions.remove(yes.state.rows, () => {
        yes.state.rows = [];
    });
    assert.deepEqual(yes.requests, ['/api/notices/7']);
    assert.equal(yes.state.rows.length, 0);
    assert.match(yes.state.confirmations[0], /Minha publicação/);
});
test('recusa da API mantém publicação visível e não redireciona', async () => {
    const f = ui(true, true);
    let updated = false;
    await assert.rejects(
        f.A.noticeActions.remove(f.state.rows, () => {
            updated = true;
        }),
        /negado/
    );
    assert.equal(updated, false);
    assert.equal(f.state.rows.length, 1);
});

test('controller uses authenticated institutional ID rather than supplied body or admin claims', async (t) => {
    const controller = require('../backend/src/controllers/notices.controller');
    let args;
    t.mock.method(model, 'deleteNotice', async (...values) => {
        args = values;
        return { affectedRows: 1 };
    });
    await controller.deleteNotice(
        {
            params: { id: '7' },
            user: { id_usuario: 4, is_admin: true },
            body: { id_usuario: 99, is_admin: true }
        },
        { json: (value) => value }
    );
    assert.deepEqual(args, ['7', 4]);
});

test('API-backed HTML keeps dynamic containers without sample records', () => {
    for (const [name, container] of [
        ['notices', 'noticesCardsGrid'],
        ['projects', 'gridProjetos'],
        ['people', 'gridPessoas'],
        ['settings', 'listaSessoes']
    ]) {
        const html = fs.readFileSync('front/' + name + '.html', 'utf8');
        assert.ok(html.includes('id="' + container + '"'));
        assert.doesNotMatch(
            html,
            /Ana Ribeiro|ana\.ribeiro|Navegador \(Linux\)|Conectado ontem às 19h40/
        );
    }
    const detail = fs.readFileSync('front/notice.html', 'utf8');
    assert.doesNotMatch(detail, /PIBIC|20 horas semanais|Etapas da inscrição/);
    assert.match(detail, /class="ar-detail-actions"/);
    const documents = fs.readFileSync('front/documents.html', 'utf8');
    assert.match(documents, /sigaa\.ifpa\.edu\.br/);
    assert.ok(documents.includes('js/content-fields.js'));
    assert.match(fs.readFileSync('front/js/content-fields.js', 'utf8'), /documents:/);
});
