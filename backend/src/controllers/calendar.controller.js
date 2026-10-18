const { validateContent, editContent } = require('../services/content-edit.service');
const calendarModel = require('../models/calendar.model');

async function listManagedEvents(req, res) {
    try {
        return res.json(
            await calendarModel.listEvents({
                manage: true,
                actorId: req.user.id_usuario,
                admin: req.user.is_admin === true
            })
        );
    } catch {
        return res.status(500).json({ error: 'Não foi possível buscar os eventos para edição.' });
    }
}
async function listEvents(req, res) {
    try {
        const events = await calendarModel.listEvents();

        return res.json(events);
    } catch (error) {
        if (
            error.code === 'ER_BAD_FIELD_ERROR' &&
            /oculto|visibilidade/.test(error.sqlMessage || error.message || '')
        )
            return res
                .status(409)
                .json({ error: 'Atualize o banco para habilitar a visibilidade do calendário.' });
        if (['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code))
            return res.status(409).json({
                error: 'O banco precisa da atualização de categorias do calendário antes de salvar esta categoria.'
            });
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Erro ao buscar eventos do calendário:', error);

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
                error: 'Evento do calendário não encontrado.'
            });
        }

        return res.json(event);
    } catch (error) {
        if (
            error.code === 'ER_BAD_FIELD_ERROR' &&
            /oculto|visibilidade/.test(error.sqlMessage || error.message || '')
        )
            return res
                .status(409)
                .json({ error: 'Atualize o banco para habilitar a visibilidade do calendário.' });
        if (['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code))
            return res.status(409).json({
                error: 'O banco precisa da atualização de categorias do calendário antes de salvar esta categoria.'
            });
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Erro ao buscar evento do calendário:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createEvent(req, res) {
    try {
        const userId = req.user.id_usuario;
        if (
            req.body.visibilidade !== 'pessoal' &&
            !req.user.is_admin &&
            !['docente', 'servidor'].includes(req.user.tipo_usuario)
        )
            return res
                .status(403)
                .json({
                    error: 'Esta conta pode criar eventos pessoais. A publicação pública é restrita a docentes, servidores e administradores.'
                });

        const { titulo, data_evento } = req.body;

        if (!titulo || !data_evento) {
            return res.status(400).json({
                error: 'Título e data do evento são obrigatórios.'
            });
        }

        const result = await calendarModel.createEvent(
            userId,
            validateContent('calendar', req.body, true)
        );

        return res.status(201).json({
            message: 'Evento do calendário criado com sucesso.',
            eventId: result.insertId
        });
    } catch (error) {
        if (
            error.code === 'ER_BAD_FIELD_ERROR' &&
            /oculto|visibilidade/.test(error.sqlMessage || error.message || '')
        )
            return res
                .status(409)
                .json({ error: 'Atualize o banco para habilitar a visibilidade do calendário.' });
        if (['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code))
            return res.status(409).json({
                error: 'O banco precisa da atualização de categorias do calendário antes de salvar esta categoria.'
            });
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Erro ao criar evento do calendário:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateEvent(req, res) {
    try {
        const eventId = req.params.id;

        const result = await editContent('calendar', req.params.id, req.body, req.user.id_usuario);

        if (!result) {
            return res.status(404).json({
                error: 'Evento do calendário não encontrado.'
            });
        }

        return res.json({
            message: 'Evento do calendário atualizado com sucesso.'
        });
    } catch (error) {
        if (
            error.code === 'ER_BAD_FIELD_ERROR' &&
            /oculto|visibilidade/.test(error.sqlMessage || error.message || '')
        )
            return res
                .status(409)
                .json({ error: 'Atualize o banco para habilitar a visibilidade do calendário.' });
        if (['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code))
            return res.status(409).json({
                error: 'O banco precisa da atualização de categorias do calendário antes de salvar esta categoria.'
            });
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Erro ao atualizar evento do calendário:', error);

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
                error: 'Evento do calendário não encontrado.'
            });
        }

        return res.json({
            message: 'Evento do calendário excluído com sucesso.'
        });
    } catch (error) {
        if (
            error.code === 'ER_BAD_FIELD_ERROR' &&
            /oculto|visibilidade/.test(error.sqlMessage || error.message || '')
        )
            return res
                .status(409)
                .json({ error: 'Atualize o banco para habilitar a visibilidade do calendário.' });
        if (['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code))
            return res.status(409).json({
                error: 'O banco precisa da atualização de categorias do calendário antes de salvar esta categoria.'
            });
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Erro ao excluir evento do calendário:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listEvents,
    listManagedEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
