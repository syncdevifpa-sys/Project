const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sessionsModel = require('../models/sessions.model');

const externalUsersModel = require('../models/externalUsers.model');

async function registerExternal(req, res) {
    try {
        const { nome, email, senha, telefone, organizacao } = req.body;

        if (
            typeof nome !== 'string' ||
            !nome.trim() ||
            typeof email !== 'string' ||
            email.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            typeof senha !== 'string' ||
            senha.length < 8 ||
            Buffer.byteLength(senha, 'utf8') > 72
        ) {
            return res.status(400).json({
                error: 'Informe nome, e-mail válido e senha de pelo menos 8 caracteres.'
            });
        }

        const normalizedEmail = require('../services/email-verification.service').address(email);
        await require('../services/security-limits.service').verification(req, normalizedEmail);
        // Confere primeiro a tabela usuarios
        const institutionalUser =
            await externalUsersModel.findInstitutionalByEmail(normalizedEmail);

        if (institutionalUser) {
            return res.status(409).json({
                error: 'Este email já está cadastrado.'
            });
        }

        // Depois publico_externo
        const externalUser = await externalUsersModel.findExternalByEmail(normalizedEmail);

        if (externalUser) {
            return res.status(409).json({
                error: 'Este email já está cadastrado.'
            });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const result = await externalUsersModel.createExternal({
            nome: nome.trim(),
            email: normalizedEmail,
            telefone: telefone || null,
            senha: hashedPassword,
            organizacao: organizacao || null
        });

        return res.status(201).json({
            message: 'Usuário externo criado com sucesso.',
            externalId: result.insertId,
            verificationRequired: true,
            verificationSent: result.verificationSent === true
        });
    } catch (error) {
        if (!error.status) console.error('External registration failed.');

        return res.status(error.status || 500).json({
            error: error.status
                ? error.message
                : 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function loginExternal(req, res) {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios.'
            });
        }

        const user = await externalUsersModel.findExternalByEmail(email);

        if (!user) {
            return res.status(401).json({
                error: 'Email ou senha incorretos.'
            });
        }

        if (user.situacao !== 'ativo') {
            return res.status(403).json({
                error: 'Usuário bloqueado.'
            });
        }

        const passwordMatches = await bcrypt.compare(senha, user.senha);

        if (!passwordMatches) {
            return res.status(401).json({
                error: 'Email ou senha incorretos.'
            });
        }

        const emailState = await require('../services/email-verification.service').loginStatus(
            'external',
            user.id_externo,
            user.email
        );
        if (!emailState.allowed)
            return res.status(403).json({
                error: 'Confirme seu e-mail antes de entrar. Você pode reenviar o link na página de confirmação.',
                emailVerificationRequired: true
            });
        const token = jwt.sign(
            {
                id_externo: user.id_externo,
                nome: user.nome,
                email: user.email,
                tipo_usuario: 'externo'
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        await externalUsersModel.updateLastAccess(user.id_externo);

        await sessionsModel.createSession({
            expectedEmail: user.email,
            expectedPasswordHash: user.senha,
            expectedType: user.tipo_usuario,
            id_externo: user.id_externo,
            token: crypto.createHash('sha256').update(token).digest('hex'),
            dispositivo: req.headers['user-agent'] || 'Navegador Web',
            ip: req.ip || null,
            expiracao: new Date(Date.now() + 8 * 60 * 60 * 1000)
        });

        return res.json({
            message: 'Login realizado com sucesso.',
            token,
            user: {
                id_externo: user.id_externo,
                nome: user.nome,
                email: user.email,
                tipo_usuario: 'externo',
                organizacao: user.organizacao,
                email_verificado: emailState.verified,
                email_status: emailState.status
            }
        });
    } catch (error) {
        console.error('External login error:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getExternalProfile(req, res) {
    try {
        const user = await externalUsersModel.findExternalById(req.externalUser.id_externo);

        if (!user) {
            return res.status(404).json({
                error: 'Usuário externo não encontrado.'
            });
        }

        return res.json({
            id_externo: user.id_externo,
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
            organizacao: user.organizacao,
            tipo_usuario: 'externo'
        });
    } catch (error) {
        console.error('External profile error:', error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    registerExternal,
    loginExternal,
    getExternalProfile,
    async logoutExternal(req, res) {
        try {
            await sessionsModel.deleteExternalSession(
                req.session.id_token,
                req.externalUser.id_externo
            );
            return res.json({ message: 'Sessão encerrada.' });
        } catch {
            return res.status(500).json({ error: 'Não foi possível encerrar a sessão.' });
        }
    }
};
