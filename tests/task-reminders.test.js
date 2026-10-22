const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { schedule, createReminders } = require('../backend/src/services/task-reminders.service');
const { createDispatcher } = require('../backend/src/services/reminder-dispatch.service');
const { authorized } = require('../backend/src/routes/reminderDispatch.routes');
const future = () => new Date(Date.now() + 86400000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
function fixture({ verified = true, consent = false, taskOwner = true, completed = false, exists = true } = {}) {
    const writes = [], queries = [], lifecycle = [];
    const current = { id_lembrete: 2, id_usuario: 7, titulo: 'Revisar', tipo: 'prazo', ativo: 1, enviar_email: 0, id_tarefa: 3, data_lembrete: '2030-01-01 10:00:00' };
    const db = {
        async execute(sql, args = []) {
            queries.push({ sql, args });
            if (sql.startsWith('SELECT id_usuario,email')) return [[{ id_usuario: 7, email: 'titular@example.com' }]];
            if (sql.startsWith('SELECT email FROM email_estado')) return [verified ? [{ email: 'titular@example.com' }] : []];
            if (sql.startsWith('SELECT email_lembretes')) return [consent ? [{ email_lembretes: 1 }] : []];
            if (sql.startsWith('SELECT id_tarefa,status')) return [taskOwner ? [{ id_tarefa: 3, status: completed ? 'concluida' : 'aberta' }] : []];
            if (sql.startsWith('SELECT * FROM lembretes')) return [exists ? [current] : []];
            if (sql.startsWith('SELECT l.*')) return [exists ? [current] : []];
            writes.push({ sql, args }); return [{ insertId: 2, affectedRows: exists ? 1 : 0 }];
        },
        async getConnection() { return { execute: db.execute, beginTransaction: async () => lifecycle.push('begin'), commit: async () => lifecycle.push('commit'), rollback: async () => lifecycle.push('rollback'), release: () => lifecycle.push('release') }; }
    };
    return { service: createReminders(db), writes, queries, lifecycle };
}
test('agendamento exige instante UTC real futuro e fuso válido, independente do fuso do servidor', () => {
    const now = Date.UTC(2026, 9, 22);
    assert.equal(schedule({ agendado_utc: '2026-10-23T13:30:00.000Z', fuso_horario: 'America/Belem' }, now), '2026-10-23 13:30:00');
    for (const [instant, zone] of [['2026-02-30T10:00:00.000Z', 'UTC'], ['2026-10-21T10:00:00.000Z', 'UTC'], ['2026-10-23T10:00:00-03:00', 'UTC'], ['2026-10-23T10:00:00.000Z', 'Invalid/Zone']])
        assert.throws(() => schedule({ agendado_utc: instant, fuso_horario: zone }, now), { status: 400 });
});
test('consentimento é desativado por padrão e ativação exige endereço confirmado atual', async () => {
    const f = fixture();
    assert.equal((await f.service.settings(7)).email_lembretes, false);
    await assert.rejects(fixture({ verified: false }).service.consent(7, { email_lembretes: true }), { status: 409 });
    await f.service.consent(7, { email_lembretes: false, id_usuario: 99, email: 'terceiro@example.com' });
    assert.deepEqual(f.writes.at(-1).args, [7]);
    assert.match(f.writes.at(-1).sql, /enviar_email=0,versao=versao\+1/);
});
test('lembrete novo pertence ao token, envio fica off e tarefa de terceiro é recusada', async () => {
    const body = { titulo: 'Prova', id_tarefa: 3, agendado_utc: future(), fuso_horario: 'America/Fortaleza', id_usuario: 99, email: 'terceiro@example.com' };
    const f = fixture(); await f.service.createReminder(7, body);
    assert.equal(f.writes[0].args.at(-1), 7);
    assert.equal(f.writes[0].args[7], false);
    assert.ok(!JSON.stringify(f.writes).includes('terceiro@example.com'));
    await assert.rejects(fixture({ taskOwner: false }).service.createReminder(7, body), { status: 404 });
    await assert.rejects(fixture({ completed: true }).service.createReminder(7, body), { status: 409 });
    await assert.rejects(f.service.createReminder(7, { ...body, enviar_email: true }), { status: 409 });
});
test('edição exige propriedade, reagendar exige data explícita, exclusão é restrita ao titular', async () => {
    const f = fixture({ consent: true });
    await assert.rejects(fixture({ exists: false }).service.updateReminder(2, 7, { titulo: 'Outro' }), { status: 404 });
    await assert.rejects(f.service.updateReminder(2, 7, { enviar_email: true }), { status: 400 });
    await f.service.updateReminder(2, 7, { titulo: 'Novo', agendado_utc: future(), fuso_horario: 'UTC', enviar_email: true });
    assert.match(f.writes.at(-1).sql, /versao=versao\+1 WHERE id_lembrete=\? AND id_usuario=\?/);
    await f.service.deleteReminder(2, 7);
    assert.deepEqual(f.writes.at(-1).args, [2, 7]);
    assert.match(f.writes.at(-1).sql, /AND id_usuario=\?/);
});
function dispatchFixture(rowOverrides = {}, fail = false) {
    const reservations = new Set(), sends = [], states = [];
    const row = { id_lembrete: 2, id_usuario: 7, versao: 1, id_tarefa: 3, dono_tarefa: 7, tarefa_status: 'aberta', titulo: 'Prova', email: 'titular@example.com', email_confirmado: 'titular@example.com', confirmado_em: '2026-01-01', email_lembretes: 1, ...rowOverrides };
    const db = {
        async execute(sql, args) {
            if (sql.startsWith('SELECT l.id_lembrete')) return [[{ id_lembrete: 2, versao: 1 }]];
            if (sql.startsWith('INSERT IGNORE')) {
                const key = args.join(':'); const fresh = !reservations.has(key); reservations.add(key);
                return [{ affectedRows: fresh ? 1 : 0 }];
            }
            if (sql.startsWith('SELECT l.*')) {
                assert.match(sql, /FOR UPDATE/); assert.match(sql, /UTC_TIMESTAMP/);
                return [row.versao === args[1] ? [row] : []];
            }
            states.push(sql); return [{ affectedRows: 1 }];
        },
        async getConnection() { return { execute: db.execute, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} }; }
    };
    const mail = { recoveryConfigured: () => true, sendReminder: async (...args) => { sends.push(args); if (fail) throw Error('SMTP incerto'); } };
    return { dispatcher: createDispatcher(db, mail), sends, states };
}
test('processador fica off sem configuração e autenticação do agendador é independente do login', async () => {
    const previous = process.env.REMINDER_EMAIL_ENABLED; delete process.env.REMINDER_EMAIL_ENABLED;
    try { assert.equal((await dispatchFixture().dispatcher.run()).disabled, true); }
    finally { if (previous === undefined) delete process.env.REMINDER_EMAIL_ENABLED; else process.env.REMINDER_EMAIL_ENABLED = previous; }
    assert.equal(authorized('Bearer x', 'x'), false);
    const secret = 's'.repeat(40);
    assert.equal(authorized('Bearer ' + secret, secret), true);
    assert.equal(authorized('Bearer ' + 't'.repeat(40), secret), false);
});
test('reserva persistente evita envio duplicado em execução concorrente e não repete SMTP incerto', async () => {
    const previous = process.env.REMINDER_EMAIL_ENABLED; process.env.REMINDER_EMAIL_ENABLED = 'true';
    try {
        const f = dispatchFixture();
        await Promise.all([f.dispatcher.run(), f.dispatcher.run()]);
        await f.dispatcher.run();
        assert.equal(f.sends.length, 1); assert.equal(f.sends[0][0], 'titular@example.com');
        const failed = dispatchFixture({}, true); await failed.dispatcher.run(); await failed.dispatcher.run();
        assert.equal(failed.sends.length, 1); assert.ok(failed.states.some((s) => s.includes("estado='falhou'")));
    } finally { if (previous === undefined) delete process.env.REMINDER_EMAIL_ENABLED; else process.env.REMINDER_EMAIL_ENABLED = previous; }
});
test('envio revalida consentimento, endereço, tarefa concluída, dono e edição após a reserva', async () => {
    const previous = process.env.REMINDER_EMAIL_ENABLED; process.env.REMINDER_EMAIL_ENABLED = 'true';
    try {
        for (const override of [{ email_lembretes: 0 }, { email_confirmado: 'antigo@example.com' }, { confirmado_em: null }, { tarefa_status: 'concluida' }, { dono_tarefa: 8 }, { versao: 2 }]) {
            const f = dispatchFixture(override); await f.dispatcher.run(); assert.equal(f.sends.length, 0);
        }
    } finally { if (previous === undefined) delete process.env.REMINDER_EMAIL_ENABLED; else process.env.REMINDER_EMAIL_ENABLED = previous; }
});
test('migração invalida avisos ao concluir ou alterar prazo e exclui avisos vinculados ao apagar tarefa', () => {
    const sql = fs.readFileSync(require('node:path').join(__dirname, '../backend/admin/add-task-reminders.sql'), 'utf8');
    assert.match(sql, /AFTER UPDATE ON tarefas/);
    assert.match(sql, /NEW.status='concluida'/);
    assert.match(sql, /NEW.data_entrega <=> OLD.data_entrega/);
    assert.match(sql, /REFERENCES tarefas\(id_tarefa\) ON DELETE CASCADE/);
    assert.match(sql, /PRIMARY KEY \(id_lembrete, versao\)/);
});
