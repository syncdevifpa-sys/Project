const { test, before, after } = require('node:test'),
    assert = require('node:assert/strict'),
    express = require('../backend/node_modules/express'),
    jwt = require('../backend/node_modules/jsonwebtoken');
const db = require('../backend/src/config/database');
let server, base;
const old = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'content-parity-test';
before(async () => {
    const app = express();
    app.use(express.json());
    for (const kind of ['projects', 'calendar', 'documents', 'tasks', 'content'])
        app.use('/api/' + kind, require('../backend/src/routes/' + kind + '.routes'));
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    await new Promise((r) => server.close(r));
    await db.end();
    if (old === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = old;
});
function headers(external = false) {
    return {
        Authorization:
            'Bearer ' +
            jwt.sign(
                external
                    ? { id_externo: 4, tipo_usuario: 'externo', is_admin: true }
                    : { id_usuario: 4, tipo_usuario: 'servidor', is_admin: true },
                process.env.JWT_SECRET
            ),
        'Content-Type': 'application/json'
    };
}
test('rotas de edição não permitem dono falso, claims admin nem acesso externo; caminhos PUT antigos também protegem dono', async (t) => {
    let owner = 4,
        admin = false;
    t.mock.method(db, 'execute', async () => [[{ id_token: 1, is_admin: 0 }]]);
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql) =>
            sql.startsWith('SELECT id_usuario,')
                ? [[{ id_usuario: 4, is_admin: admin ? 1 : 0, tipo_usuario: 'servidor' }]]
                : sql.startsWith('SELECT *')
                  ? [[{ id_usuario: owner, status: 'solicitado' }]]
                  : [{ affectedRows: 1 }]
    }));
    for (const kind of ['tasks', 'documents', 'projects', 'calendar']) {
        const request = (auth) =>
            fetch(base + '/api/content/' + kind + '/7', {
                method: 'PATCH',
                headers: auth,
                body: JSON.stringify({ titulo: 'Atualizado', id_usuario: 4, is_admin: true })
            });
        owner = 4;
        assert.equal((await request(headers())).status, 200, kind);
        owner = 9;
        assert.equal((await request(headers())).status, 403, kind);
        admin = true;
        assert.equal((await request(headers())).status, 200, kind);
        admin = false;
        assert.equal((await request(headers(true))).status, 403, kind);
    }
    for (const kind of ['projects', 'calendar'])
        assert.equal(
            (
                await fetch(base + '/api/' + kind + '/7', {
                    method: 'PUT',
                    headers: headers(),
                    body: '{"titulo":"Tentativa de terceiro"}'
                })
            ).status,
            403
        );
});
test('criação recebe campos completos do mesmo contrato sem permitir autor/estado administrativo do payload', async (t) => {
    t.mock.method(db, 'execute', async () => [[{ id_token: 1, is_admin: 0 }]]);
    const captured = {};
    const cases = [
        [
            'tasks',
            'createTask',
            {
                titulo: 'Tarefa',
                categoria: 'Pesquisa',
                responsavel: 'Equipe',
                data_entrega: '2026-10-20',
                prioridade: 'alta',
                status: 'em_andamento',
                observacao: 'https://example.test'
            }
        ],
        [
            'projects',
            'createProject',
            {
                titulo: 'Projeto',
                descricao: 'Descrição',
                eixo: 'extensao',
                responsavel_nome: 'Equipe',
                rotulo_responsavel: 'Orientação',
                vagas: 3,
                unidade_vaga: 'participantes',
                link: 'https://example.test',
                situacao: 'inscricoes',
                data_inicio: '2026-10-20',
                data_fim: '2026-11-20'
            }
        ],
        [
            'calendar',
            'createEvent',
            {
                titulo: 'Evento',
                descricao: 'Descrição',
                categoria: 'evento',
                periodo_letivo: '2026/2',
                data_evento: '2026-10-20',
                data_fim: '2026-10-21',
                hora_inicio: '09:30',
                hora_fim: '11:00',
                local: 'Local'
            }
        ],
        [
            'documents',
            'createDocument',
            { titulo: 'Documento', motivo: 'Motivo', descricao: 'Descrição', tipo: 'assinatura' }
        ]
    ];
    for (const [kind, method, payload] of cases) {
        const model = require('../backend/src/models/' + kind + '.model');
        t.mock.method(model, method, async (id, body) => {
            captured[kind] = { id, body };
            return { insertId: 7 };
        });
        if (kind === 'documents') t.mock.method(model, 'setProtocol', async () => {});
        const res = await fetch(base + '/api/' + kind, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({
                ...payload,
                id_usuario: 99,
                is_admin: true,
                aprovacao: 'aprovado',
                protocolo: 'Falso'
            })
        });
        assert.equal(res.status, 201, kind);
        assert.equal(captured[kind].id, 4);
        assert.deepEqual(captured[kind].body, payload, kind);
    }
});
