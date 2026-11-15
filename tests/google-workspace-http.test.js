const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    express = require('express'),
    jwt = require('jsonwebtoken'),
    crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const db = require('../backend/src/config/database');
test('rotas Google verificam a sessão e isolam instituições e comunidade externa', async (t) => {
    const previous = db.execute,
        secret = process.env.JWT_SECRET,
        client = process.env.GOOGLE_CLIENT_ID,
        url = process.env.APP_URL;
    process.env.JWT_SECRET = 'google-integration-http-test-secret-32';
    process.env.GOOGLE_CLIENT_ID = '123-client.apps.googleusercontent.com';
    process.env.APP_URL = 'https://portal.example';
    const sql = new DatabaseSync(':memory:');
    sql.function('NOW', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
    sql.function('UTC_TIMESTAMP', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
    sql.exec(
        `CREATE TABLE usuarios(id_usuario INTEGER,is_admin INTEGER,situacao TEXT);CREATE TABLE publico_externo(id_externo INTEGER,situacao TEXT);CREATE TABLE conta_vinculos(id_externo INTEGER);CREATE TABLE tokens(id_token INTEGER,id_usuario INTEGER,id_externo INTEGER,token TEXT,expiracao TEXT);CREATE TABLE google_export_destinos(titular_tipo TEXT,titular_id INTEGER,google_sub TEXT,calendar_id TEXT,tasklist_id TEXT,reserva TEXT,reserva_ate TEXT,PRIMARY KEY(titular_tipo,titular_id,google_sub));INSERT INTO usuarios VALUES(1,0,'ativo'),(2,0,'ativo');INSERT INTO publico_externo VALUES(1,'ativo');`
    );
    db.execute = async (query, args = []) => {
        query = query
            .replace('INSERT IGNORE', 'INSERT OR IGNORE')
            .replace(
                'DATE_ADD(UTC_TIMESTAMP(),INTERVAL 3 MINUTE)',
                "datetime(UTC_TIMESTAMP(),'+3 minutes')"
            );
        const s = sql.prepare(query);
        return query.startsWith('SELECT')
            ? [s.all(...args)]
            : [{ affectedRows: s.run(...args).changes }];
    };
    const token = (id, external = false) => {
        const value = jwt.sign(
            external
                ? { id_externo: id, tipo_usuario: 'externo' }
                : { id_usuario: id, tipo_usuario: 'discente' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        sql.prepare('INSERT INTO tokens VALUES(?,?,?,?,?)').run(
            id,
            external ? null : id,
            external ? id : null,
            crypto.createHash('sha256').update(value).digest('hex'),
            '2099-01-01 00:00:00'
        );
        return value;
    };
    const a = token(1),
        b = token(2),
        external = token(1, true),
        app = express();
    app.use(express.json());
    app.use('/api', require('../backend/src/middlewares/subject.middleware').externalScope);
    app.use('/api/google-workspace', require('../backend/src/routes/googleWorkspace.routes'));
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(async () => {
        await new Promise((resolve) => server.close(resolve));
        db.execute = previous;
        sql.close();
        for (const [key, value] of [
            ['JWT_SECRET', secret],
            ['GOOGLE_CLIENT_ID', client],
            ['APP_URL', url]
        ]) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
    const base = 'http://127.0.0.1:' + server.address().port + '/api/google-workspace';
    const call = (path, credential, method = 'GET', body) =>
        fetch(base + path, {
            method,
            headers: {
                ...(credential ? { Authorization: 'Bearer ' + credential } : {}),
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
    assert.equal((await call('/config')).status, 401);
    assert.equal((await call('/config', 'forged')).status, 401);
    const config = await (await call('/config', a)).json();
    assert.equal(config.configured, true);
    assert.equal(config.appOrigin, 'https://portal.example');
    assert.ok(!JSON.stringify(config).includes('client_secret'));
    const lease = await (await call('/destinations/account/lease', a, 'POST', {})).json();
    assert.ok(lease.lease);
    assert.equal(
        (
            await call('/destinations/account', a, 'PUT', {
                lease: lease.lease,
                calendar_id: 'calendar-a'
            })
        ).status,
        200
    );
    assert.equal((await (await call('/destinations/account', b)).json()).calendar_id, null);
    assert.equal((await (await call('/destinations/account', external)).json()).calendar_id, null);
    assert.equal(
        (await call('/destinations/account', b, 'PUT', { lease: lease.lease, calendar_id: 'bad' }))
            .status,
        409
    );
    assert.equal((await (await call('/destinations/account', a)).json()).calendar_id, 'calendar-a');
});
