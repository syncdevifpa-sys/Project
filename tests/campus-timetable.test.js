const { test, after } = require('node:test'),
    assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
after(() => db.end());
const policy = require('../front/js/campus-timetable');
const { expand, overlaps } = require('../backend/src/services/class-schedule.service');
test('grade Belém calcula seis aulas e intervalo20min nos três turnos; noite termina no dia seguinte', () => {
    for (const [shift, start, end] of [
        ['manha', 420, 740],
        ['tarde', 780, 1100],
        ['noite', 1140, 1460]
    ]) {
        const frames = policy.slots(shift);
        assert.equal(frames.length, 7);
        assert.equal(frames[0].start, start);
        assert.equal(frames.at(-1).end, end);
        assert.equal(frames[3].tipo, 'intervalo');
        assert.equal(frames[3].end - frames[3].start, 20);
        assert.equal(frames.filter((r) => r.tipo === 'aula').length, 6);
    }
    assert.equal(policy.label(1460), '00:20 (+1 dia)');
    assert.equal(policy.validate({ hora_inicio: '23:30', hora_fim: '24:20' }, 'noite'), true);
    assert.equal(policy.validate({ hora_inicio: '08:40', hora_fim: '10:40' }, 'manha'), false);
});
test('aula de sábado/domingo cruza meia-noite com data final explícita sem criar ocorrência na semana seguinte', () => {
    const row = {
        id_horario: 1,
        id_disciplina: 8,
        dia_semana: 7,
        hora_inicio: '23:30',
        hora_fim: '24:20',
        vigencia_inicio: '2026-12-27',
        vigencia_fim: '2026-12-27',
        sala: '  ',
        sala_oficial: 'B2'
    };
    const result = expand([row], '2026-12-21', '2026-12-27');
    assert.equal(result.length, 1);
    assert.equal(result[0].data, '2026-12-27');
    assert.equal(result[0].data_fim, '2026-12-28');
    assert.equal(result[0].sala, 'B2');
    assert.equal(result[0].fim_dia_seguinte, true);
    assert.equal(expand([row], '2026-12-28', '2027-01-03').length, 0);
    assert.equal(
        overlaps(row, {
            ...row,
            dia_semana: 1,
            vigencia_inicio: '2026-12-28',
            vigencia_fim: '2026-12-28',
            hora_inicio: '00:10',
            hora_fim: '01:00'
        }),
        true
    );
    assert.equal(
        overlaps(row, {
            ...row,
            dia_semana: 1,
            vigencia_inicio: '2026-12-28',
            vigencia_fim: '2026-12-28',
            hora_inicio: '00:20',
            hora_fim: '01:00'
        }),
        false
    );
});
test('sala efetiva usa override sem copiar a sala oficial para a aula', () => {
    const row = { sala: ' ', sala_oficial: 'A1' };
    assert.deepEqual(policy.room(row), { value: 'A1', source: 'turma' });
    row.sala_oficial = 'B2';
    assert.equal(policy.room(row).value, 'B2');
    row.sala = ' C3 ';
    assert.deepEqual(policy.room(row), { value: 'C3', source: 'aula' });
    assert.equal(row.sala, ' C3 ');
});
