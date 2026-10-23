const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./auth.middleware');
const { authenticateExternal } = require('./externalAuth.middleware');

function authenticateSubject(req, res, next) {
    if (req.externalUser) return next();
    // Decodificar escolhe somente o autenticador; assinatura e sessao sao verificadas nele.
    const claims = jwt.decode((req.headers.authorization || '').split(' ')[1] || '');
    return claims?.tipo_usuario === 'externo'
        ? authenticateExternal(req, res, next)
        : authenticateToken(req, res, next);
}
const allowed = /^\/(?:notices|calendar|projects|tasks|public|auth|email-verification|password-recovery)(?:\/|$)/;
const externalAllowed = /^\/external\/(?:me|logout|email-status|email-change|compartilhamento|account|reminders)(?:\/|$)|^\/external\/space\/(?:profile|agenda|registrations|projects)(?:\/|$)|^\/teacher-requirements\/mine\/?$/;
function externalScope(req, res, next) {
    const claims = jwt.decode((req.headers.authorization || '').split(' ')[1] || '');
    if (claims?.tipo_usuario !== 'externo') return next();
    return authenticateExternal(req, res, () => {
        if (allowed.test(req.path) || externalAllowed.test(req.path)) return next();
        res.set('Cache-Control', 'private, no-store');
        return res.status(403).json({ error: 'Esta área não está disponível para a Comunidade externa.' });
    });
}
const taskOwner = req => req.externalUser ? { external: req.externalUser.id_externo } : req.user.id_usuario;
module.exports = { authenticateSubject, externalScope, taskOwner };
