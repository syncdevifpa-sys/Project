const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const limits = require('../backend/src/services/security-limits.service');
after(() => db.end());
function secret(t) {
    const old = process.env.RATE_LIMIT_SECRET;
    process.env.RATE_LIMIT_SECRET = 'test-only-distributed-key-with-32-bytes';
    t.after(() => {
        if (old === undefined) delete process.env.RATE_LIMIT_SECRET;
        else process.env.RATE_LIMIT_SECRET = old;
    });
}

// Modelo transacional compartilhado: simula duas instâncias disputando a mesma cota.
function store(t) {
    let records = new Map(),
        queue = Promise.resolve();
    const events = [];
    t.mock.method(db, 'getConnection', async () => {
        let unlock, working;
        return {
            async beginTransaction() {
                const prior = queue;
                queue = new Promise((resolve) => (unlock = resolve));
                await prior;
                working = new Map([...records].map(([key, row]) => [key, { ...row }]));
                events.push('begin');
            },
            async execute(sql, params) {
                if (sql.startsWith('INSERT')) {
                    if (!working.has(params[0]))
                        working.set(params[0], { janela: params[1], tentativas: 0 });
                    return [{ affectedRows: 1 }];
                }
                if (sql.startsWith('SELECT')) return [[{ ...working.get(params[0]) }]];
                if (sql.startsWith('UPDATE')) {
                    working.set(params[3], { janela: params[0], tentativas: params[1] });
                    return [{ affectedRows: 1 }];
                }
                assert.fail('Consulta não prevista');
            },
            async commit() {
                records = working;
                events.push('commit');
            },
            async rollback() {
                events.push('rollback');
            },
            release() {
                events.push('release');
                unlock?.();
            }
        };
    });
    return { records: () => records, events };
}

test('instâncias simultâneas compartilham cota e rollback não consome parcialmente outras dimensões', async (t) => {
    secret(t);
    const storage = store(t);
    const rules = [
        { subject: 'email:one@example.test', limit: 2, seconds: 3600 },
        { subject: 'global', limit: 10, seconds: 3600 }
    ];
    const result = await Promise.allSettled(
        Array.from({ length: 4 }, () => limits.consume('test', rules))
    );
    assert.equal(result.filter((r) => r.status === 'fulfilled').length, 2);
    assert.equal(
        result.filter((r) => r.status === 'rejected' && r.reason.status === 429).length,
        2
    );
    assert.ok([...storage.records().values()].every((row) => row.tentativas === 2));
    assert.ok(
        [...storage.records().keys()].every(
            (key) => /^[a-f0-9]{64}$/.test(key) && !key.includes('example')
        )
    );
    assert.equal(storage.events.filter((event) => event === 'release').length, 4);
    for (const row of storage.records().values()) row.janela = 0;
    await limits.consume('test', rules);
    assert.ok([...storage.records().values()].every((row) => row.tentativas === 1));
});

test('tabela ausente ou banco indisponível falham fechado e liberam conexão sem expor erro SQL', async (t) => {
    secret(t);
    const events = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        execute: async () => {
            throw Object.assign(Error('sensitive database detail'), { code: 'ER_NO_SUCH_TABLE' });
        },
        rollback: async () => events.push('rollback'),
        release: () => events.push('release')
    }));
    await assert.rejects(
        limits.consume('test', [{ subject: 'one', limit: 1, seconds: 60 }]),
        (e) => e.status === 503 && !e.message.includes('database')
    );
    assert.deepEqual(events, ['rollback', 'release']);
    t.mock.method(db, 'getConnection', async () => {
        throw Error('connection detail');
    });
    await assert.rejects(
        limits.consume('test', [{ subject: 'one', limit: 1, seconds: 60 }]),
        (e) => e.status === 503 && !e.message.includes('connection')
    );
});

test('segredo inadequado recusa antes de acessar banco', async (t) => {
    secret(t);
    process.env.RATE_LIMIT_SECRET = 'short';
    t.mock.method(db, 'getConnection', () => assert.fail('Não acessar banco'));
    await assert.rejects(
        limits.requestRecovery({ ip: '127.0.0.1' }, 'one@example.test'),
        (e) => e.status === 503
    );
});

test('liberação temporária de endereço funciona só localmente, expira e mantém cota por IP', async (t) => {
    secret(t);
    const keys = ['EMAIL_VERIFICATION_ADDRESS_LIMIT_BYPASS_UNTIL', 'DB_HOST', 'NODE_ENV', 'VERCEL'];
    const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    t.after(() => {
        for (const k of keys)
            if (previous[k] === undefined) delete process.env[k];
            else process.env[k] = previous[k];
    });
    process.env.DB_HOST = 'localhost';
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL;
    process.env.EMAIL_VERIFICATION_ADDRESS_LIMIT_BYPASS_UNTIL = new Date(
        Date.now() + 3600000
    ).toISOString();
    const storage = store(t);
    for (let n = 0; n < 10; n++) await limits.verification({ ip: '127.0.0.1' }, 'one@example.test');
    await assert.rejects(
        limits.verification({ ip: '127.0.0.1' }, 'one@example.test'),
        (e) => e.status === 429
    );
    assert.equal(storage.records().size, 1);
    process.env.EMAIL_VERIFICATION_ADDRESS_LIMIT_BYPASS_UNTIL = new Date(
        Date.now() - 1
    ).toISOString();
    for (let n = 0; n < 3; n++) await limits.verification({ ip: '::1' }, 'expired@example.test');
    await assert.rejects(
        limits.verification({ ip: '::1' }, 'expired@example.test'),
        (e) => e.status === 429
    );
    process.env.EMAIL_VERIFICATION_ADDRESS_LIMIT_BYPASS_UNTIL = new Date(
        Date.now() + 3600000
    ).toISOString();
    process.env.VERCEL = '1';
    for (let n = 0; n < 3; n++) await limits.verification({ ip: '::1' }, 'production@example.test');
    await assert.rejects(
        limits.verification({ ip: '::1' }, 'production@example.test'),
        (e) => e.status === 429
    );
});
