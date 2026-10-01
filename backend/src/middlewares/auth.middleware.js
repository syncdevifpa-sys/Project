const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const db = require('../config/database');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Faça login para continuar."
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            error: "Formato de token inválido."
        });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded.id_usuario || decoded.tipo_usuario === 'externo') {
            return res.status(403).json({ error: 'É necessário um usuário institucional.' });
        }
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        const [sessions] = await db.execute(
            'SELECT id_token FROM tokens WHERE token = ? AND id_usuario = ? AND expiracao > NOW()',
            [hash, decoded.id_usuario]
        );
        if (!sessions.length) return res.status(401).json({ error: 'Sessão encerrada ou expirada.' });
        req.session = sessions[0];
        req.user = decoded;

        next();
    } catch (error) {
        if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
            return res.status(500).json({ error: 'Não foi possível validar a sessão.' });
        }
        return res.status(401).json({
            error: "Token inválido ou expirado."
        });
    }
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: "Autenticação necessária."
            });
        }

        if (!allowedRoles.includes(req.user.tipo_usuario)) {
            return res.status(403).json({
                error: "Você não tem permissão para acessar este recurso."
            });
        }

        next();
    };
}

function authorizeAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: "Autenticação necessária."
        });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({
            error: "Permissão de administrador necessária."
        });
    }

    next();
}

module.exports = {
    authenticateToken,
    authorizeRoles,
    authorizeAdmin
};
