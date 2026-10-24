const express = require('express');

const router = express.Router();

const {
    listEvents,
    listManagedEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../controllers/calendar.controller');

const {
    authenticateToken,
    authorizeRoles,
    authorizeAdmin
} = require('../middlewares/auth.middleware');

const { optionalNoticeViewer } = require('../middlewares/noticeViewer.middleware');
// Visitantes e Comunidade externa recebem somente eventos explicitamente publicos.
router.get('/', optionalNoticeViewer, listEvents);
router.get('/manage', authenticateToken, listManagedEvents);
router.get('/:id', optionalNoticeViewer, getEventById);

// Teacher and staff routes
router.post('/', authenticateToken, createEvent);

router.put('/visibility', authenticateToken, async (req, res) => {
    try {
        const change = require('../services/calendar-visibility.service').createVisibilityService();
        res.json(await change(req.user.id_usuario, req.body));
    } catch (error) {
        const schema = ['WARN_DATA_TRUNCATED','ER_TRUNCATED_WRONG_VALUE_FOR_FIELD','ER_BAD_FIELD_ERROR'].includes(error.code);
        res.status(error.status || (schema ? 409 : 500)).json({ error: schema ? 'A visibilidade ampliada exige a migração 1.1.28.' : error.status ? error.message : 'Não foi possível atualizar a visibilidade.' });
    }
});

router.put('/:id', authenticateToken, updateEvent);

// Administrator route
router.delete('/:id', authenticateToken, authorizeAdmin, deleteEvent);

module.exports = router;
