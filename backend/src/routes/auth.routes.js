const express = require('express');

const router = express.Router();
router.use('/google', require('./googleAuth.routes'));

const { login } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const profile = require('../controllers/profile.controller');
const { listSessions } = require('../controllers/sessions.controller');
router.get('/perfil', authenticateToken, profile.getProfile);
router.get(
    '/email-status',
    authenticateToken,
    require('./emailVerification.routes').status('users')
);
const sharing = require('../services/profile-sharing.service').handlers('users');
router.get('/compartilhamento', authenticateToken, sharing.get);
router.put('/compartilhamento', authenticateToken, sharing.put);
router.put('/perfil', authenticateToken, profile.updateProfile);
const names = require('../services/account-names.service').handlers('users');
router.get('/nomes', authenticateToken, names.get);
router.put('/nomes', authenticateToken, names.put);
router.post('/nomes/solicitacoes', authenticateToken, names.post);
router.post(
    '/email-change',
    authenticateToken,
    require('./emailVerification.routes').change('users')
);
router.post('/logout', authenticateToken, profile.logout);
router.post('/logout-outros', authenticateToken, profile.logoutOthers);
router.post('/alterar-senha', authenticateToken, profile.changePassword);
router.get('/sessoes', authenticateToken, listSessions);
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        await require('../services/admin.service').changePerson(
            'users',
            Number(req.user.id_usuario),
            req.body,
            Number(req.user.id_usuario),
            true,
            true
        );
        res.json({ message: 'Conta excluída.' });
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Não foi possível excluir a conta.'
        });
    }
});

// Compatibilidade explícita: este endereço nunca mais dispara mensagens.
router.post('/send-welcome', (_req, res) => {
    res.status(410).json({ error: 'O envio público de boas-vindas foi desativado.' });
});

// POST /api/auth/login
router.post('/login', login);

module.exports = router;
