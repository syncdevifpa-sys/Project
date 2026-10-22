const express = require('express');

const router = express.Router();

const {
    listReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder
} = require('../controllers/reminders.controller');

const { authenticateToken } = require('../middlewares/auth.middleware');
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const service = require('../services/task-reminders.service').createReminders();
const preference = (write) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        return res.json(await (write ? service.consent(req.user.id_usuario, req.body || {}) : service.settings(req.user.id_usuario)));
    } catch (e) {
        const migration = ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(e.code);
        return res.status(e.status || (migration ? 503 : 500)).json({ error: e.status ? e.message : migration ? 'Aplique a migração de lembretes com a equipe.' : 'Não foi possível atualizar notificações.' });
    }
};
router.get('/preferences', authenticateToken, preference(false));
router.put('/preferences', authenticateToken, preference(true));

router.get('/', authenticateToken, listReminders);

router.get('/:id', authenticateToken, getReminderById);

router.post('/', authenticateToken, createReminder);

router.put('/:id', authenticateToken, updateReminder);

router.delete('/:id', authenticateToken, deleteReminder);

module.exports = router;
