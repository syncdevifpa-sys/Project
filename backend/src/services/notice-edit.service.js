const db = require('../config/database');
const enums = {
    tipo_publicacao: ['aviso', 'noticia'],
    categoria: ['matricula', 'edital', 'evento', 'cancelamento', 'calendario'],
    publico_alvo: ['todos', 'discente', 'docente', 'servidor', 'externo'],
    situacao: ['rascunho', 'publicado', 'arquivado']
};
const texts = { titulo: 150, resumo: 65535, descricao: 65535, referencia: 50 };
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function validateNotice(body, creation = false) {
    const values = {};
    for (const [key, limit] of Object.entries(texts))
        if (Object.hasOwn(body, key)) {
            let value = body[key];
            if (value == null && ['descricao', 'referencia'].includes(key)) values[key] = null;
            else {
                if (
                    typeof value !== 'string' ||
                    Buffer.byteLength(value, 'utf8') >
                        (key === 'titulo' || key === 'referencia' ? limit * 4 : limit) ||
                    value.length > limit
                )
                    fail(400, 'Texto inválido em ' + key + '.');
                value = value.trim();
                if (!value && ['titulo', 'resumo'].includes(key))
                    fail(400, 'Preencha título e resumo.');
                values[key] = value || null;
            }
        }
    if (creation && (!values.titulo || !values.resumo)) fail(400, 'Preencha título e resumo.');
    for (const [key, options] of Object.entries(enums))
        if (Object.hasOwn(body, key)) {
            if (!options.includes(body[key])) fail(400, 'Opção inválida em ' + key + '.');
            values[key] = body[key];
        }
    for (const key of ['urgente', 'fixado'])
        if (Object.hasOwn(body, key)) {
            if (![true, false, 0, 1].includes(body[key]))
                fail(400, 'Valor inválido em ' + key + '.');
            values[key] = Boolean(body[key]);
        }
    for (const key of ['data_prazo', 'data_evento'])
        if (Object.hasOwn(body, key)) {
            const value = body[key];
            if (
                value !== null &&
                value !== '' &&
                (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                    !Number.isFinite(Date.parse(value)) ||
                    new Date(value).toISOString().slice(0, 10) !== value)
            )
                fail(400, 'Data inválida.');
            values[key] = value || null;
        }
    if (Object.hasOwn(body, 'vagas')) {
        const value = body.vagas;
        if (
            value !== null &&
            value !== '' &&
            (!Number.isInteger(value) || value < 0 || value > 4294967295)
        )
            fail(400, 'Número de vagas inválido.');
        values.vagas = value === '' ? null : value;
    }
    if (Object.hasOwn(body, 'capa')) {
        if (body.capa !== null && typeof body.capa !== 'string')
            fail(400, 'Imagem de capa inválida.');
        const cover = body.capa || '';
        require('./profile-photo.service').validateProfilePhoto({ foto: cover });
        values.capa = cover || null;
    }
    return values;
}
async function editNotice(id, body, actorId) {
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
        fail(400, 'Identificador de publicação inválido.');
    const values = validateNotice(body);
    if (
        Object.hasOwn(values, 'tipo_publicacao') &&
        !(await require('./notice-schema.service').writableType(values.tipo_publicacao))
    )
        delete values.tipo_publicacao;
    if (
        Object.hasOwn(values, 'capa') &&
        !(await require('./notice-schema.service').writableCover(values.capa))
    )
        delete values.capa;
    const keys = Object.keys(values);
    if (!keys.length) fail(400, 'Nenhum campo para salvar.');
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [actors] = await connection.execute(
            "SELECT id_usuario, is_admin FROM usuarios WHERE id_usuario = ? AND situacao = 'ativo' FOR UPDATE",
            [actorId]
        );
        if (!actors.length) fail(403, 'Sessão institucional necessária.');
        const [notices] = await connection.execute(
            'SELECT id_usuario FROM avisos WHERE id_aviso = ? FOR UPDATE',
            [id]
        );
        if (!notices.length) fail(404, 'Aviso não encontrado.');
        const actor = actors[0];
        if (
            actor.is_admin !== true &&
            actor.is_admin !== 1 &&
            Number(notices[0].id_usuario) !== Number(actor.id_usuario)
        )
            fail(403, 'Somente o autor ou um administrador pode editar esta publicação.');
        const [result] = await connection.execute(
            `UPDATE avisos SET ${keys.map((key) => key + ' = ?').join(', ')} WHERE id_aviso = ?`,
            [...Object.values(values), id]
        );
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
module.exports = { editNotice, validateNotice };
