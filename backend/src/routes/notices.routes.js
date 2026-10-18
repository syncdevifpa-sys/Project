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

// Notice applications
const applications = require('../controllers/noticeApplications.controller');
router.post('/:id/apply', authenticateToken, applications.apply);
router.get('/:id/applications', authenticateToken, authorizeRoles('docente', 'servidor'), applications.listByNotice);
router.get('/my/applications', authenticateToken, applications.listMy);
router.patch('/applications/:idInscricao', authenticateToken, authorizeRoles('docente', 'servidor'), applications.updateStatus);

module.exports = router;
