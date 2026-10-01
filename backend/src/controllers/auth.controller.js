const authModel = require("../models/auth.model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sessionsModel = require("../models/sessions.model");

async function login(req, res) {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                error: "Email e senha são obrigatórios."
            });
        }

        // 1. Buscar usuário
        const user = await authModel.findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                error: "Email ou senha inválidos."
            });
        }

        // 2. Verificar situação da conta
        if (user.situacao !== "ativo") {
            return res.status(403).json({
                error: "Conta do usuário não está ativa."
            });
        }

        // 3. Verificar senha
        const passwordValid = await authModel.comparePassword(
            senha,
            user.senha
        );

        if (!passwordValid) {
            return res.status(401).json({
                error: "Senha incorreta."
            });
        }

        // 4. Gerar JWT
        const token = jwt.sign(
            {
                id_usuario: user.id_usuario,
                tipo_usuario: user.tipo_usuario,
                is_admin: Boolean(user.is_admin)
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        // 5. Gerar hash do JWT para armazenar no banco
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Mesma duração do JWT: 8 horas
        const expiration = new Date(
            Date.now() + 8 * 60 * 60 * 1000
        );

        // 6. Registrar sessão
        const sessionResult = await sessionsModel.createSession({
            id_usuario: user.id_usuario,
            id_externo: null,
            token: tokenHash,
            dispositivo:
                req.headers["user-agent"] || "Navegador Web",
            ip: req.ip || null,
            expiracao: expiration
        });

        console.log(
            "Sessão criada:",
            sessionResult.insertId
        );

        // 7. Resposta
        return res.json({
            message: "Login realizado com sucesso.",
            token,
            user: {
                id_usuario: user.id_usuario,
                nome: user.nome,
                email: user.email,
                tipo_usuario: user.tipo_usuario,
                is_admin: Boolean(user.is_admin)
            }
        });

    } catch (error) {
        console.error("Erro durante o login:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    login
};