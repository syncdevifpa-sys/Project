const calendarModel = require("../models/calendar.model");

async function listEvents(req, res) {
    try {
        const events = await calendarModel.listEvents();

        return res.json(events);

    } catch (error) {
        console.error("Erro ao buscar eventos do calendário:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getEventById(req, res) {
    try {
        const eventId = req.params.id;

        const event = await calendarModel.findEventById(eventId);

        if (!event) {
            return res.status(404).json({
                error: "Evento do calendário não encontrado."
            });
        }

        return res.json(event);

    } catch (error) {
        console.error("Erro ao buscar evento do calendário:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createEvent(req, res) {
    try {
        const userId = req.user.id_usuario;

        const {
            titulo,
            data_evento
        } = req.body;

        if (!titulo || !data_evento) {
            return res.status(400).json({
                error: "Título e data do evento são obrigatórios."
            });
        }

        const result = await calendarModel.createEvent(
            userId,
            req.body
        );

        return res.status(201).json({
            message: "Evento do calendário criado com sucesso.",
            eventId: result.insertId
        });

    } catch (error) {
        console.error("Erro ao criar evento do calendário:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateEvent(req, res) {
    try {
        const eventId = req.params.id;

        const result = await calendarModel.updateEvent(
            eventId,
            req.body
        );

        if (!result) {
            return res.status(404).json({
                error: "Evento do calendário não encontrado."
            });
        }

        return res.json({
            message: "Evento do calendário atualizado com sucesso."
        });

    } catch (error) {
        console.error("Erro ao atualizar evento do calendário:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteEvent(req, res) {
    try {
        const eventId = req.params.id;

        const result = await calendarModel.deleteEvent(eventId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Evento do calendário não encontrado."
            });
        }

        return res.json({
            message: "Evento do calendário excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir evento do calendário:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};