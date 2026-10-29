/* Validação compartilhada e edição transacional com verificação do autor atual. */
const db = require('../config/database');
const definitions = require('../../../front/js/content-fields');
const tables = {
    tasks: 'tarefas',
    documents: 'documentos',
    projects: 'projetos',
    calendar: 'calendario'
};
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function validateContent(kind, body, creation = false) {
    const config = definitions[kind];
    if (!tables[kind] || !config) fail(404, 'Recurso inexistente.');
    const values = {};
    for (const [name, , type, max] of config.fields) {
        if (!Object.hasOwn(body, name)) continue;
        let value = body[name];
        if (typeof type === 'object') {
            if (!Object.hasOwn(type, value)) fail(400, 'Opção inválida em ' + name + '.');
        } else if (type === 'checkbox') {
            if (![true, false, 0, 1].includes(value)) fail(400, 'Valor inválido em ' + name + '.');
            value = Boolean(value);
        } else if (type === 'number') {
            if (value === '' || value === null) value = null;
            else if (!Number.isSafeInteger(value) || value < 0 || value > 4294967295)
                fail(400, 'Número inválido em ' + name + '.');
        } else if (['date', 'time', 'datetime-local'].includes(type)) {
            if (value === '' || value === null) value = null;
            else if (type === 'date') {
                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                    !Number.isFinite(Date.parse(value)) ||
                    new Date(value).toISOString().slice(0, 10) !== value
                )
                    fail(400, 'Data inválida.');
            } else if (type === 'time') {
                if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value))
                    fail(400, 'Horário inválido.');
            } else {
                if (
                    !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?$/.test(value) ||
                    !Number.isFinite(Date.parse(value))
                )
                    fail(400, 'Data e horário inválidos.');
                value = value.replace('T', ' ');
            }
        } else {
            if (value === null) value = '';
            if (
                typeof value !== 'string' ||
                value.length > (max || 65535) ||
                Buffer.byteLength(value) > (type === 'textarea' ? 65535 : (max || 65535) * 4)
            )
                fail(400, 'Texto inválido em ' + name + '.');
            value = value.trim();
            if (type === 'url' && value) {
                let url;
                try {
                    url = new URL(value);
                } catch {}
                if (!url || !['http:', 'https:'].includes(url.protocol))
                    fail(400, 'Use um link HTTP ou HTTPS.');
            }
            if (!value && name !== 'titulo') value = null;
        }
        if (
            value === null &&
            Object.hasOwn(config.defaults, name) &&
            config.defaults[name] !== null
        )
            fail(400, 'Preencha ' + name + '.');
        values[name] = value;
    }
    const required = [
        'titulo',
        ...(kind === 'projects'
            ? ['descricao']
            : kind === 'calendar'
              ? ['data_evento']
              : kind === 'reminders'
                ? ['data_lembrete']
                : kind === 'links'
                  ? ['url']
                  : [])
    ];
    for (const key of required)
        if ((creation || Object.hasOwn(values, key)) && !values[key])
            fail(400, 'Preencha ' + key + '.');
    if (
        values.data_fim &&
        ((values.data_inicio && values.data_fim < values.data_inicio) ||
            (kind === 'calendar' && values.data_evento && values.data_fim < values.data_evento))
    )
        fail(400, 'A data final deve ser posterior à inicial.');
    if (kind === 'projects' && Object.hasOwn(body, 'capa')) {
        if (body.capa !== null && typeof body.capa !== 'string')
            fail(400, 'Imagem de capa inválida.');
        const cover = body.capa || '';
        require('./profile-photo.service').validateProfilePhoto({ foto: cover });
        values.capa = cover || null;
    }
    return values;
}
async function editContent(kind, id, body, actorId) {
    if (!tables[kind]) fail(404, 'Recurso inexistente.');
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
        fail(400, 'Identificador inválido.');
    const values = validateContent(kind, body);
    if (!Object.keys(values).length) fail(400, 'Nenhum campo para salvar.');
    const connection = await db.getConnection(),
        config = definitions[kind];
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute(
            "SELECT id_usuario, is_admin, tipo_usuario FROM usuarios WHERE id_usuario = ? AND situacao = 'ativo' FOR UPDATE",
            [actorId]
        );
        if (!users.length) fail(403, 'Sessão institucional necessária.');
        const actor = users[0],
            admin = actor.is_admin === 1 || actor.is_admin === true;
        const [rows] = await connection.execute(
            `SELECT * FROM ${tables[kind]} WHERE ${config.id} = ? FOR UPDATE`,
            [id]
        );
        if (!rows.length) fail(404, 'Registro não encontrado.');
        const row = rows[0];
        if (kind === 'projects' && Object.hasOwn(values, 'capa') && row && row.capa === undefined) {
            if (values.capa)
                fail(
                    409,
                    'A equipe precisa habilitar imagens de Projetos no banco. Seus dados continuam no formulário.'
                );
            delete values.capa;
        }
        if (kind === 'calendar') {
            const owner = Number(row.id_usuario) === Number(actorId);
            if ((row.visibilidade === 'pessoal' || values.visibilidade === 'pessoal') && !owner)
                fail(403, 'Somente o autor pode acessar um evento pessoal.');
            if (
                row.visibilidade === 'pessoal' &&
                values.visibilidade &&
                values.visibilidade !== 'pessoal' &&
                !admin &&
                !['docente', 'servidor'].includes(actor.tipo_usuario)
            )
                fail(
                    403,
                    'Esta conta pode manter eventos pessoais; a publicação pública é restrita.'
                );
            if (row.visibilidade === undefined && values.visibilidade === 'publico')
                delete values.visibilidade;
        }
        if (kind === 'links' ? !admin : !admin && Number(row.id_usuario) !== Number(actorId))
            fail(403, 'Somente o autor ou administrador pode editar este conteúdo.');
        if (kind === 'documents' && !admin && row.status !== 'solicitado')
            fail(
                409,
                'A solicitação já está em processamento. Os dados são mantidos pela secretaria.'
            );
        if (
            ['calendar', 'projects'].includes(kind) &&
            ['data_inicio', 'data_evento', 'data_fim'].some((key) => Object.hasOwn(values, key))
        ) {
            const value = (key) => (Object.hasOwn(values, key) ? values[key] : row[key]);
            const iso = (date) =>
                date instanceof Date
                    ? date.toISOString().slice(0, 10)
                    : String(date || '').slice(0, 10);
            const start = iso(value(kind === 'calendar' ? 'data_evento' : 'data_inicio')),
                end = iso(value('data_fim'));
            if (start && end && end < start)
                fail(400, 'A data final deve ser posterior à inicial.');
        }
        if (kind === 'tasks' && Object.hasOwn(values, 'status'))
            values.concluida_em =
                values.status === 'concluida' ? row.concluida_em || new Date() : null;
        if (kind === 'projects' && !admin && actor.tipo_usuario === 'discente') {
            values.aprovacao = 'pendente';
            values.aprovado_por = null;
        }
        if (kind === 'calendar' && row.oculto === undefined && values.oculto === false)
            delete values.oculto;
        const keys = Object.keys(values);
        if (!keys.length) fail(400, 'Nenhum campo para salvar.');
        const [result] = await connection.execute(
            `UPDATE ${tables[kind]} SET ${keys.map((key) => key + ' = ?').join(', ')} WHERE ${config.id} = ?`,
            [...Object.values(values), id]
        );
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        if (
            ['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code) &&
            /visibilidade/.test(error.sqlMessage || error.message || '')
        )
            fail(409, 'A visibilidade ampliada exige a migração 1.1.28.');
        if (
            kind === 'calendar' &&
            error.code === 'ER_BAD_FIELD_ERROR' &&
            /oculto|visibilidade/.test(error.sqlMessage || error.message || '')
        )
            fail(409, 'Atualize o banco para habilitar a visibilidade do calendário.');
        if (
            kind === 'calendar' &&
            ['WARN_DATA_TRUNCATED', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code)
        )
            fail(
                409,
                'Atualize as categorias do calendário no banco antes de salvar esta categoria.'
            );
        throw error;
    } finally {
        connection.release();
    }
}
module.exports = { validateContent, editContent };
