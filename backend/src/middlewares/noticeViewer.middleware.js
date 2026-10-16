const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('./auth.middleware');
const { authenticateExternal } = require('./externalAuth.middleware');

function optionalNoticeViewer(req, res, next) {
    if (!req.headers.authorization) return next();
    // Decoding only selects the authenticator; both validate signature and active session.
    const claims = jwt.decode(req.headers.authorization.split(' ')[1] || '');
    if (claims?.tipo_usuario === 'externo') {
        return authenticateExternal(req, res, () => {
            req.noticeViewer = { tipo_usuario: 'externo' };
            next();
        });
    }
    return authenticateToken(req, res, async () => {
        try {
            const [users] = await db.execute(
                "SELECT tipo_usuario FROM usuarios WHERE id_usuario = ? AND situacao = 'ativo'",
                [req.user.id_usuario]
            );
            if (!users.length) return res.status(401).json({ error: 'Sessão encerrada.' });
            req.noticeViewer = { ...req.user, tipo_usuario: users[0].tipo_usuario };
            next();
        } catch {
            res.status(500).json({ error: 'Não foi possível validar o público da sessão.' });
        }
    });
}
module.exports = { optionalNoticeViewer };
