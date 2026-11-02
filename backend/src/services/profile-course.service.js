const courses = require('../models/courses.model');
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
async function validateProfileCourse(current, body) {
    if (!Object.hasOwn(body, 'id_curso')) return;
    // O vínculo atual vem do banco, nunca do corpo ou de um JWT antigo.
    if (current.tipo_usuario !== 'servidor')
        fail(403, 'A alteração própria de curso está disponível para Servidor.');
    await validateCourseSelection(body.id_curso, false);
}
async function validateCourseSelection(id, required) {
    if (id === null && !required) return;
    if (!Number.isInteger(id) || id <= 0)
        fail(
            400,
            required
                ? 'Selecione um curso cadastrado para Aluno.'
                : 'Selecione um curso válido ou Sem curso.'
        );
    const course = await courses.findCourseById(id);
    if (!course || ![true, 1].includes(course.ativo))
        fail(400, 'Selecione um curso ativo cadastrado.');
}
async function validateAcademicEdit(connection, current, data, role) {
    if (!Object.hasOwn(data, 'id_curso') && !Object.hasOwn(data, 'periodo')) return;
    const course = Object.hasOwn(data, 'id_curso') ? data.id_curso : current.id_curso;
    const stage = Object.hasOwn(data, 'periodo') ? data.periodo : current.periodo;
    if (role === current.tipo_usuario && course === current.id_curso && stage === current.periodo)
        return;
    if (role === 'discente' && (!Number.isInteger(course) || course <= 0))
        fail(400, 'Selecione um curso cadastrado para Aluno.');
    if (
        Object.hasOwn(data, 'id_curso') &&
        data.id_curso !== current.id_curso &&
        current.periodo != null &&
        !Object.hasOwn(data, 'periodo')
    )
        fail(
            409,
            'Informe também a etapa atual ao mudar o curso, sem reaproveitar a etapa anterior automaticamente.'
        );
    if (stage == null) return;
    if (!Number.isInteger(course) || course <= 0)
        fail(400, 'Selecione o curso antes de informar a etapa atual.');
    let rows;
    try {
        [rows] = await connection.execute(
            'SELECT id_curso,regime_etapas,total_etapas FROM cursos WHERE id_curso=? AND ativo=TRUE',
            [course]
        );
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR')
            fail(503, 'A estrutura de etapas dos cursos ainda precisa ser habilitada no banco.');
        throw error;
    }
    const row = rows[0];
    if (!row) fail(400, 'Selecione um curso ativo válido.');
    if (
        !['anual', 'semestral'].includes(row.regime_etapas) ||
        !Number.isInteger(row.total_etapas) ||
        row.total_etapas < 1 ||
        row.total_etapas > 20
    )
        fail(
            409,
            'Configure o regime e a quantidade real de etapas deste curso antes de alterar a etapa do aluno.'
        );
    if (!Number.isInteger(stage) || stage < 1 || stage > row.total_etapas)
        fail(
            400,
            `A etapa deve estar entre 1 e ${row.total_etapas} ${row.regime_etapas === 'anual' ? 'anos' : 'semestres'}.`
        );
}
module.exports = { validateProfileCourse, validateCourseSelection, validateAcademicEdit };
