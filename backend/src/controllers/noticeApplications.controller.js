const model = require('../models/noticeApplications.model');

async function apply(req, res) {
    try {
        const noticeId = req.params.id;
        const userId = req.user.id_usuario;
        const { motivo, anexo_url } = req.body || {};

        const application = await model.applyToNotice(noticeId, userId, { motivo, anexo_url });
        return res.status(201).json({
            message: 'Inscrição no edital realizada com sucesso.',
            inscricao: application
        });
    } catch (err) {
        if (err.statusCode === 409) {
            return res.status(409).json({ error: err.message });
        }
        console.error('Error applying to notice:', err);
        return res.status(500).json({ error: 'Não foi possível processar a inscrição no edital.' });
    }
}

async function listByNotice(req, res) {
    try {
        const noticeId = req.params.id;
        const applications = await model.listApplicationsByNotice(noticeId);
        return res.json(applications);
    } catch (err) {
        console.error('Error listing notice applications:', err);
        return res.status(500).json({ error: 'Não foi possível listar as candidaturas do edital.' });
    }
}

async function listMy(req, res) {
    try {
        const userId = req.user.id_usuario;
        const applications = await model.listUserApplications(userId);
        return res.json(applications);
    } catch (err) {
        console.error('Error listing user applications:', err);
        return res.status(500).json({ error: 'Não foi possível listar suas inscrições.' });
    }
}

async function updateStatus(req, res) {
    try {
        const { idInscricao } = req.params;
        const { status, motivo } = req.body;
        const validStatuses = ['inscrito', 'em_analise', 'deferido', 'indeferido', 'aprovado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status de inscrição inválido.' });
        }

        await model.updateApplicationStatus(idInscricao, status, motivo);
        return res.json({ message: 'Status da candidatura atualizado com sucesso.' });
    } catch (err) {
        console.error('Error updating application status:', err);
        return res.status(500).json({ error: 'Não foi possível atualizar o status da inscrição.' });
    }
}

module.exports = {
    apply,
    listByNotice,
    listMy,
    updateStatus
};
