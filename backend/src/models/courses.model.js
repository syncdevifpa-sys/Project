const db = require("../config/database");

async function listCourses() {
    const [courses] = await db.execute(`
        SELECT
            id_curso,
            nome,
            nivel,
            ativo
        FROM cursos
        ORDER BY nome ASC
    `);

    return courses;
}

async function findCourseById(courseId) {
    const [courses] = await db.execute(`
        SELECT
            id_curso,
            nome,
            nivel,
            ativo
        FROM cursos
        WHERE id_curso = ?
    `, [courseId]);

    return courses[0];
}

async function createCourse(courseData) {
    const {
        nome,
        nivel = "tecnico",
        ativo = true
    } = courseData;

    const [result] = await db.execute(`
        INSERT INTO cursos (
            nome,
            nivel,
            ativo
        )
        VALUES (?, ?, ?)
    `, [
        nome,
        nivel,
        ativo
    ]);

    return result;
}

async function updateCourse(courseId, courseData) {
    const currentCourse = await findCourseById(courseId);

    if (!currentCourse) {
        return null;
    }

    const {
        nome = currentCourse.nome,
        nivel = currentCourse.nivel,
        ativo = currentCourse.ativo
    } = courseData;

    const [result] = await db.execute(`
        UPDATE cursos
        SET
            nome = ?,
            nivel = ?,
            ativo = ?
        WHERE id_curso = ?
    `, [
        nome,
        nivel,
        ativo,
        courseId
    ]);

    return result;
}

async function deleteCourse(courseId) {
    const [result] = await db.execute(`
        DELETE FROM cursos
        WHERE id_curso = ?
    `, [courseId]);

    return result;
}

module.exports = {
    listCourses,
    findCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};