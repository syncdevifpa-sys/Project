const { developmentFallbackEnabled } = require('./development-mode.service');
/* Privacidade por campo: dados de acesso nunca entram no perfil público. */
const db = require('../config/database');
const photo = require('./profile-photo.service');
const defaults = () => ({
    contato_email: '',
    contato_handle: '',
    contato_telefone: '',
    mostrar_email: false,
    mostrar_handle: false,
    mostrar_telefone: false,
    mostrar_foto: false
});
const flags = ['mostrar_email', 'mostrar_handle', 'mostrar_telefone', 'mostrar_foto'];
const contacts = ['contato_email', 'contato_handle', 'contato_telefone'];
function fail(message, status = 400) {
    throw Object.assign(new Error(message), { status });
}
function column(kind) {
    if (!['users', 'external'].includes(kind)) fail('Tipo de conta inválido.');
    return kind === 'users' ? 'id_usuario' : 'id_externo';
}

function missing(error) {
    return (
        error.code === 'ER_NO_SUCH_TABLE' ||
        (developmentFallbackEnabled() && (error.code === 'ECONNREFUSED' || error.fatal))
    );
}
function normalize(body, external = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
        fail('Informe suas opções de compartilhamento.');
    const allowed = [...contacts, ...flags, ...(external ? ['foto'] : [])];
    if (Object.keys(body).some((key) => !allowed.includes(key)))
        fail('Campo de compartilhamento não permitido.');
    const result = {};
    for (const key of flags)
        if (Object.hasOwn(body, key)) {
            if (typeof body[key] !== 'boolean')
                fail('A visibilidade deve ser verdadeira ou falsa.');
            result[key] = body[key];
        }
    for (const key of contacts)
        if (Object.hasOwn(body, key)) {
            if (typeof body[key] !== 'string') fail('Informe um contato válido.');
            result[key] = body[key].trim();
            const limit = key === 'contato_email' ? 150 : key === 'contato_handle' ? 100 : 30;
            if (result[key].length > limit || /[\u0000-\u001f\u007f<>]/u.test(result[key]))
                fail('Contato muito longo ou com caracteres inválidos.');
        }
    if (result.contato_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contato_email))
        fail('Informe um e-mail de contato válido.');
    if (result.contato_telefone) {
        if (
            !/^\+?[\d\s().-]+$/.test(result.contato_telefone) ||
            !/^\d{7,15}$/.test(result.contato_telefone.replace(/\D/g, ''))
        )
            fail('Informe um telefone de 7 a 15 dígitos.');
        result.contato_telefone =
            (result.contato_telefone.startsWith('+') ? '+' : '') +
            result.contato_telefone.replace(/\D/g, '');
    }
    if (Object.hasOwn(body, 'foto')) {
        photo.validateProfilePhoto(body);
        result.foto = body.foto || '';
    }
    return result;
}
function own(row, available = true, external = false) {
    const result = { ...defaults(), disponivel: available };
    for (const key of contacts) result[key] = typeof row?.[key] === 'string' ? row[key] : '';
    for (const key of flags) result[key] = row?.[key] === true || row?.[key] === 1;
    if (external) result.foto = row?.foto || '';
    return result;
}
async function read(kind, id) {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM perfil_compartilhamento WHERE ${column(kind)} = ?`,
            [id]
        );
        return own(rows[0], true, kind === 'external');
    } catch (error) {
        if (missing(error)) return own(null, false, kind === 'external');
        throw error;
    }
}
async function save(kind, id, body) {
    const values = normalize(body, kind === 'external');
    const keys = Object.keys(values);
    if (!keys.length) return read(kind, id);
    try {
        await db.execute(
            `INSERT INTO perfil_compartilhamento (${column(kind)}, ${keys.join(', ')}) VALUES (${['?', ...keys.map(() => '?')].join(', ')}) ON DUPLICATE KEY UPDATE ${keys.map((key) => `${key} = ?`).join(', ')}`,
            [id, ...keys.map((key) => values[key]), ...keys.map((key) => values[key])]
        );
    } catch (error) {
        if (missing(error))
            fail(
                'O compartilhamento ainda não está habilitado no banco. A administração precisa aplicar add-profile-sharing.sql. Seus dados continuam privados.',
                409
            );
        throw error;
    }
    return read(kind, id);
}
function publicPerson(user, preferences) {
    const prefs = own(preferences);
    const result = {
        id_usuario: user.id_usuario,
        nome: user.nome,
        nome_social: user.nome_social,
        tipo_usuario: user.tipo_usuario,
        setor: user.setor,
        sobre: user.sobre
    };
    for (const [key, flag] of [
        ['contato_email', 'mostrar_email'],
        ['contato_handle', 'mostrar_handle'],
        ['contato_telefone', 'mostrar_telefone']
    ])
        if (prefs[flag] && prefs[key]) result[key] = prefs[key];
    if (prefs.mostrar_foto && user.foto) result.foto = user.foto;
    return result;
}
async function publicPeople(users) {
    let rows;
    try {
        [rows] = await db.execute(
            'SELECT * FROM perfil_compartilhamento WHERE id_usuario IS NOT NULL'
        );
    } catch (error) {
        if (!missing(error)) throw error;
        rows = [];
    }
    const byId = new Map(rows.map((row) => [String(row.id_usuario), row]));
    return users
        .filter((user) => !user.situacao || user.situacao === 'ativo')
        .map((user) => publicPerson(user, byId.get(String(user.id_usuario))));
}
function handlers(kind) {
    const id = (req) => (kind === 'external' ? req.externalUser.id_externo : req.user.id_usuario);
    const action = (fn) => async (req, res) => {
        try {
            res.json(await fn(req));
        } catch (error) {
            res.status(error.status || 500).json({
                error: error.status
                    ? error.message
                    : 'Não foi possível salvar ou carregar o compartilhamento.'
            });
        }
    };
    return {
        get: action((req) => read(kind, id(req))),
        put: action((req) => save(kind, id(req), req.body))
    };
}
module.exports = { defaults, normalize, own, read, save, publicPerson, publicPeople, handlers };
