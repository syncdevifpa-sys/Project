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
    authorizeRoles("docente", "servidor"),
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