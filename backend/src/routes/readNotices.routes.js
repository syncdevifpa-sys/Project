const express = require("express");

const router = express.Router();

const {
    markAsRead,
    markAsUnread,
    listReadNotices,
    countUnreadNotices
} = require("../controllers/readNotices.controller");

const {
    authenticateToken
} = require("../middlewares/auth.middleware");

router.get(
    "/",
    authenticateToken,
    listReadNotices
);

router.get(
    "/unread/count",
    authenticateToken,
    countUnreadNotices
);

router.post(
    "/:id",
    authenticateToken,
    markAsRead
);

router.delete(
    "/:id",
    authenticateToken,
    markAsUnread
);

module.exports = router;