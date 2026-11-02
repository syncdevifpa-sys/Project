const express = require('express');

const router = express.Router();

const {
    registerExternal,
    loginExternal,
    getExternalProfile,
    logoutExternal
} = require('../controllers/externalUsers.controller');

const { authenticateExternal } = require('../middlewares/externalAuth.middleware');

router.use('/reminders', require('./reminders.routes').externalRouter);
router.use('/space', require('./externalCommunity.routes'));

router.post('/register', registerExternal);

router.post('/login', loginExternal);

router.get('/me', authenticateExternal, getExternalProfile);
const names = require('../services/account-names.service').handlers('external');
router.get('/nomes', authenticateExternal, names.get);
router.put('/nomes', authenticateExternal, names.put);
router.post('/nomes/solicitacoes', authenticateExternal, names.post);
router.get(
    '/email-status',
    authenticateExternal,
    require('./emailVerification.routes').status('external')
);
router.post(
    '/email-change',
    authenticateExternal,
    require('./emailVerification.routes').change('external')
);

router.post('/logout', authenticateExternal, logoutExternal);
const sharing = require('../services/profile-sharing.service').handlers('external');
router.get('/compartilhamento', authenticateExternal, sharing.get);
router.put('/compartilhamento', authenticateExternal, sharing.put);
router.delete('/account', authenticateExternal, async (req, res) => {
    try {
        await require('../services/admin.service').changePerson(
            'external-users',
            Number(req.externalUser.id_externo),
            req.body,
            Number(req.externalUser.id_externo),
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
module.exports = router;
