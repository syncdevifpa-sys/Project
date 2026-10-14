const crypto = require("crypto");
const bcrypt = require("bcrypt");
const emailService = require('../services/email.service');

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

        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: "Email é obrigatório."
            });
        }

        // Verifique a configuração antes de consultar a conta: a resposta não revela sua existência.
        if (!emailService.recoveryConfigured()) {
            return res.status(503).json({ error: 'A recuperação por e-mail está indisponível. Entre em contato com a secretaria.' });
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

        const recovery = await recoveryModel.createRecovery({
            id_usuario,
            id_externo,
            token_hash: tokenHash,
            expiracao: expiration
        });

        try {
            await emailService.sendPasswordRecovery(user.email, recoveryToken);
        } catch {
            // Invalide links cuja entrega não foi confirmada; não registre token nem erro SMTP bruto.
            await recoveryModel.markAsUsed(recovery.insertId);
            console.error('Password recovery email delivery failed.');
        }

        return res.json({
            message:
                "Se o email estiver cadastrado, as instruções de recuperação serão enviadas."
        });

    } catch (error) {
        console.error("Password recovery failed.");

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function resetPassword(req, res) {
    try {
        const {
            token,
            novaSenha
        } = req.body;

        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof novaSenha !== 'string') {
            return res.status(400).json({
                error: "Token e nova senha são obrigatórios."
            });
        }

        if (novaSenha.length < 8 || Buffer.byteLength(novaSenha, 'utf8') > 72) {
            return res.status(400).json({
                error: "A senha deve possuir pelo menos 8 caracteres e no máximo 72 bytes."
            });
        }

        const tokenHash = hashToken(token);

        const passwordHash = await bcrypt.hash(novaSenha, 10);
        if (!await recoveryModel.consumeRecovery(tokenHash, passwordHash)) {
            return res.status(400).json({
                error: "Token inválido, expirado ou já utilizado."
            });
        }

        return res.json({
            message: "Senha alterada com sucesso."
        });

    } catch (error) {
        console.error("Password reset failed.");

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    requestRecovery,
    resetPassword
};
