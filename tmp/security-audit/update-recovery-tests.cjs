const fs=require('fs');const p='tests/password-recovery.test.js';let s=fs.readFileSync(p,'utf8').replace("const { test, after } = require('node:test');","const { test, after, beforeEach } = require('node:test');");s=s.replace('after(() => db.end());',`const limits = require('../backend/src/services/security-limits.service');
// Estes testes isolam a recuperação; a persistência distribuída tem testes próprios.
beforeEach(t => {
    for (const name of ['requestRecovery', 'delivery', 'reset']) t.mock.method(limits, name, async () => {});
});
after(() => db.end());`);fs.writeFileSync(p,s);
