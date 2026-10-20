const router = require('express').Router();
const service = require('../services/google-auth.service').createGoogleAuth();
function errorResponse(res, error) {
    return res.status(error.status || 503).json({
        error: error.status
            ? error.message
            : 'Não foi possível entrar com Google agora. Tente novamente mais tarde.',
        passwordRequired: error.passwordRequired === true,
        registrationRequired: error.registrationRequired === true,
        emailVerificationRequired: error.emailVerificationRequired === true
    });
}
router.post('/challenge', (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(service.challenge(req));
    } catch (error) {
        errorResponse(res, error);
    }
});
router.post('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(await service.authenticate(req));
    } catch (error) {
        errorResponse(res, error);
    }
});
module.exports = router;
