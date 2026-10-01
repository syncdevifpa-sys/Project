const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Autenticação de tokennecessária."
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

        req.user = decoded;

        next();
    } catch (error) {
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