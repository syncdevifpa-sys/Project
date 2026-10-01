const express = require("express");

const router = express.Router();

const {
    listCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
} = require("../controllers/courses.controller");

const {
    authenticateToken,
    authorizeAdmin
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", listCourses);
router.get("/:id", getCourseById);

// Administrator routes
router.post(
    "/",
    authenticateToken,
    authorizeAdmin,
    createCourse
);

router.put(
    "/:id",
    authenticateToken,
    authorizeAdmin,
    updateCourse
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeAdmin,
    deleteCourse
);

module.exports = router;