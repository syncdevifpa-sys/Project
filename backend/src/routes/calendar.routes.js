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

// Public routes
router.get('/', listEvents);
router.get('/manage', authenticateToken, listManagedEvents);
router.get('/:id', getEventById);

// Teacher and staff routes
router.post('/', authenticateToken, createEvent);

router.put('/:id', authenticateToken, updateEvent);

// Administrator route
router.delete('/:id', authenticateToken, authorizeAdmin, deleteEvent);

module.exports = router;
