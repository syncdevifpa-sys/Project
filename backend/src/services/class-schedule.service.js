const db = require('../config/database');
const timetable = require('../../../front/js/campus-timetable');
const { createCohortInfo } = require('./cohort-info.service');
const { isoDate: day, weeklySlot } = require('../../generated/schedule-policy');
const fail = (status, message) => {
    throw Object.assign(new Error(message), { status });
};
function id(v) {
    const n = Number(v);
    if (!/^[1-9]\d*$/.test(String(v)) || !Number.isSafeInteger(n) || n <= 0)
        fail(400, 'Identificador inválido.');
    return n;
}
function fields(body) {
    if (body?.fim_dia_seguinte !== undefined && typeof body.fim_dia_seguinte !== 'boolean')
        fail(400, 'Informe se a aula termina no dia seguinte.');
    let end = body?.hora_fim;
    if (body?.fim_dia_seguinte === true && timetable.minutes(end) < 1440)
        end = timetable.clock(timetable.minutes(end) + 1440);
    const slot = weeklySlot({ ...body, hora_fim: end });
    const room = require('./cohort-info.service').optional(body.sala, 100, 'Sala');
    return { ...slot, sala: room };
}
function expand(rows, from, until) {
    day(from);
    day(until);
    if (until < from || Date.parse(until) - Date.parse(from) > 93 * 86400000)
        fail(400, 'Consulte no máximo 93 dias por vez.');
    const out = [];
    for (let n = Date.parse(from); n <= Date.parse(until); n += 86400000) {
        const date = new Date(n).toISOString().slice(0, 10),
            week = new Date(n).getUTCDay() || 7;
        for (const row of rows) {
            if (
                Number(row.dia_semana) !== week ||
                date < String(row.vigencia_inicio).slice(0, 10) ||
                date > String(row.vigencia_fim).slice(0, 10)
            )
                continue;
            out.push({
                id_ocorrencia: `aula:${row.id_horario}:${date}`,
                id_horario: row.id_horario,
                id_disciplina: row.id_disciplina,
                titulo: row.disciplina,
                turma: row.turma,
                data: date,
                hora_inicio: row.hora_inicio,
                hora_fim: row.hora_fim,
                sala: timetable.room(row).value,
                data_fim: new Date(n + (timetable.minutes(row.hora_fim) >= 1440 ? 86400000 : 0))
                    .toISOString()
                    .slice(0, 10),
                fim_dia_seguinte: timetable.minutes(row.hora_fim) >= 1440,
                fuso: 'America/Belem',
                somente_leitura: true
            });
        }
    }
    return out;
}
function overlaps(first, second) {
    const dayMs = 86400000;
    for (
        let date = Date.parse(first.vigencia_inicio);
        date <= Date.parse(first.vigencia_fim);
        date += dayMs
    ) {
        if ((new Date(date).getUTCDay() || 7) !== Number(first.dia_semana)) continue;
        const start = date + timetable.minutes(first.hora_inicio) * 60000,
            end = date + timetable.minutes(first.hora_fim) * 60000;
        for (const offset of [-1, 0, 1]) {
            const otherDate = date + offset * dayMs,
                iso = new Date(otherDate).toISOString().slice(0, 10);
            if (
                iso < second.vigencia_inicio ||
                iso > second.vigencia_fim ||
                (new Date(otherDate).getUTCDay() || 7) !== Number(second.dia_semana)
            )
                continue;
            if (
                start < otherDate + timetable.minutes(second.hora_fim) * 60000 &&
                end > otherDate + timetable.minutes(second.hora_inicio) * 60000
            )
                return true;
        }
    }
    return false;
}
function createClassSchedule(database = db) {
    const access = createCohortInfo(database);
    const admin = (a) => a.is_admin === true || a.is_admin === 1;
    async function subject(c, a, key, write = false) {
        const [r] = await c.execute(
            'SELECT d.*,t.campus,t.turno,t.sala_oficial,t.arquivada_em AS turma_arquivada FROM academico_disciplinas d JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE d.id_disciplina=?' +
                (write ? ' FOR UPDATE' : ''),
            [id(key)]
        );
        const d = r[0];
        if (!d || d.arquivada_em || d.turma_arquivada) fail(404, 'Oferta indisponível.');
        if (admin(a)) return d;
        if (a.tipo_usuario === 'docente' && d.id_professor === a.id_usuario && d.atribuicao_ativa)
            return d;
        if (write || a.tipo_usuario !== 'discente') fail(403, 'Você não administra esta oferta.');
        const [m] = await c.execute(
            'SELECT id_aluno FROM academico_matriculas WHERE id_disciplina=? AND id_aluno=? AND ativa=1',
            [d.id_disciplina, a.id_usuario]
        );
        if (!m.length) fail(403, 'Você não participa desta oferta.');
        return d;
    }
    async function list(owner, key) {
        const a = await access.actor(database, owner);
        const d = await subject(database, a, key);
        const [r] = await database.execute(
            "SELECT id_horario,id_disciplina,dia_semana,TIME_FORMAT(hora_inicio,'%H:%i') AS hora_inicio,TIME_FORMAT(hora_fim,'%H:%i') AS hora_fim,DATE_FORMAT(vigencia_inicio,'%Y-%m-%d') AS vigencia_inicio,DATE_FORMAT(vigencia_fim,'%Y-%m-%d') AS vigencia_fim,sala,versao FROM academico_horarios WHERE id_disciplina=? AND ativo=1 ORDER BY dia_semana,hora_inicio",
            [id(key)]
        );
        return r.map((row) => ({
            ...row,
            sala_oficial: d.sala_oficial || null,
            turno: d.turno,
            fim_dia_seguinte: timetable.minutes(row.hora_fim) >= 1440,
            precisa_revisao: timetable.isBelem(d.campus) && !timetable.validate(row, d.turno)
        }));
    }
    async function save(owner, key, body, schedule = null) {
        const f = fields(body),
            editing = schedule !== null,
            scheduleId = editing ? id(schedule) : 0;
        if (editing && (!Number.isSafeInteger(body.versao) || body.versao < 0))
            fail(400, 'Informe a versão atual do horário.');
        return access.transaction(owner, async (c, a) => {
            const d = await subject(c, a, key, true),
                academicYear = Number(d.ano_letivo);
            if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 2100)
                fail(409, 'O ano letivo desta oferta precisa ser revisado pela administração.');
            if (
                Number(f.vigencia_inicio.slice(0, 4)) < academicYear ||
                Number(f.vigencia_fim.slice(0, 4)) > academicYear + 1
            )
                fail(
                    400,
                    'A vigência deve estar no ano letivo da oferta ou em sua continuação no ano seguinte.'
                );
            if (timetable.isBelem(d.campus) && !timetable.validate(f, d.turno))
                fail(
                    400,
                    'Use os horários de 50 minutos da grade de Belém e preserve o intervalo de 20 minutos após a terceira aula. Para a última aula da noite, o fim é 00:20 do dia seguinte.'
                );
            if (editing) {
                const [current] = await c.execute(
                    'SELECT id_horario,versao FROM academico_horarios WHERE id_horario=? AND id_disciplina=? AND ativo=1 FOR UPDATE',
                    [scheduleId, d.id_disciplina]
                );
                if (!current[0]) fail(404, 'Horário indisponível nesta oferta.');
                if (current[0].versao !== body.versao)
                    fail(409, 'O horário foi alterado. Atualize a lista antes de editar.');
                const [changes] = await c.execute(
                    "SELECT DATE_FORMAT(data,'%Y-%m-%d') AS data FROM academico_horario_excecoes WHERE id_horario=? FOR UPDATE",
                    [scheduleId]
                );
                if (
                    changes.some(
                        (row) =>
                            row.data < f.vigencia_inicio ||
                            row.data > f.vigencia_fim ||
                            (new Date(row.data).getUTCDay() || 7) !== f.dia_semana
                    )
                )
                    fail(
                        409,
                        'Esta alteração invalidaria exceções já registradas. Preserve este horário e crie uma nova recorrência.'
                    );
            }
            await c.execute('SELECT id_usuario FROM usuarios WHERE id_usuario=? FOR UPDATE', [
                d.id_professor
            ]);
            await c.execute('SELECT id_turma FROM academico_turmas WHERE id_turma=? FOR UPDATE', [
                d.id_turma
            ]);
            const [conflicts] = await c.execute(
                "SELECT h.id_horario,h.dia_semana,TIME_FORMAT(h.hora_inicio,'%H:%i') AS hora_inicio,TIME_FORMAT(h.hora_fim,'%H:%i') AS hora_fim,DATE_FORMAT(h.vigencia_inicio,'%Y-%m-%d') AS vigencia_inicio,DATE_FORMAT(h.vigencia_fim,'%Y-%m-%d') AS vigencia_fim FROM academico_horarios h JOIN academico_disciplinas d ON d.id_disciplina=h.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE h.ativo=1 AND d.arquivada_em IS NULL AND t.arquivada_em IS NULL AND h.vigencia_inicio<=DATE_ADD(?,INTERVAL 1 DAY) AND h.vigencia_fim>=DATE_SUB(?,INTERVAL 1 DAY) AND (d.id_turma=? OR d.id_professor=?) AND h.id_horario<>? FOR UPDATE",
                [f.vigencia_fim, f.vigencia_inicio, d.id_turma, d.id_professor, scheduleId]
            );
            if (conflicts.some((row) => overlaps(f, row)))
                fail(
                    409,
                    'Há uma aula sobreposta para esta turma ou professor, inclusive na continuação do dia seguinte.'
                );
            if (editing) {
                await c.execute(
                    'UPDATE academico_horarios SET dia_semana=?,hora_inicio=?,hora_fim=?,vigencia_inicio=?,vigencia_fim=?,sala=?,versao=versao+1 WHERE id_horario=? AND id_disciplina=? AND versao=?',
                    [
                        f.dia_semana,
                        f.hora_inicio,
                        f.hora_fim,
                        f.vigencia_inicio,
                        f.vigencia_fim,
                        f.sala,
                        scheduleId,
                        d.id_disciplina,
                        body.versao
                    ]
                );
                return {
                    id_horario: scheduleId,
                    message: 'Horário atualizado na oferta e na Agenda.'
                };
            }
            const [result] = await c.execute(
                'INSERT INTO academico_horarios (id_disciplina,dia_semana,hora_inicio,hora_fim,vigencia_inicio,vigencia_fim,sala,id_autor) VALUES (?,?,?,?,?,?,?,?)',
                [
                    d.id_disciplina,
                    f.dia_semana,
                    f.hora_inicio,
                    f.hora_fim,
                    f.vigencia_inicio,
                    f.vigencia_fim,
                    f.sala,
                    a.id_usuario
                ]
            );
            return {
                id_horario: result.insertId,
                message: 'Horário cadastrado na oferta e na Agenda.'
            };
        });
    }
    async function remove(owner, key, schedule, version) {
        return access.transaction(owner, async (c, a) => {
            await subject(c, a, key, true);
            if (!Number.isSafeInteger(Number(version)) || Number(version) < 0)
                fail(400, 'Versão inválida.');
            const [r] = await c.execute(
                'UPDATE academico_horarios SET ativo=0,versao=versao+1 WHERE id_horario=? AND id_disciplina=? AND versao=? AND ativo=1',
                [id(schedule), id(key), Number(version)]
            );
            if (!r.affectedRows) fail(409, 'O horário mudou. Atualize a lista.');
            return { message: 'Horário retirado da agenda; registro preservado.' };
        });
    }
    async function agenda(owner, from, until) {
        day(from);
        day(until);
        if (until < from || Date.parse(until) - Date.parse(from) > 93 * 86400000)
            fail(400, 'Consulte no máximo 93 dias por vez.');
        const a = await access.actor(database, owner);
        if (a.tipo_usuario === 'servidor' && !admin(a)) return [];
        const [rows] = await database.execute(
            "SELECT h.id_horario,h.id_disciplina,h.dia_semana,TIME_FORMAT(h.hora_inicio,'%H:%i') AS hora_inicio,TIME_FORMAT(h.hora_fim,'%H:%i') AS hora_fim,DATE_FORMAT(h.vigencia_inicio,'%Y-%m-%d') AS vigencia_inicio,DATE_FORMAT(h.vigencia_fim,'%Y-%m-%d') AS vigencia_fim,h.sala,t.sala_oficial,t.turno,d.nome AS disciplina,t.nome AS turma FROM academico_horarios h JOIN academico_disciplinas d ON d.id_disciplina=h.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE h.ativo=1 AND d.arquivada_em IS NULL AND t.arquivada_em IS NULL AND h.vigencia_inicio<=? AND h.vigencia_fim>=? AND (?=1 OR (?='docente' AND d.id_professor=? AND d.atribuicao_ativa=1) OR (?='discente' AND EXISTS(SELECT 1 FROM academico_matriculas m WHERE m.id_disciplina=d.id_disciplina AND m.id_aluno=? AND m.ativa=1))) ORDER BY h.dia_semana,h.hora_inicio",
            [
                until,
                from,
                admin(a) ? 1 : 0,
                a.tipo_usuario,
                a.id_usuario,
                a.tipo_usuario,
                a.id_usuario
            ]
        );
        const occurrences = expand(rows, from, until);
        if (!rows.length) return occurrences;
        const ids = [...new Set(rows.map((row) => row.id_horario))];
        const [changes] = await database.execute(
            "SELECT id_horario,DATE_FORMAT(data,'%Y-%m-%d') AS data,cancelada,motivo FROM academico_horario_excecoes WHERE id_horario IN (" +
                ids.map(() => '?').join(',') +
                ') AND data BETWEEN ? AND ?',
            [...ids, from, until]
        );
        const byDate = new Map(changes.map((row) => [row.id_horario + ':' + row.data, row]));
        return occurrences.map((row) => {
            const change = byDate.get(row.id_horario + ':' + row.data);
            return {
                ...row,
                cancelada: change?.cancelada === true || change?.cancelada === 1,
                motivo: change?.motivo || null
            };
        });
    }
    async function exceptions(owner, key, schedule) {
        const a = await access.actor(database, owner);
        await subject(database, a, key);
        const [rows] = await database.execute(
            "SELECT e.id_horario,DATE_FORMAT(e.data,'%Y-%m-%d') AS data,e.cancelada,e.motivo,e.versao FROM academico_horario_excecoes e JOIN academico_horarios h ON h.id_horario=e.id_horario WHERE h.id_horario=? AND h.id_disciplina=? AND h.ativo=1 ORDER BY e.data",
            [id(schedule), id(key)]
        );
        return rows;
    }
    async function exception(owner, key, schedule, body) {
        const date = day(body.data);
        if (
            typeof body.cancelada !== 'boolean' ||
            !Number.isSafeInteger(Number(body.versao)) ||
            Number(body.versao) < 0
        )
            fail(400, 'Informe cancelamento e versão atual.');
        const reason = require('./cohort-info.service').optional(body.motivo, 300, 'Motivo');
        return access.transaction(owner, async (c, a) => {
            await subject(c, a, key, true);
            const [rows] = await c.execute(
                "SELECT dia_semana,DATE_FORMAT(vigencia_inicio,'%Y-%m-%d') AS vigencia_inicio,DATE_FORMAT(vigencia_fim,'%Y-%m-%d') AS vigencia_fim FROM academico_horarios WHERE id_horario=? AND id_disciplina=? AND ativo=1 FOR UPDATE",
                [id(schedule), id(key)]
            );
            const row = rows[0];
            if (
                !row ||
                date < row.vigencia_inicio ||
                date > row.vigencia_fim ||
                (new Date(date).getUTCDay() || 7) !== row.dia_semana
            )
                fail(400, 'A data não corresponde a uma aula desta recorrência.');
            const [old] = await c.execute(
                'SELECT versao FROM academico_horario_excecoes WHERE id_horario=? AND data=? FOR UPDATE',
                [id(schedule), date]
            );
            if ((old[0]?.versao ?? 0) !== Number(body.versao))
                fail(409, 'A exceção mudou. Atualize a lista.');
            if (old.length)
                await c.execute(
                    'UPDATE academico_horario_excecoes SET cancelada=?,motivo=?,id_autor=?,versao=versao+1 WHERE id_horario=? AND data=?',
                    [body.cancelada, reason, a.id_usuario, id(schedule), date]
                );
            else
                await c.execute(
                    'INSERT INTO academico_horario_excecoes (id_horario,data,cancelada,motivo,id_autor,versao) VALUES (?,?,?,?,?,1)',
                    [id(schedule), date, body.cancelada, reason, a.id_usuario]
                );
            return {
                message: body.cancelada
                    ? 'Aula cancelada somente nesta data.'
                    : 'Aula restabelecida nesta data.'
            };
        });
    }
    return { list, save, remove, agenda, exceptions, exception };
}
module.exports = { createClassSchedule, fields, expand, overlaps };
