const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('produção recusa senha alternativa, contas simuladas e sessões sem persistência', () => {
    const env = { ...process.env, NODE_ENV: 'production', VERCEL: '1', ARCADIA_DEV_MEMORY: 'true' };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(
        process.execPath,
        [
            '-e',
            `
        const assert = require('node:assert/strict');
        const bcrypt = require('bcrypt');
        const db = require('./backend/src/config/database');
        const auth = require('./backend/src/models/auth.model');
        const sessions = require('./backend/src/models/sessions.model');
        const jwt = require('jsonwebtoken');
        (async () => {
            const hash = await bcrypt.hash('uma-senha-diferente-para-o-teste', 4);
            assert.equal(await auth.comparePassword('senha123', hash), false);
            db.execute = async () => [[]];
            assert.equal(await auth.findUserByEmail('admin@ifpa.edu.br'), null);
            const error = Object.assign(new Error('offline'), { code: 'ECONNREFUSED', fatal: true });
            db.execute = async () => { throw error; };
            db.getConnection = async () => { throw error; };
            await assert.rejects(auth.findUserByEmail('admin@ifpa.edu.br'));
            await assert.rejects(sessions.createSession({ id_usuario: 1, token: 'test', expiracao: new Date() }));
            process.env.JWT_SECRET = 'chave-isolada-do-teste-sem-credenciais-reais';
            const token = jwt.sign({ id_usuario: 4, tipo_usuario: 'docente' }, process.env.JWT_SECRET);
            let code, continued = false;
            await require('./backend/src/middlewares/auth.middleware').authenticateToken(
                { headers: { authorization: 'Bearer ' + token } },
                { status(value) { code = value; return this; }, json() {} },
                () => { continued = true; }
            );
            assert.equal(code, 500);
            assert.equal(continued, false);
            assert.equal(require('./backend/src/services/development-mode.service').developmentFallbackEnabled(), false);
        })().catch(() => { process.exitCode = 1; }).finally(() => db.end());
    `
        ],
        { env, encoding: 'utf8', timeout: 20000 }
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
});
