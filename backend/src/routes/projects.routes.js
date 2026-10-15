const express = require("express");

const router = express.Router();

const {
    listProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    registerForProject,
    cancelRegistration,
    listProjectRegistrations
} = require("../controllers/projects.controller");

const {
    authenticateToken,
    authorizeRoles,
    authorizeAdmin
} = require("../middlewares/auth.middleware");

router.get('/my', authenticateToken, async (req,res) => {
    try { const [rows] = await require('../config/database').execute('SELECT * FROM projetos WHERE id_usuario = ? ORDER BY criado_em DESC', [req.user.id_usuario]); res.json(rows); }
    catch { res.status(500).json({error:'Não foi possível carregar seus projetos.'}); }
});

// Public
router.get("/", listProjects);
router.get("/:id", getProjectById);

// Authenticated institutional user
router.post(
    "/",
    authenticateToken,
    createProject
);

// Teacher/staff
router.put(
    "/:id",
    authenticateToken,
    updateProject
);

router.get(
    "/:id/registrations",
    authenticateToken,
    authorizeRoles("docente", "servidor"),
    listProjectRegistrations
);

// Student
router.post(
    "/:id/register",
    authenticateToken,
    authorizeRoles("discente"),
    registerForProject
);

router.delete(
    "/:id/register",
    authenticateToken,
    authorizeRoles("discente"),
    cancelRegistration
);

// Administrator
router.patch(
    "/:id/approve",
    authenticateToken,
    authorizeAdmin,
    approveProject
);

router.patch(
    "/:id/reject",
    authenticateToken,
    authorizeAdmin,
    rejectProject
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeAdmin,
    deleteProject
);

module.exports = router;