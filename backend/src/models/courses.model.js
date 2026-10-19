const { developmentFallbackEnabled } = require('../services/development-mode.service');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

let fallbackCourses = null;
function getFallbackCourses() {
    if (!fallbackCourses) {
        try {
            const catalogPath = path.resolve(__dirname, '../../catalog/belem-courses-2026.json');
            const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            fallbackCourses = data.courses.map((c, index) => ({
                id_curso: index + 1,
                nome: c.nome,
                nivel: c.nivel || 'tecnico',
                ativo: 1
            }));
        } catch (error) {
        if (!developmentFallbackEnabled()) throw error;
            fallbackCourses = [
                { id_curso: 1, nome: 'Técnico em Desenvolvimento de Sistemas (Integrado)', nivel: 'tecnico', ativo: 1 },
                { id_curso: 2, nome: 'Tecnologia em Análise e Desenvolvimento de Sistemas', nivel: 'graduacao', ativo: 1 },
                { id_curso: 3, nome: 'Engenharia de Controle e Automação', nivel: 'graduacao', ativo: 1 },
                { id_curso: 4, nome: 'Técnico em Informática (Subsequente)', nivel: 'tecnico', ativo: 1 },
                { id_curso: 5, nome: 'Licenciatura em Física', nivel: 'graduacao', ativo: 1 }
            ];
        }
    }
    return fallbackCourses;
}

async function listCourses() {
    try {
        const [courses] = await db.execute(`
            SELECT
                id_curso,
                nome,
                nivel,
                ativo
            FROM cursos
            ORDER BY nome ASC
        `);

        if (Array.isArray(courses) && courses.length > 0) {
            return courses;
        }
    } catch (error) {
        if (!developmentFallbackEnabled()) throw error;
        // Fallback quando o banco não estiver disponível
    }

    return developmentFallbackEnabled() ? getFallbackCourses() : [];
}

async function findCourseById(courseId) {
    try {
        const [courses] = await db.execute(
            `
            SELECT
                id_curso,
                nome,
                nivel,
                ativo
            FROM cursos
            WHERE id_curso = ?
        `,
            [courseId]
        );

        if (courses && courses[0]) {
            return courses[0];
        }
    } catch (error) {
        if (!developmentFallbackEnabled()) throw error;
        // Fallback quando o banco não estiver disponível
    }

    if (!developmentFallbackEnabled()) return null;
    const numericId = Number(courseId);
    return getFallbackCourses().find((c) => c.id_curso === numericId) || null;
}

async function createCourse(courseData) {
    const { nome, nivel = 'tecnico', ativo = true } = courseData;

    try {
        const [result] = await db.execute(
            `
            INSERT INTO cursos (
                nome,
                nivel,
                ativo
            )
            VALUES (?, ?, ?)
        `,
            [nome, nivel, ativo]
        );

        return result;
    } catch (error) {
        if (!developmentFallbackEnabled()) throw error;
        const list = getFallbackCourses();
        const newId = list.length > 0 ? Math.max(...list.map((c) => c.id_curso)) + 1 : 1;
        list.push({ id_curso: newId, nome, nivel, ativo: ativo ? 1 : 0 });
        return { insertId: newId };
    }
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

    try {
        const [result] = await db.execute(
            `
            UPDATE cursos
            SET
                nome = ?,
                nivel = ?,
                ativo = ?
            WHERE id_curso = ?
        `,
            [nome, nivel, ativo, courseId]
        );

        return result;
    } catch (error) {
        if (!developmentFallbackEnabled()) throw error;
        currentCourse.nome = nome;
        currentCourse.nivel = nivel;
        currentCourse.ativo = ativo ? 1 : 0;
        return { affectedRows: 1 };
    }
}

async function deleteCourse(courseId) {
    try {
        const [result] = await db.execute(
            `
            DELETE FROM cursos
            WHERE id_curso = ?
        `,
            [courseId]
        );

        return result;
    } catch (error) {
        if (!developmentFallbackEnabled()) throw error;
        const list = getFallbackCourses();
        const idx = list.findIndex((c) => c.id_curso === Number(courseId));
        if (idx >= 0) {
            list.splice(idx, 1);
            return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
    }
}

module.exports = {
    listCourses,
    findCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};
