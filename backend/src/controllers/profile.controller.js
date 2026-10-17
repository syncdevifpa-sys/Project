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
    } catch (error) {
        return res.status(500).json({ error: 'Não foi possível carregar o perfil.' });
    }
}

async function updateProfile(req, res) {
    try {
        const body = { ...req.body };
        if (
            (body.nome !== undefined && (typeof body.nome !== 'string' || !body.nome.trim())) ||
            (body.email !== undefined &&
                (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)))
        ) {
            return res.status(400).json({ error: 'Informe nome e e-mail válidos.' });
        }
        if (body.nomeSocial !== undefined) body.nome_social = body.nomeSocial;
        const current = await users.findUserById(req.user.id_usuario);
        if (!current) return res.status(404).json({ error: 'Usuário não encontrado.' });
        // O vínculo não é editável pelo formulário de perfil.
        delete body.tipo_usuario;
        delete body.is_admin;
        delete body.situacao;
        await require('../services/profile-course.service').validateProfileCourse(current, body);
        require('../services/profile-photo.service').validateProfilePhoto(body);
        await users.updateUser(req.user.id_usuario, body);
        return res.json({ usuario: await users.findUserById(req.user.id_usuario) });
    } catch (error) {
        return res
            .status(error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500))
            .json({ error: error.status ? error.message : 'Não foi possível salvar o perfil.' });
    }
}

async function logout(req, res) {
    try {
        await sessions.deleteUserSession(req.session.id_token, req.user.id_usuario);
        return res.json({ message: 'Sessão encerrada.' });
    } catch (error) {
        return res.status(500).json({ error: 'Não foi possível encerrar a sessão.' });
    }
}

async function logoutOthers(req, res) {
    try {
        await db.execute('DELETE FROM tokens WHERE id_usuario = ? AND id_token <> ?', [
            req.user.id_usuario,
            req.session.id_token
        ]);
        return res.json({ message: 'Outras sessões encerradas.' });
    } catch (error) {
        return res.status(500).json({ error: 'Não foi possível encerrar as sessões.' });
    }
}

async function changePassword(req, res) {
    let connection;
    try {
        const { senhaAtual, novaSenha } = req.body;
        if (
            typeof senhaAtual !== 'string' ||
            typeof novaSenha !== 'string' ||
            novaSenha.length < 8 ||
            Buffer.byteLength(novaSenha, 'utf8') > 72 ||
            Buffer.byteLength(senhaAtual, 'utf8') > 72
        ) {
            return res.status(400).json({
                error: 'Informe a senha atual e uma nova senha de pelo menos 8 caracteres.'
            });
        }
        const profile = await users.findUserById(req.user.id_usuario);
        const user = profile && (await auth.findUserByEmail(profile.email));
        if (!user || !(await bcrypt.compare(senhaAtual, user.senha))) {
            return res.status(400).json({ error: 'Senha atual incorreta.' });
        }
        const passwordHash = await bcrypt.hash(novaSenha, 10);
        connection = await db.getConnection();
        await connection.beginTransaction();
        await require('../services/email-verification.service').lock(connection);
        const [current] = await connection.execute(
            "SELECT senha FROM usuarios WHERE id_usuario = ? AND situacao = 'ativo' FOR UPDATE",
            [req.user.id_usuario]
        );
        if (!current.length || current[0].senha !== user.senha)
            throw Object.assign(
                new Error('A conta foi alterada. Confirme novamente sua senha atual.'),
                { status: 409 }
            );
        await connection.execute('UPDATE usuarios SET senha = ? WHERE id_usuario = ?', [
            passwordHash,
            req.user.id_usuario
        ]);
        await connection.execute('DELETE FROM tokens WHERE id_usuario = ? AND id_token <> ?', [
            req.user.id_usuario,
            req.session.id_token
        ]);
        await connection.execute(
            'UPDATE recuperacao_senha SET usado_em = NOW() WHERE id_usuario = ? AND usado_em IS NULL',
            [req.user.id_usuario]
        );
        await require('../services/email-verification.service').invalidate(
            connection,
            'users',
            req.user.id_usuario
        );
        await connection.commit();
        return res.json({ message: 'Senha alterada.' });
    } catch (error) {
        if (connection) await connection.rollback().catch(() => {});
        return res
            .status(error.status || 500)
            .json({ error: error.status ? error.message : 'Não foi possível alterar a senha.' });
    } finally {
        connection?.release();
    }
}

module.exports = { getProfile, updateProfile, logout, logoutOthers, changePassword };
