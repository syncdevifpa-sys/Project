/* Somente IDs de destino e associações; credenciais Google nunca são persistidas. */
const db = require('../config/database');
const crypto = require('node:crypto');
const { identity } = require('./reminder-context.service');
const fail = (status, message) => {
    throw Object.assign(new Error(message), { status });
};
function subject(value) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,255}$/.test(value))
        fail(400, 'Conta Google inválida.');
    return value;
}
function destinations(body) {
    const result = {};
    for (const key of ['calendar_id', 'tasklist_id'])
        if (Object.hasOwn(body, key)) {
            if (
                typeof body[key] !== 'string' ||
                !body[key] ||
                body[key].length > 1024 ||
                /[\x00-\x20]/.test(body[key])
            )
                fail(400, 'Destino Google inválido.');
            result[key] = body[key];
        }
    return result;
}
function createWorkspace(database = db, { dialect = 'mysql' } = {}) {
    if (dialect === 'postgres') return require('./postgres/google-workspace').createWorkspace(database);
    if (dialect !== 'mysql') throw new Error('Dialeto de banco não suportado.');
    const keys = (owner, sub) => {
        const who = identity(owner);
        return [who.kind, who.id, subject(sub)];
    };
    async function read(owner, sub) {
        const [rows] = await database.execute(
            'SELECT calendar_id,tasklist_id FROM google_export_destinos WHERE titular_tipo=? AND titular_id=? AND google_sub=?',
            keys(owner, sub)
        );
        return rows[0] || { calendar_id: null, tasklist_id: null };
    }
    async function claim(owner, sub) {
        const args = keys(owner, sub),
            lease = crypto.randomBytes(24).toString('hex');
        await database.execute(
            'INSERT IGNORE INTO google_export_destinos(titular_tipo,titular_id,google_sub) VALUES(?,?,?)',
            args
        );
        const [r] = await database.execute(
            'UPDATE google_export_destinos SET reserva=?,reserva_ate=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 3 MINUTE) WHERE titular_tipo=? AND titular_id=? AND google_sub=? AND (reserva_ate IS NULL OR reserva_ate<UTC_TIMESTAMP())',
            [lease, ...args]
        );
        if (!r.affectedRows)
            fail(
                409,
                'Já há um envio ao Google em andamento nesta conta. Aguarde e tente novamente.'
            );
        return { lease, ...(await read(owner, sub)) };
    }
    function lease(value) {
        if (typeof value !== 'string' || !/^[a-f0-9]{48}$/.test(value))
            fail(400, 'Reserva inválida.');
        return value;
    }
    async function save(owner, sub, body) {
        const values = destinations(body),
            entries = Object.entries(values);
        if (!entries.length) fail(400, 'Nenhum destino para salvar.');
        const [r] = await database.execute(
            'UPDATE google_export_destinos SET ' +
                entries.map(([key]) => key + '=?').join(',') +
                ' WHERE titular_tipo=? AND titular_id=? AND google_sub=? AND reserva=? AND reserva_ate>UTC_TIMESTAMP()',
            [...entries.map(([, v]) => v), ...keys(owner, sub), lease(body.lease)]
        );
        if (!r.affectedRows) fail(409, 'A reserva do envio expirou. Abra o envio novamente.');
        return read(owner, sub);
    }
    async function release(owner, sub, value) {
        await database.execute(
            'UPDATE google_export_destinos SET reserva=NULL,reserva_ate=NULL WHERE titular_tipo=? AND titular_id=? AND google_sub=? AND reserva=?',
            [...keys(owner, sub), lease(value)]
        );
    }
    return { read, claim, save, release };
}
module.exports = { createWorkspace, subject, destinations };
