const express = require("express");

const router = express.Router();

const {
    listUsefulLinks,
    getUsefulLinkById,
    createUsefulLink,
    updateUsefulLink,
    deleteUsefulLink
} = require("../controllers/usefulLinks.controller");

const {
    authenticateToken,
    authorizeAdmin
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", listUsefulLinks);
router.get("/:id", getUsefulLinkById);

// Administrator routes
router.post(
    "/",
    authenticateToken,
    authorizeAdmin,
    createUsefulLink
);

router.put(
    "/:id",
    authenticateToken,
    authorizeAdmin,
    updateUsefulLink
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeAdmin,
    deleteUsefulLink
);

module.exports = router;