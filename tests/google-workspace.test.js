const { test } = require('node:test'),
    assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const {
    createWorkspace,
    subject,
    destinations
} = require('../backend/src/services/google-workspace.service');
test('destinos e reservas ficam isolados entre titulares e contas externas', async (t) => {
    const sql = new DatabaseSync(':memory:');
    t.after(() => sql.close());
    sql.function('UTC_TIMESTAMP', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
    sql.exec(
        'CREATE TABLE google_export_destinos(titular_tipo TEXT,titular_id INTEGER,google_sub TEXT,calendar_id TEXT,tasklist_id TEXT,reserva TEXT,reserva_ate TEXT,PRIMARY KEY(titular_tipo,titular_id,google_sub));'
    );
    const db = {
        execute: async (query, args = []) => {
            query = query
                .replace('INSERT IGNORE', 'INSERT OR IGNORE')
                .replace(
                    'DATE_ADD(UTC_TIMESTAMP(),INTERVAL 3 MINUTE)',
                    "datetime(UTC_TIMESTAMP(),'+3 minutes')"
                );
            const statement = sql.prepare(query);
            return query.startsWith('SELECT')
                ? [statement.all(...args)]
                : [{ affectedRows: statement.run(...args).changes }];
        }
    };
    const service = createWorkspace(db),
        first = await service.claim(1, 'google-account');
    assert.match(first.lease, /^[a-f0-9]{48}$/);
    await service.save(1, 'google-account', {
        lease: first.lease,
        calendar_id: 'calendar@example.test',
        tasklist_id: 'tasks-1'
    });
    assert.equal((await service.read(1, 'google-account')).calendar_id, 'calendar@example.test');
    assert.equal((await service.read(2, 'google-account')).calendar_id, null);
    assert.equal((await service.read({ external: 1 }, 'google-account')).calendar_id, null);
    await assert.rejects(service.claim(1, 'google-account'), { status: 409 });
    await assert.rejects(
        service.save(2, 'google-account', { lease: first.lease, calendar_id: 'other' }),
        { status: 409 }
    );
    await service.release(1, 'google-account', first.lease);
    const next = await service.claim(1, 'google-account');
    assert.notEqual(first.lease, next.lease);
    await service.release(1, 'google-account', first.lease);
    await assert.rejects(service.claim(1, 'google-account'), { status: 409 });
    assert.equal((await service.read(1, 'google-account')).tasklist_id, 'tasks-1');
});
test('metadados recusam caracteres de controle e não aceitam guardar tokens', () => {
    assert.throws(() => subject("x' OR 1=1"), { status: 400 });
    assert.throws(() => destinations({ calendar_id: 'bad\nheader' }), { status: 400 });
    assert.deepEqual(destinations({ access_token: 'segredo', refresh_token: 'segredo' }), {});
    assert.deepEqual(destinations({ calendar_id: 'safe@google.test', id_usuario: 2 }), {
        calendar_id: 'safe@google.test'
    });
});
