/* Opt-in explícito. Nenhuma conexão é criada aqui e nenhuma API Google é chamada. */
const crypto = require('node:crypto');
const { identity } = require('../reminder-context.service');
const { subject, destinations } = require('../google-workspace.service');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const utcNow = "(clock_timestamp() AT TIME ZONE 'UTC')";

function createWorkspace(database) {
    if (typeof database?.query !== 'function') throw new Error('Informe uma conexão PostgreSQL explícita.');
    const keys = (owner, sub) => {
        const who = identity(owner);
        return [who.kind, who.id, subject(sub)];
    };
    function lease(value) {
        if (typeof value !== 'string' || !/^[a-f0-9]{48}$/.test(value)) fail(400, 'Reserva inválida.');
        return value;
    }
    async function read(owner, sub) {
        const { rows } = await database.query(`SELECT calendar_id, tasklist_id FROM google_export_destinos
            WHERE titular_tipo=$1 AND titular_id=$2 AND google_sub=$3`, keys(owner, sub));
        return rows[0] || { calendar_id: null, tasklist_id: null };
    }
    async function claim(owner, sub) {
        const args = keys(owner, sub), token = crypto.randomBytes(24).toString('hex');
        // O conflito e a aquisição da reserva são resolvidos na mesma instrução.
        const { rows } = await database.query(`INSERT INTO google_export_destinos
            (titular_tipo,titular_id,google_sub,reserva,reserva_ate)
            VALUES ($1,$2,$3,$4,${utcNow}+INTERVAL '3 minutes')
            ON CONFLICT (titular_tipo,titular_id,google_sub) DO UPDATE
            SET reserva=EXCLUDED.reserva, reserva_ate=${utcNow}+INTERVAL '3 minutes'
            WHERE google_export_destinos.reserva_ate IS NULL OR google_export_destinos.reserva_ate<${utcNow}
            RETURNING calendar_id,tasklist_id`, [...args, token]);
        if (!rows.length) fail(409, 'Já há um envio ao Google em andamento nesta conta. Aguarde e tente novamente.');
        return { lease: token, ...rows[0] };
    }
    async function save(owner, sub, body) {
        const data = destinations(body), entries = Object.entries(data);
        if (!entries.length) fail(400, 'Nenhum destino para salvar.');
        const args = [...entries.map(([, value]) => value), ...keys(owner, sub), lease(body.lease)];
        const offset = entries.length;
        // Nomes de colunas vêm exclusivamente da lista validada por destinations().
        const { rows } = await database.query(`UPDATE google_export_destinos SET
            ${entries.map(([key], i) => key+'=$'+(i+1)).join(',')}
            WHERE titular_tipo=$${offset+1} AND titular_id=$${offset+2} AND google_sub=$${offset+3}
            AND reserva=$${offset+4} AND reserva_ate>${utcNow}
            RETURNING calendar_id,tasklist_id`, args);
        if (!rows.length) fail(409, 'A reserva do envio expirou. Abra o envio novamente.');
        return rows[0];
    }
    async function release(owner, sub, value) {
        await database.query(`UPDATE google_export_destinos SET reserva=NULL,reserva_ate=NULL
            WHERE titular_tipo=$1 AND titular_id=$2 AND google_sub=$3 AND reserva=$4`,
            [...keys(owner, sub), lease(value)]);
    }
    return { read, claim, save, release };
}
module.exports = { createWorkspace };
