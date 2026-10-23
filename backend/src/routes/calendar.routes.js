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

router.put('/:id', authenticateToken, updateEvent);

// Administrator route
router.delete('/:id', authenticateToken, authorizeAdmin, deleteEvent);

module.exports = router;
