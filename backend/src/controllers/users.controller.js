const usersModel = require('../models/users.model');

async function listUsers(req, res) {
    try {
        const users = await usersModel.listUsers();

        res.json(await require('../services/profile-sharing.service').publicPeople(users));
    } catch (error) {
        console.error('Error fetching users:', error);

        res.status(500).json({
            error: 'Não foi possível listar os usuários.'
        });
    }
}

async function getUserById(req, res) {
    try {
        const userId = req.params.id;

        const user = await usersModel.findUserById(userId, Boolean(req.user.is_admin));

        if (!user) {
            return res.status(404).json({
                error: 'Usuário não encontrado.'
            });
        }

        if (String(req.user.id_usuario) === String(userId)) return res.json(user);
        const visible = await require('../services/profile-sharing.service').publicPeople([user]);
        if (!visible.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
        res.json(visible[0]);
    } catch (error) {
        console.error('Error fetching user:', error);

        res.status(500).json({
            error: 'Não foi possível carregar o usuário.'
        });
    }
}

async function createUser(req, res) {
    if (!['discente','docente','servidor'].includes(req.body?.tipo_usuario))
        return res.status(400).json({error:'Escolha Aluno, Professor ou Servidor para solicitar um vínculo institucional.'});
    // Novas contas só recebem vínculo após aprovação administrativa; legado permanece intacto.
    return require('./externalUsers.controller').registerExternal(req, res);
}

async function updateUser(req, res) {
    try {
        const userId = req.params.id;
        const userData = req.body;
        if (req.user.is_admin && String(userId) !== String(req.user.id_usuario)) {
            await require('../services/admin.service').changePerson(
                'users',
                Number(userId),
                userData,
                req.user.id_usuario
            );
            return res.json({ message: 'Pessoa atualizada.' });
        }
        // Alterações de administração/situação usam somente a área administrativa protegida.
        delete userData.is_admin;
        delete userData.situacao;
        if (userData.tipo_usuario !== req.user.tipo_usuario) delete userData.tipo_usuario;
        require('../services/profile-photo.service').validateProfilePhoto(userData);
        if (Object.hasOwn(userData, 'id_curso')) {
            const current = await usersModel.findUserById(req.user.id_usuario);
            if (!current) return res.status(404).json({ error: 'Usuário não encontrado.' });
            await require('../services/profile-course.service').validateProfileCourse(
                current,
                userData
            );
        }

        const result = await usersModel.updateUser(userId, userData);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Usuário não encontrado.'
            });
        }
        res.json({
            message: 'Usuário atualizado com sucesso.'
        });
    } catch (error) {
        if (!error.status) console.error('Erro ao atualizar usuario:', error);

        res.status(error.status || 500).json({
            error: error.status
                ? error.message
                : 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteUser(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0)
            return res.status(400).json({ error: 'Identificador inválido.' });
        await require('../services/admin.service').changePerson(
            'users',
            id,
            {},
            req.user.id_usuario,
            true
        );
        return res.json({ message: 'Pessoa excluída.' });
    } catch (error) {
        return res
            .status(error.status || 500)
            .json({ error: error.status ? error.message : 'Não foi possível excluir a pessoa.' });
    }
}

module.exports = {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
