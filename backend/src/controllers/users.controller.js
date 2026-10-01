const usersModel = require("../models/users.model");
const bcrypt = require("bcrypt");

async function listUsers(req, res) {
    try {
        const users = await usersModel.listUsers();

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);

        res.status(500).json({
            error: "Não foi possível listar os usuários."
        });
    }
}

async function getUserById(req, res) {
    try {
        const userId = req.params.id;

        const user = await usersModel.findUserById(userId);

        if (!user) {
            return res.status(404).json({
                error: "Usuário não encontrado."
            });
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);

        res.status(500).json({
            error: "Não foi possível carregar o usuário."
        });
    }
}

async function createUser(req, res) {
    try {
        const { nome, email, senha, tipo_usuario } = req.body;
        if (!nome || !email || typeof senha !== 'string' || senha.length < 8 || !['discente', 'docente', 'servidor'].includes(tipo_usuario)) {
            return res.status(400).json({ error: 'Informe nome, e-mail, vínculo e senha de pelo menos 8 caracteres.' });
        }
        const hashedPassword = await bcrypt.hash(senha, 10);

        const userData = {
            ...req.body,
            senha: hashedPassword
        };
        

        const result = await usersModel.createUser(userData);

        res.status(201).json({
            message: "Usuário criado com sucesso.",
            userId: result.insertId
        });
    } catch (error) {
        console.error("Erro ao criar usuario:", error);

        res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateUser(req, res) {
    try {
        const userId = req.params.id;
        const userData = req.body;

        const result = await usersModel.updateUser(userId, userData);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Usuário não encontrado."
            });
        }
        res.json({
            message: "Usuário atualizado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao atualizar usuario:", error);

        res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteUser(req, res) {
    try {
        const userId = req.params.id;

        const result = await usersModel.deleteUser(userId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error:"Usuário não encontrado."
            });
        }

        res.json({
            message: "Usuário excluído com sucesso."
        });
    } catch (error) {
        console.error("Erro ao excluir usuario:", error);

        res.status(500).json({
            error:"Erro ao excluir usuário."
        });
    }
}

module.exports = {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};

