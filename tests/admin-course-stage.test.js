const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateAcademicEdit } = require('../backend/src/services/profile-course.service');
const connection = (course) => ({ execute: async () => [[course]] });
const current = { id_curso: 2, periodo: 3 };
test('edição administrativa valida etapa por duração e regime do curso real', async () => {
    const c = connection({ id_curso: 2, regime_etapas: 'anual', total_etapas: 3 });
    await validateAcademicEdit(c, current, { periodo: 3 }, 'discente');
    await assert.rejects(validateAcademicEdit(c, current, { periodo: 4 }, 'discente'), {
        status: 400
    });
    const semester = connection({ id_curso: 2, regime_etapas: 'semestral', total_etapas: 6 });
    await validateAcademicEdit(semester, current, { periodo: 6 }, 'discente');
});
test('mudança de curso pede revisão explícita da etapa e não inventa duração para legado', async () => {
    const c = connection({ id_curso: 3, regime_etapas: null, total_etapas: null });
    await assert.rejects(validateAcademicEdit(c, current, { id_curso: 3 }, 'discente'), {
        status: 409
    });
    await assert.rejects(
        validateAcademicEdit(c, current, { id_curso: 3, periodo: 1 }, 'discente'),
        { status: 409 }
    );
    await assert.rejects(
        validateAcademicEdit(c, current, { id_curso: null, periodo: null }, 'discente'),
        { status: 400 }
    );
});
test('campos não acadêmicos continuam funcionando e curso opcional de Servidor é preservado', async () => {
    const c = { execute: async () => assert.fail('Não deve consultar etapas') };
    await validateAcademicEdit(c, {}, { telefone: '999' }, 'discente');
    await validateAcademicEdit(c, {}, { id_curso: null, periodo: null }, 'servidor');
    await validateAcademicEdit(
        c,
        { ...current, tipo_usuario: 'discente' },
        { id_curso: 2, periodo: 3 },
        'discente'
    );
});
