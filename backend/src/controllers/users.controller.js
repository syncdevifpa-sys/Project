const usersModel = require("../models/users.model");
const bcrypt = require("bcrypt");

async function listUsers(req, res) {
    try {
        const users = await usersModel.listUsers();

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);

        res.status(500).json({
            error: "Error fetching users."
        });
    }
}

async function getUserById(req, res) {
    try {
        const userId = req.params.id;

        const user = await usersModel.findUserById(userId);

        if (!user) {
            return res.status(404).json({
                error: "User not found."
            });
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);

        res.status(500).json({
            error: "Error fetching user."
        });
    }
}

async function createUser(req, res) {
    try {
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);

        const userData = {
            ...req.body,
            senha: hashedPassword
        };
        

        const result = await usersModel.createUser(userData);

        res.status(201).json({
            message: "Usuario criado com sucesso.",
            userId: result.insertId
        });
    } catch (error) {
        console.error("Erro ao criar usuario:", error);

        res.status(500).json({
            error: error.message || "Erro ao criar usuario."
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
                error: "Usuario não encontrado."
            });
        }
        res.json({
            message: "Usuario atualizado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao atualizar usuario:", error);

        res.status(500).json({
            error: error.message || "Erro ao atualizar usuario."
        });
    }
}

async function deleteUser(req, res) {
    try {
        const userId = req.params.id;

        const result = await usersModel.deleteUser(userId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error:"Usuario não encontrado."
            });
        }

        res.json({
            message: "Usuario deletado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao deletar usuario:", error);

        res.status(500).json({
            error:"Erro ao deletar usuario."
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

