const express = require("express");

const router = express.Router();

const {
    listReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder
} = require("../controllers/reminders.controller");

const {
    authenticateToken
} = require("../middlewares/auth.middleware");

router.get(
    "/",
    authenticateToken,
    listReminders
);

router.get(
    "/:id",
    authenticateToken,
    getReminderById
);

router.post(
    "/",
    authenticateToken,
    createReminder
);

router.put(
    "/:id",
    authenticateToken,
    updateReminder
);

router.delete(
    "/:id",
    authenticateToken,
    deleteReminder
);

module.exports = router;
