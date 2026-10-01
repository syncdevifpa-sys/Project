const express = require("express");

const router = express.Router();

const {
    listEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
} = require("../controllers/calendar.controller");

const {
    authenticateToken,
    authorizeRoles,
    authorizeAdmin
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", listEvents);
router.get("/:id", getEventById);

// Teacher and staff routes
router.post(
    "/",
    authenticateToken,
    authorizeRoles("docente", "servidor"),
    createEvent
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("docente", "servidor"),
    updateEvent
);

// Administrator route
router.delete(
    "/:id",
    authenticateToken,
    authorizeAdmin,
    deleteEvent
);

module.exports = router;