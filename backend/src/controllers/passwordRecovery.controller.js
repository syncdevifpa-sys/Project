const crypto = require("crypto");
const bcrypt = require("bcrypt");

const recoveryModel =
    require("../models/passwordRecovery.model");

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

async function requestRecovery(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: "Email é obrigatório."
            });
        }

        let user =
            await recoveryModel.findInstitutionalByEmail(email);

        let id_usuario = null;
        let id_externo = null;

        if (user) {
            id_usuario = user.id_usuario;
        } else {
            user = await recoveryModel.findExternalByEmail(email);

            if (user) {
                id_externo = user.id_externo;
            }
        }

        // Não revela se o email existe ou não.
        if (!user) {
            return res.json({
                message:
                    "Se o email estiver cadastrado, as instruções de recuperação serão enviadas."
            });
        }

        const recoveryToken =
            crypto.randomBytes(32).toString("hex");

        const tokenHash = hashToken(recoveryToken);

        const expiration = new Date(
            Date.now() + 30 * 60 * 1000
        );

        await recoveryModel.createRecovery({
            id_usuario,
            id_externo,
            token_hash: tokenHash,
            expiracao: expiration
        });

        /*
         * TEMPORÁRIO PARA DESENVOLVIMENTO.
         *
         * Depois o recoveryToken será enviado por email.
         * Não devemos retornar esse token em produção.
         */

        return res.json({
            message:
                "Se o email estiver cadastrado, as instruções de recuperação serão enviadas.",
            developmentToken: recoveryToken
        });

    } catch (error) {
        console.error("Password recovery error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function resetPassword(req, res) {
    try {
        const {
            token,
            novaSenha
        } = req.body;

        if (!token || !novaSenha) {
            return res.status(400).json({
                error: "Token e nova senha são obrigatórios."
            });
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({
                error: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const tokenHash = hashToken(token);

        const recovery =
            await recoveryModel.findValidRecovery(tokenHash);

        if (!recovery) {
            return res.status(400).json({
                error: "Token inválido, expirado ou já utilizado."
            });
        }

        const passwordHash =
            await bcrypt.hash(novaSenha, 10);

        if (recovery.id_usuario) {
            await recoveryModel.updateInstitutionalPassword(
                recovery.id_usuario,
                passwordHash
            );
        } else {
            await recoveryModel.updateExternalPassword(
                recovery.id_externo,
                passwordHash
            );
        }

        await recoveryModel.markAsUsed(
            recovery.id_recuperacao
        );

        return res.json({
            message: "Senha alterada com sucesso."
        });

    } catch (error) {
        console.error("Password reset error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    requestRecovery,
    resetPassword
};