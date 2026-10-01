const db = require("../config/database");

async function listReminders(userId) {
    const [reminders] = await db.execute(`
        SELECT
            id_lembrete,
            id_usuario,
            id_evento,
            titulo,
            descricao,
            tipo,
            data_lembrete,
            ativo,
            criado_em
        FROM lembretes
        WHERE id_usuario = ?
        ORDER BY data_lembrete ASC
    `, [userId]);

    return reminders;
}

async function findReminderById(reminderId, userId) {
    const [reminders] = await db.execute(`
        SELECT
            id_lembrete,
            id_usuario,
            id_evento,
            titulo,
            descricao,
            tipo,
            data_lembrete,
            ativo,
            criado_em
        FROM lembretes
        WHERE id_lembrete = ?
        AND id_usuario = ?
    `, [
        reminderId,
        userId
    ]);

    return reminders[0];
}

async function createReminder(userId, reminderData) {
    const {
        id_evento = null,
        titulo,
        descricao = null,
        tipo = "prazo",
        data_lembrete,
        ativo = true
    } = reminderData;

    const [result] = await db.execute(`
        INSERT INTO lembretes (
            id_usuario,
            id_evento,
            titulo,
            descricao,
            tipo,
            data_lembrete,
            ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        userId,
        id_evento,
        titulo,
        descricao,
        tipo,
        data_lembrete,
        ativo
    ]);

    return result;
}

async function updateReminder(reminderId, userId, reminderData) {
    const currentReminder = await findReminderById(
        reminderId,
        userId
    );

    if (!currentReminder) {
        return null;
    }

    const {
        id_evento = currentReminder.id_evento,
        titulo = currentReminder.titulo,
        descricao = currentReminder.descricao,
        tipo = currentReminder.tipo,
        data_lembrete = currentReminder.data_lembrete,
        ativo = currentReminder.ativo
    } = reminderData;

    const [result] = await db.execute(`
        UPDATE lembretes
        SET
            id_evento = ?,
            titulo = ?,
            descricao = ?,
            tipo = ?,
            data_lembrete = ?,
            ativo = ?
        WHERE id_lembrete = ?
        AND id_usuario = ?
    `, [
        id_evento,
        titulo,
        descricao,
        tipo,
        data_lembrete,
        ativo,
        reminderId,
        userId
    ]);

    return result;
}

async function deleteReminder(reminderId, userId) {
    const [result] = await db.execute(`
        DELETE FROM lembretes
        WHERE id_lembrete = ?
        AND id_usuario = ?
    `, [
        reminderId,
        userId
    ]);

    return result;
}

module.exports = {
    listReminders,
    findReminderById,
    createReminder,
    updateReminder,
    deleteReminder
};