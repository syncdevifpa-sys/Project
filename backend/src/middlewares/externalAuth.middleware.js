const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const db = require('../config/database');

async function authenticateExternal(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Token não fornecido."
        });
    }

    const parts = authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {
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

        if (
            decoded.tipo_usuario !== "externo" ||
            !decoded.id_externo
        ) {
            return res.status(403).json({
                error: "Token não pertence a um usuário externo."
            });
        }

        const hash = crypto.createHash('sha256').update(token).digest('hex');
        const [sessions] = await db.execute(
            "SELECT t.id_token FROM tokens t JOIN publico_externo p ON p.id_externo = t.id_externo WHERE t.token = ? AND t.id_externo = ? AND t.expiracao > NOW() AND p.situacao = 'ativo'",
            [hash, decoded.id_externo]
        );
        if (!sessions.length) return res.status(401).json({ error: 'Sessão encerrada ou expirada.' });
        req.session = sessions[0];
        req.externalUser = decoded;

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

module.exports = {
    authenticateExternal
};
