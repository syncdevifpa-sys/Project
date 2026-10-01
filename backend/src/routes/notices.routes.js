const express = require("express");

const router = express.Router();

const {
    listNotices,
    getNoticeById,
    createNotice,
    updateNotice,
    deleteNotice
} = require("../controllers/notices.controller");

const {
    authenticateToken,
    authorizeRoles
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", listNotices);
router.get("/:id", getNoticeById);

// Teacher/staff routes
router.post(
    "/",
    authenticateToken,
    authorizeRoles("docente", "servidor"),
    createNotice
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("docente", "servidor"),
    updateNotice
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("docente", "servidor"),
    deleteNotice
);

module.exports = router;