const express = require("express");

const router = express.Router();

const {
    listSessions,
    deleteSession,
    deleteAllSessions
} = require("../controllers/sessions.controller");

const {
    authenticateToken
} = require("../middlewares/auth.middleware");

router.get(
    "/",
    authenticateToken,
    listSessions
);

router.delete(
    "/all",
    authenticateToken,
    deleteAllSessions
);

router.delete(
    "/:id",
    authenticateToken,
    deleteSession
);

module.exports = router;