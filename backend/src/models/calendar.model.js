const db = require("../config/database");

async function listEvents() {
    const [events] = await db.execute(`
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

    return events;
}

async function findEventById(eventId) {
    const [events] = await db.execute(`
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
    `, [eventId]);

    return events[0];
}

async function createEvent(userId, eventData) {
    const {
        titulo,
        descricao = null,
        categoria = "evento",
        periodo_letivo = null,
        data_evento,
        data_fim = null,
        hora_inicio = null,
        hora_fim = null,
        local = null
    } = eventData;

    const [result] = await db.execute(`
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
            local
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        userId,
        titulo,
        descricao,
        categoria,
        periodo_letivo,
        data_evento,
        data_fim,
        hora_inicio,
        hora_fim,
        local
    ]);

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

    const [result] = await db.execute(`
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
    `, [
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
    ]);

    return result;
}

async function deleteEvent(eventId) {
    const [result] = await db.execute(`
        DELETE FROM calendario
        WHERE id_evento = ?
    `, [eventId]);

    return result;
}

module.exports = {
    listEvents,
    findEventById,
    createEvent,
    updateEvent,
    deleteEvent
};