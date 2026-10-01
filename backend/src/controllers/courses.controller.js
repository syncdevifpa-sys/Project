const coursesModel = require("../models/courses.model");

async function listCourses(req, res) {
    try {
        const courses = await coursesModel.listCourses();

        return res.json(courses);

    } catch (error) {
        console.error("Erro ao buscar cursos:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getCourseById(req, res) {
    try {
        const courseId = req.params.id;

        const course = await coursesModel.findCourseById(courseId);

        if (!course) {
            return res.status(404).json({
                error: "Curso não encontrado."
            });
        }

        return res.json(course);

    } catch (error) {
        console.error("Erro ao buscar curso:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createCourse(req, res) {
    try {
        const { nome, nivel, ativo } = req.body;

        if (!nome) {
            return res.status(400).json({
                error: "Nome do curso é obrigatório."
            });
        }

        const result = await coursesModel.createCourse({
            nome,
            nivel,
            ativo
        });

        return res.status(201).json({
            message: "Curso criado com sucesso.",
            courseId: result.insertId
        });

    } catch (error) {
        console.error("Erro ao criar curso:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateCourse(req, res) {
    try {
        const courseId = req.params.id;

        const result = await coursesModel.updateCourse(
            courseId,
            req.body
        );

        if (!result) {
            return res.status(404).json({
                error: "Curso não encontrado."
            });
        }

        return res.json({
            message: "Curso atualizado com sucesso."
        });

    } catch (error) {
        console.error("Erro ao atualizar curso:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteCourse(req, res) {
    try {
        const courseId = req.params.id;

        const result = await coursesModel.deleteCourse(courseId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Curso não encontrado."
            });
        }

        return res.json({
            message: "Curso excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir curso:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};