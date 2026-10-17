const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verificationEnabled } = require('../backend/src/services/email-config.service');
test('confirmação exige ativação explícita e aceita espaços e maiúsculas', t => {
    const previous = process.env.EMAIL_VERIFICATION_ENABLED;
    t.after(() => { if (previous === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED; else process.env.EMAIL_VERIFICATION_ENABLED = previous; });
    for (const value of ['', 'false', '0', 'yes', 'tru']) {
        process.env.EMAIL_VERIFICATION_ENABLED = value;
        assert.equal(verificationEnabled(), false);
    }
    delete process.env.EMAIL_VERIFICATION_ENABLED;
    assert.equal(verificationEnabled(), false);
    for (const value of ['true', 'TRUE', ' true ']) {
        process.env.EMAIL_VERIFICATION_ENABLED = value;
        assert.equal(verificationEnabled(), true);
    }
});
