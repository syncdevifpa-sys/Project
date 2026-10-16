const express = require('express');

const router = express.Router();

const {
    listNotices,
    getNoticeById,
    createNotice,
    updateNotice,
    deleteNotice
} = require('../controllers/notices.controller');

const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

const { optionalNoticeViewer } = require('../middlewares/noticeViewer.middleware');
router.get('/', optionalNoticeViewer, listNotices);
router.get('/:id', optionalNoticeViewer, getNoticeById);

// Teacher/staff routes
router.post('/', authenticateToken, authorizeRoles('docente', 'servidor'), createNotice);

router.put('/:id', authenticateToken, updateNotice);

router.delete('/:id', authenticateToken, deleteNotice);

module.exports = router;
