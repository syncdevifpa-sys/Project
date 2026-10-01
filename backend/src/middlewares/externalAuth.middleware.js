const jwt = require("jsonwebtoken");

function authenticateExternal(req, res, next) {
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

        req.externalUser = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            error: "Token inválido ou expirado."
        });
    }
}

module.exports = {
    authenticateExternal
};