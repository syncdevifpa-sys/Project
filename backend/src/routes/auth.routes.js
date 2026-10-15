const express = require("express");

const router = express.Router();

const { sendWelcomeEmail } = require("../services/email.service");
const { login } = require("../controllers/auth.controller");
const { authenticateToken } = require('../middlewares/auth.middleware');
const profile = require('../controllers/profile.controller');
const { listSessions } = require('../controllers/sessions.controller');
router.get('/perfil', authenticateToken, profile.getProfile);
const sharing = require('../services/profile-sharing.service').handlers('users');
router.get('/compartilhamento', authenticateToken, sharing.get);
router.put('/compartilhamento', authenticateToken, sharing.put);
router.put('/perfil', authenticateToken, profile.updateProfile);
router.post('/logout', authenticateToken, profile.logout);
router.post('/logout-outros', authenticateToken, profile.logoutOthers);
router.post('/alterar-senha', authenticateToken, profile.changePassword);
router.get('/sessoes', authenticateToken, listSessions);
router.delete('/account', authenticateToken, async (req,res) => {
    try { await require('../services/admin.service').changePerson('users',Number(req.user.id_usuario),req.body,Number(req.user.id_usuario),true,true);res.json({message:'Conta excluída.'}); }
    catch(error){res.status(error.status||500).json({error:error.status?error.message:'Não foi possível excluir a conta.'});}
});

// POST /api/auth/send-welcome
router.post("/send-welcome", async (req, res) => {
    try {
        const { email, nome, provider } = req.body;

        if (!email) {
            return res.status(400).json({ error: "O e-mail é obrigatório." });
        }

        const result = await sendWelcomeEmail(
            email,
            nome || "Student",
            provider || "Google"
        );

        return res.json({ success: true, ...result });

    } catch (err) {
        return res.status(500).json({
            error: "Não foi possível enviar o e-mail de boas-vindas.",
            details: err.message
        });
    }
});

// POST /api/auth/login
router.post("/login", login);

module.exports = router;
