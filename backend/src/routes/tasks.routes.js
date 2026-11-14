const express = require('express');

const router = express.Router();

const {
    listTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    archiveTask
} = require('../controllers/tasks.controller');

const { authenticateSubject: authenticateToken } = require('../middlewares/subject.middleware');

router.get('/', authenticateToken, listTasks);

router.get('/:id', authenticateToken, getTaskById);

router.post('/', authenticateToken, createTask);

router.put('/:id', authenticateToken, updateTask);
router.put('/:id/archive', authenticateToken, archiveTask);

router.delete('/:id', authenticateToken, deleteTask);

module.exports = router;
