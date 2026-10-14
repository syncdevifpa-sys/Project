const express = require("express");

const router = express.Router();

const {
    registerExternal,
    loginExternal,
    getExternalProfile,
    logoutExternal
} = require("../controllers/externalUsers.controller");

const {
    authenticateExternal
} = require("../middlewares/externalAuth.middleware");

router.post(
    "/register",
    registerExternal
);

router.post(
    "/login",
    loginExternal
);

router.get(
    "/me",
    authenticateExternal,
    getExternalProfile
);

router.post('/logout', authenticateExternal, logoutExternal);
module.exports = router;
