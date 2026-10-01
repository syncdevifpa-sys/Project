const users = require('../models/users.model');
const auth = require('../models/auth.model');
const sessions = require('../models/sessions.model');
const db = require('../config/database');
const bcrypt = require('bcrypt');

async function getProfile(req, res) {
    try {
        const user = await users.findUserById(req.user.id_usuario);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        return res.json(user);
    } catch (error) { return res.status(500).json({ error: 'Não foi possível carregar o perfil.' }); }
}

async function updateProfile(req, res) {
    try {
        const body = { ...req.body };
        if ((body.nome !== undefined && (typeof body.nome !== 'string' || !body.nome.trim())) ||
            (body.email !== undefined && (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)))) {
            return res.status(400).json({ error: 'Informe nome e e-mail válidos.' });
        }
        if (body.nomeSocial !== undefined) body.nome_social = body.nomeSocial;
        const current = await users.findUserById(req.user.id_usuario);
        if (!current) return res.status(404).json({ error: 'Usuário não encontrado.' });
        // O vínculo não é editável pelo formulário de perfil.
        delete body.tipo_usuario;
        await users.updateUser(req.user.id_usuario, body);
        return res.json({ usuario: await users.findUserById(req.user.id_usuario) });
    } catch (error) {
        return res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: 'Não foi possível salvar o perfil.' });
    }
}

async function logout(req, res) {
    try {
        await sessions.deleteUserSession(req.session.id_token, req.user.id_usuario);
        return res.json({ message: 'Sessão encerrada.' });
    } catch (error) { return res.status(500).json({ error: 'Não foi possível encerrar a sessão.' }); }
}

async function logoutOthers(req, res) {
    try {
        await db.execute('DELETE FROM tokens WHERE id_usuario = ? AND id_token <> ?', [req.user.id_usuario, req.session.id_token]);
        return res.json({ message: 'Outras sessões encerradas.' });
    } catch (error) { return res.status(500).json({ error: 'Não foi possível encerrar as sessões.' }); }
}

async function changePassword(req, res) {
    try {
        const { senhaAtual, novaSenha } = req.body;
        if (typeof senhaAtual !== 'string' || typeof novaSenha !== 'string' || novaSenha.length < 8) {
            return res.status(400).json({ error: 'Informe a senha atual e uma nova senha de pelo menos 8 caracteres.' });
        }
        const profile = await users.findUserById(req.user.id_usuario);
        const user = profile && await auth.findUserByEmail(profile.email);
        if (!user || !await bcrypt.compare(senhaAtual, user.senha)) {
            return res.status(400).json({ error: 'Senha atual incorreta.' });
        }
        await db.execute('UPDATE usuarios SET senha = ? WHERE id_usuario = ?', [await bcrypt.hash(novaSenha, 10), req.user.id_usuario]);
        await db.execute('DELETE FROM tokens WHERE id_usuario = ? AND id_token <> ?', [req.user.id_usuario, req.session.id_token]);
        return res.json({ message: 'Senha alterada.' });
    } catch (error) { return res.status(500).json({ error: 'Não foi possível alterar a senha.' }); }
}

module.exports = { getProfile, updateProfile, logout, logoutOthers, changePassword };
