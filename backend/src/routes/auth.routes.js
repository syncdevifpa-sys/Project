const express = require("express");

const router = express.Router();

const { sendWelcomeEmail } = require("../services/email.service");
const { login } = require("../controllers/auth.controller");

// POST /api/auth/send-welcome
router.post("/send-welcome", async (req, res) => {
    try {
        const { email, nome, provider } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const result = await sendWelcomeEmail(
            email,
            nome || "Student",
            provider || "Google"
        );

        return res.json({ success: true, ...result });

    } catch (err) {
        return res.status(500).json({
            error: "Failed to send welcome email",
            details: err.message
        });
    }
});

// POST /api/auth/login
router.post("/login", login);

module.exports = router;