const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const externalUsersModel =
    require("../models/externalUsers.model");

async function registerExternal(req, res) {
    try {
        const {
            nome,
            email,
            senha,
            telefone,
            organizacao
        } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                error: "Nome, email e senha são obrigatórios."
            });
        }

        // Confere primeiro a tabela usuarios
        const institutionalUser =
            await externalUsersModel.findInstitutionalByEmail(email);

        if (institutionalUser) {
            return res.status(409).json({
                error: "Este email já está cadastrado."
            });
        }

        // Depois publico_externo
        const externalUser =
            await externalUsersModel.findExternalByEmail(email);

        if (externalUser) {
            return res.status(409).json({
                error: "Este email já está cadastrado."
            });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const result = await externalUsersModel.createExternal({
            nome,
            email,
            telefone,
            senha: hashedPassword,
            organizacao
        });

        return res.status(201).json({
            message: "Usuário externo criado com sucesso.",
            externalId: result.insertId
        });

    } catch (error) {
        console.error("Error creating external user:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function loginExternal(req, res) {
    try {
        const {
            email,
            senha
        } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                error: "Email e senha são obrigatórios."
            });
        }

        const user =
            await externalUsersModel.findExternalByEmail(email);

        if (!user) {
            return res.status(401).json({
                error: "Email ou senha incorretos."
            });
        }

        if (user.situacao !== "ativo") {
            return res.status(403).json({
                error: "Usuário bloqueado."
            });
        }

        const passwordMatches =
            await bcrypt.compare(senha, user.senha);

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Email ou senha incorretos."
            });
        }

        const token = jwt.sign(
            {
                id_externo: user.id_externo,
                nome: user.nome,
                email: user.email,
                tipo_usuario: "externo"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        await externalUsersModel.updateLastAccess(
            user.id_externo
        );

        return res.json({
            message: "Login realizado com sucesso.",
            token,
            user: {
                id_externo: user.id_externo,
                nome: user.nome,
                email: user.email,
                tipo_usuario: "externo",
                organizacao: user.organizacao
            }
        });

    } catch (error) {
        console.error("External login error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function getExternalProfile(req, res) {
    try {
        const user = await externalUsersModel.findExternalById(
            req.externalUser.id_externo
        );

        if (!user) {
            return res.status(404).json({
                error: "Usuário externo não encontrado."
            });
        }

        return res.json(user);

    } catch (error) {
        console.error("External profile error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    registerExternal,
    loginExternal,
    getExternalProfile
};
