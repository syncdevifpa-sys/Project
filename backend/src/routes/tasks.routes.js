const express = require('express');

const router = express.Router();

const {
    listTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
} = require('../controllers/tasks.controller');

const { authenticateSubject: authenticateToken } = require('../middlewares/subject.middleware');

router.get('/', authenticateToken, listTasks);

router.get('/:id', authenticateToken, getTaskById);

router.post('/', authenticateToken, createTask);

router.put('/:id', authenticateToken, updateTask);

router.delete('/:id', authenticateToken, deleteTask);

module.exports = router;
