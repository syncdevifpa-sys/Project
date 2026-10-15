const courses = require('../models/courses.model');
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
async function validateProfileCourse(current, body) {
    if (!Object.hasOwn(body, 'id_curso')) return;
    // O vínculo atual vem do banco, nunca do corpo ou de um JWT antigo.
    if (current.tipo_usuario !== 'servidor') fail(403, 'A alteração própria de curso está disponível para Servidor.');
    await validateCourseSelection(body.id_curso, false);
}
async function validateCourseSelection(id, required) {
    if (id === null && !required) return;
    if (!Number.isInteger(id) || id <= 0) fail(400, required ? 'Selecione um curso cadastrado para Aluno.' : 'Selecione um curso válido ou Sem curso.');
    const course = await courses.findCourseById(id);
    if (!course || ![true,1].includes(course.ativo)) fail(400, 'Selecione um curso ativo cadastrado.');
}
module.exports = { validateProfileCourse, validateCourseSelection };
