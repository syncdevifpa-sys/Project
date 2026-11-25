/* Base PostgreSQL local: ainda não substitui a conexão MySQL do portal. */
const { Pool } = require('pg');

function config(env = process.env) {
    if (!env.POSTGRES_URL) throw Error('Configure POSTGRES_URL para o banco PostgreSQL de desenvolvimento.');
    const url = new URL(env.POSTGRES_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw Error('POSTGRES_URL inválida.');
    // SSL é definido explicitamente, sem parâmetros da URL que possam sobrescrever a validação.
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
        if (url.searchParams.has(key)) throw Error('Configure SSL com POSTGRES_SSL e POSTGRES_SSL_CA, sem parâmetros SSL na URL.');
    }
    if (!['true', 'false', undefined, ''].includes(env.POSTGRES_SSL)) throw Error('POSTGRES_SSL deve ser true ou false.');
    if (env.POSTGRES_SSL !== 'true' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        throw Error('Conexões PostgreSQL remotas exigem POSTGRES_SSL=true.');
    }
    return {
        connectionString: url.href,
        ssl: env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: true, ...(env.POSTGRES_SSL_CA ? { ca: env.POSTGRES_SSL_CA } : {}) } : false,
        max: 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        application_name: 'arcadia-portal',
        options: '-c timezone=America/Fortaleza',
        types: require('./postgres-types').postgresTypes
    };
}

function createDatabase(pool) {
    return {
        query: (sql, values = []) => pool.query(sql, values),
        async transaction(work) {
            const client = await pool.connect();
            let discard;
            try {
                await client.query('BEGIN');
                const result = await work(client);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                try { await client.query('ROLLBACK'); } catch (rollbackError) { discard = rollbackError; }
                throw error;
            } finally { client.release(discard); }
        },
        close: () => pool.end()
    };
}
// Conectar exige chamada explícita; importar este módulo não abre conexão.
function connect(env = process.env) { return createDatabase(new Pool(config(env))); }
module.exports = { config, createDatabase, connect };
