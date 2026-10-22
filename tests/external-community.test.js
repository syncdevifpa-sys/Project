const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const { createCommunity } = require('../backend/src/services/external-community.service');
after(() => db.end());
function fixture(options = {}) {
    const writes = [],
        lifecycle = [];
    const database = {
        async execute(sql, args = []) {
            if (options.failAt && sql.includes(options.failAt)) throw Error('falha simulada');
            if (sql.startsWith('SELECT id_externo'))
                return [[{ id_externo: 5, situacao: options.inactive ? 'bloqueado' : 'ativo' }]];
            if (sql.startsWith('SELECT id_projeto,aprovacao'))
                return [
                    [
                        {
                            id_projeto: 3,
                            aprovacao: options.aprovacao || 'aprovado',
                            situacao: options.situacao || 'inscricoes',
                            permite_externos: options.allow === false ? 0 : 1,
                            vagas: options.full ? 1 : 0
                        }
                    ]
                ];
            if (sql.startsWith('SELECT status FROM projeto_inscricoes_externas'))
                return [options.status ? [{ status: options.status }] : []];
            if (sql.startsWith('SELECT (SELECT COUNT')) return [[{ total: 1 }]];
            if (sql.startsWith('SELECT * FROM agenda_externa'))
                return [
                    options.eventOwner === args[1]
                        ? [
                              {
                                  id_evento: args[0],
                                  id_externo: args[1],
                                  data_evento: '2026-10-20',
                                  data_fim: null
                              }
                          ]
                        : []
                ];
            if (sql.startsWith('SELECT i.nome_arquivo'))
                return [
                    options.private
                        ? []
                        : [
                              {
                                  nome_arquivo: 'publico.pdf',
                                  tipo: 'arquivo',
                                  conteudo: Buffer.from('pdf')
                              }
                          ]
                ];
            writes.push({ sql, args });
            return [{ affectedRows: 1, insertId: 9 }];
        },
        async getConnection() {
            return {
                execute: database.execute,
                beginTransaction: async () => lifecycle.push('begin'),
                commit: async () => lifecycle.push('commit'),
                rollback: async () => lifecycle.push('rollback'),
                release() {}
            };
        }
    };
    return { service: createCommunity(database), writes, lifecycle };
}
test('projeto visível não autoriza inscrição externa sem opção explícita', async () => {
    for (const options of [
        { allow: false },
        { aprovacao: 'pendente' },
        { situacao: 'encerrado' },
        { full: true },
        { status: 'recusado' },
        { status: 'inscrito' },
        { inactive: true }
    ]) {
        const f = fixture(options);
        await assert.rejects(f.service.register(5, 3), (e) => [403, 404, 409].includes(e.status));
        assert.equal(f.writes.length, 0);
        assert.ok(f.lifecycle.includes('rollback'));
    }
});
test('externo entra somente no projeto permitido e pode reinscrever inscrição cancelada', async () => {
    for (const options of [{}, { status: 'cancelado' }]) {
        const f = fixture(options);
        await f.service.register(5, 3);
        assert.deepEqual(f.writes[0].args, [3, 5]);
        assert.match(f.writes[0].sql, /projeto_inscricoes_externas/);
        assert.ok(f.lifecycle.includes('commit'));
    }
    const closed = fixture({ allow: false });
    await closed.service.register(5, 3, true);
    assert.deepEqual(closed.writes[0].args, [3, 5]);
    assert.match(closed.writes[0].sql, /cancelado/);
});
test('agenda externa é pessoal e ignora autoria e origem acadêmica forjadas', async () => {
    const f = fixture();
    await f.service.saveEvent(5, null, {
        titulo: 'Compromisso',
        data_evento: '2026-10-24',
        id_usuario: 7,
        id_externo: 99,
        origem_calendario: 'ifpa',
        visibilidade: 'publico'
    });
    assert.match(f.writes[0].sql, /agenda_externa/);
    assert.equal(f.writes[0].args[0], 5);
    assert.doesNotMatch(f.writes[0].sql, /origem_calendario|visibilidade|id_usuario/);
    const other = fixture({ eventOwner: 99 });
    await assert.rejects(other.service.saveEvent(5, 9, { titulo: 'Forjado' }), { status: 404 });
    assert.equal(other.writes.length, 0);
    const dates = fixture({ eventOwner: 5 });
    await assert.rejects(dates.service.saveEvent(5, 9, { data_fim: '2026-10-01' }), {
        status: 400
    });
    assert.equal(dates.writes.length, 0);
});
test('documento público pode ser baixado; arquivo privado não é retornado ao externo', async () => {
    const f = fixture();
    assert.equal((await f.service.download(5, 8)).nome_arquivo, 'publico.pdf');
    await assert.rejects(fixture({ private: true }).service.download(5, 8), { status: 404 });
});
test('HTTP protege calendário acadêmico por origem, inclusive detalhe direto, para externo e visitante', async (t) => {
    const express = require('express'),
        jwt = require('jsonwebtoken');
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'external-community-test';
    t.after(() => {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    });
    const events = [
        {
            id_evento: 1,
            titulo: 'Agenda',
            origem_calendario: 'agenda',
            oculto: 0,
            visibilidade: 'publico'
        },
        {
            id_evento: 2,
            titulo: 'Evento sem palavras identificáveis',
            origem_calendario: 'ifpa',
            oculto: 0,
            visibilidade: 'publico'
        },
        { id_evento: 3, titulo: 'Origem legada desconhecida', oculto: 0 }
    ];
    t.mock.method(db, 'execute', async (sql, args = []) => {
        if (sql.includes('FROM tokens')) return [[{ id_token: 1, is_admin: 0 }]];
        if (sql.includes('SELECT tipo_usuario FROM usuarios'))
            return [[{ tipo_usuario: 'docente' }]];
        if (sql.includes('FROM calendario'))
            return [
                sql.includes('WHERE id_evento')
                    ? events.filter((e) => e.id_evento === Number(args[0]))
                    : events
            ];
        throw Error('Consulta não simulada: ' + sql);
    });
    const app = express();
    app.use(express.json());
    app.use('/api/calendar', require('../backend/src/routes/calendar.routes'));
    app.use('/api/external/space', require('../backend/src/routes/externalCommunity.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    t.after(() => new Promise((r) => server.close(r)));
    const base = 'http://127.0.0.1:' + server.address().port;
    const token = (claims) => ({
            Authorization: 'Bearer ' + jwt.sign(claims, process.env.JWT_SECRET)
        }),
        external = token({ id_externo: 5, tipo_usuario: 'externo' }),
        institutional = token({ id_usuario: 7, tipo_usuario: 'docente' });
    for (const headers of [{}, external]) {
        const response = await fetch(base + '/api/calendar?origem_calendario=ifpa', { headers });
        assert.deepEqual(
            (await response.json()).map((e) => e.id_evento),
            [1]
        );
        assert.equal((await fetch(base + '/api/calendar/2', { headers })).status, 404);
        assert.equal((await fetch(base + '/api/calendar/3', { headers })).status, 404);
    }
    assert.equal(
        (await (await fetch(base + '/api/calendar', { headers: institutional })).json()).length,
        3
    );
    assert.equal((await fetch(base + '/api/calendar/manage', { headers: external })).status, 403);
    assert.equal(
        (
            await fetch(base + '/api/calendar/2', {
                method: 'PUT',
                headers: { ...external, 'Content-Type': 'application/json' },
                body: JSON.stringify({ origem_calendario: 'agenda' })
            })
        ).status,
        403
    );
    assert.equal(
        (await fetch(base + '/api/external/space/agenda', { headers: institutional })).status,
        403
    );
});

test('edição do próprio perfil externo não altera e-mail, vínculo, situação nem administração', async () => {
    const f = fixture();
    await f.service.updateProfile(5, {
        nome: 'Nome atualizado',
        telefone: '91999999999',
        organizacao: 'Organização',
        id_externo: 99,
        email: 'outro@example.com',
        tipo_usuario: 'docente',
        is_admin: true,
        situacao: 'ativo'
    });
    assert.deepEqual(f.writes[0].args, ['Nome atualizado', '91999999999', 'Organização', 5]);
    assert.doesNotMatch(
        f.writes[0].sql.split(' WHERE ')[0],
        /email=|tipo_usuario=|is_admin=|situacao=/
    );
    assert.ok(f.writes[0].sql.includes("WHERE id_externo=? AND situacao='ativo'"));
});
