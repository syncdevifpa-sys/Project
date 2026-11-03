const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const { createClassSchedule } = require('../backend/src/services/class-schedule.service');
after(() => db.end());
function fixture(role, admin = false) {
    const calls = [];
    const database = {
        execute: async (sql, args = []) => {
            calls.push({ sql, args });
            if (sql.startsWith('SELECT id_usuario,tipo_usuario'))
                return [
                    [{ id_usuario: 1, tipo_usuario: role, is_admin: admin, situacao: 'ativo' }]
                ];
            if (sql.includes('FROM arcadia_schema_migrations')) return [[]];
            if (sql.startsWith('SELECT d.id_disciplina'))
                return [
                    args[1] === 10 && ['docente', 'discente'].includes(role)
                        ? [{ id_disciplina: 8 }]
                        : []
                ];
            if (sql.startsWith('SELECT h.id_horario')) {
                const selected = args[2];
                return [
                    [8, 9].map((subject) => ({
                        id_horario: subject,
                        id_disciplina: subject,
                        id_turma: selected || 10,
                        turma: 'Turma',
                        disciplina: 'Disciplina ' + subject,
                        dia_semana: 1,
                        hora_inicio: '08:00',
                        hora_fim: '08:50',
                        vigencia_inicio: '2026-10-01',
                        vigencia_fim: '2026-10-31'
                    }))
                ];
            }
            if (sql.includes('FROM academico_horario_excecoes')) return [[]];
            throw new Error('Consulta inesperada: ' + sql);
        }
    };
    return { service: createClassSchedule(database), calls };
}
test('administrador consulta qualquer turma e a API limita a consulta ao identificador escolhido', async () => {
    const f = fixture('servidor', true);
    const rows = await f.service.agenda(1, '2026-10-05', '2026-10-11', '20');
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.id_turma === 20));
    const query = f.calls.find((call) => call.sql.startsWith('SELECT h.id_horario'));
    assert.match(query.sql, /t.id_turma=\?/);
    assert.deepEqual(query.args.slice(2, 6), [20, 20, 20, 1]);
});
for (const role of ['docente', 'discente']) {
    test(
        role + ' consulta a grade completa da turma participante e não consulta turma alheia',
        async () => {
            const f = fixture(role);
            const rows = await f.service.agenda(1, '2026-10-05', '2026-10-11', 10);
            assert.deepEqual(
                rows.map((row) => row.id_disciplina),
                [8, 9]
            );
            const before = f.calls.filter((call) =>
                call.sql.startsWith('SELECT h.id_horario')
            ).length;
            await assert.rejects(f.service.agenda(1, '2026-10-05', '2026-10-11', 20), {
                status: 403
            });
            assert.equal(
                f.calls.filter((call) => call.sql.startsWith('SELECT h.id_horario')).length,
                before
            );
        }
    );
}
test('identificador adulterado não inicia consulta de horários e servidor comum continua sem acesso', async () => {
    const f = fixture('discente');
    await assert.rejects(f.service.agenda(1, '2026-10-05', '2026-10-11', '10 OR 1=1'), {
        status: 400
    });
    assert.ok(!f.calls.some((call) => call.sql.startsWith('SELECT h.id_horario')));
    assert.deepEqual(
        await fixture('servidor').service.agenda(1, '2026-10-05', '2026-10-11', 20),
        []
    );
});
