const db = require('../config/database');
const { canRead } = require('../services/calendar-access.service');

const hidden = (event) => event.oculto === true || Number(event.oculto) === 1;
async function queryVisibility(sql, params = []) {
    let columns = ['oculto', 'visibilidade', 'origem_calendario'];
    for (;;) {
        try {
            const select = columns.length
                ? sql.replace('FROM calendario', ', ' + columns.join(', ') + ' FROM calendario')
                : sql;
            return await db.execute(select, params);
        } catch (error) {
            const message = error.sqlMessage || error.message || '';
            const missing = columns.find((column) =>
                new RegExp('\\b' + column + '\\b').test(message)
            );
            if (error.code !== 'ER_BAD_FIELD_ERROR' || !missing) throw error;
            columns = columns.filter((column) => column !== missing);
        }
    }
}
async function listEvents(options = {}) {
    const [events] = await queryVisibility(`
        SELECT
            id_evento,
            id_usuario,
            titulo,
            descricao,
            categoria,
            periodo_letivo,
            data_evento,
            data_fim,
            hora_inicio,
            hora_fim,
            local,
            criado_em,
            atualizado_em
        FROM calendario
        ORDER BY data_evento ASC, hora_inicio ASC
    `);

    return events.filter((event) => {
        if (!options.manage) return canRead(event, options);
        const owner = Number(event.id_usuario) === Number(options.actorId);
        if (event.visibilidade === 'pessoal') return options.manage && owner;
        return options.manage ? options.admin || owner : !hidden(event);
    });
}

async function findEventById(eventId, options = {}) {
    const [events] = await queryVisibility(
        `
        SELECT
            id_evento,
            id_usuario,
            titulo,
            descricao,
            categoria,
            periodo_letivo,
            data_evento,
            data_fim,
            hora_inicio,
            hora_fim,
            local,
            criado_em,
            atualizado_em
        FROM calendario
        WHERE id_evento = ?
    `,
        [eventId]
    );

    return canRead(events[0], options) ? events[0] : undefined;
}

async function createEvent(userId, eventData) {
    const {
        titulo,
        descricao = null,
        categoria = 'evento',
        periodo_letivo = null,
        data_evento,
        data_fim = null,
        hora_inicio = null,
        hora_fim = null,
        local = null,
        oculto = false,
        visibilidade = 'institucional',
        origem_calendario = 'agenda'
    } = eventData;

    const [result] = await db.execute(
        `
        INSERT INTO calendario (
            id_usuario,
            titulo,
            descricao,
            categoria,
            periodo_letivo,
            data_evento,
            data_fim,
            hora_inicio,
            hora_fim,
            origem_calendario,
            local${oculto ? ', oculto' : ''}${visibilidade !== 'publico' ? ', visibilidade' : ''}
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${oculto ? ', ?' : ''}${visibilidade !== 'publico' ? ', ?' : ''})
    `,
        [
            userId,
            titulo,
            descricao,
            categoria,
            periodo_letivo,
            data_evento,
            data_fim,
            hora_inicio,
            hora_fim,
            origem_calendario,
            local,
            ...(oculto ? [true] : []),
            ...(visibilidade !== 'publico' ? [visibilidade] : [])
        ]
    );

    return result;
}

async function updateEvent(eventId, eventData) {
    const currentEvent = await findEventById(eventId);

    if (!currentEvent) {
        return null;
    }

    const {
        titulo = currentEvent.titulo,
        descricao = currentEvent.descricao,
        categoria = currentEvent.categoria,
        periodo_letivo = currentEvent.periodo_letivo,
        data_evento = currentEvent.data_evento,
        data_fim = currentEvent.data_fim,
        hora_inicio = currentEvent.hora_inicio,
        hora_fim = currentEvent.hora_fim,
        local = currentEvent.local
    } = eventData;

    const [result] = await db.execute(
        `
        UPDATE calendario
        SET
            titulo = ?,
            descricao = ?,
            categoria = ?,
            periodo_letivo = ?,
            data_evento = ?,
            data_fim = ?,
            hora_inicio = ?,
            hora_fim = ?,
            local = ?
        WHERE id_evento = ?
    `,
        [
            titulo,
            descricao,
            categoria,
            periodo_letivo,
            data_evento,
            data_fim,
            hora_inicio,
            hora_fim,
            local,
            eventId
        ]
    );

    return result;
}

async function deleteEvent(eventId) {
    const [result] = await db.execute(
        `
        DELETE FROM calendario
        WHERE id_evento = ?
    `,
        [eventId]
    );

    return result;
}

module.exports = {
    listEvents,
    findEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
