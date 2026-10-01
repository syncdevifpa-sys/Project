const express = require("express");

const router = express.Router();

const { authenticateToken } = require("../middlewares/auth.middleware");

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

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

module.exports = router;