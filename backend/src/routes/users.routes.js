const express = require("express");

const router = express.Router();

const { authenticateToken, authorizeAdmin } = require("../middlewares/auth.middleware");

const {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} = require("../controllers/users.controller");

router.get("/", listUsers);

router.get("/:id", authenticateToken, getUserById);
    
router.post("/", createUser);

router.put("/:id", authenticateToken, (req, res, next) => {
    if (String(req.user.id_usuario) !== req.params.id && !req.user.is_admin) return res.status(403).json({ error: 'Sem permissão.' });
    if (!req.user.is_admin) delete req.body.tipo_usuario;
    next();
}, updateUser);

router.delete("/:id", authenticateToken, authorizeAdmin, deleteUser);

module.exports = router;