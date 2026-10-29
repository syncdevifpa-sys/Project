const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');
const { createRequire } = require('node:module');
const service = require('../backend/src/services/email.service');
const { emailAddress } = require('../backend/src/services/email-address.service');
const controller = require('../backend/src/controllers/passwordRecovery.controller');
const recovery = require('../backend/src/models/passwordRecovery.model');
const limits = require('../backend/src/services/security-limits.service');
const db = require('../backend/src/config/database');
const nodemailer = createRequire(require.resolve('../backend/src/services/email.service'))(
    'nodemailer'
);
const createRealTransport = nodemailer.createTransport.bind(nodemailer);
after(() => db.end());
function response() {
    return {
        code: 200,
        status(code) {
            this.code = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

function mailEnvironment(t) {
    for (const [key, value] of Object.entries({
        SMTP_USER: 'sender@example.test',
        SMTP_PASS: 'test-only',
        APP_URL: 'https://portal.example.test'
    })) {
        const original = process.env[key];
        process.env[key] = value;
        t.after(() => {
            if (original === undefined) delete process.env[key];
            else process.env[key] = original;
        });
    }
}

test('endereço aceita só um destinatário simples e rejeita listas, HTML e controles antes de SMTP', async (t) => {
    assert.equal(emailAddress('name+tag@EXAMPLE.test'), 'name+tag@example.test');
    const invalid = [
        null,
        {},
        ['one@example.test'],
        'one@example.test,two@example.test',
        'Name <one@example.test>',
        'one@example.test;two@example.test',
        'one@example.test\r\nBcc:two@example.test',
        '<b>@example.test',
        'a'.repeat(65) + '@example.test',
        'a..b@example.test',
        'x@-example.test',
        'x@example.test\0'
    ];
    t.mock.method(nodemailer, 'createTransport', () =>
        assert.fail('Entrada inválida não pode abrir SMTP')
    );
    for (const email of invalid) {
        assert.throws(() => emailAddress(email));
        await assert.rejects(service.sendPasswordRecovery(email, 'a'.repeat(64)));
    }
    await assert.rejects(service.sendPasswordRecovery('one@example.test', '<b>token</b>'));
});

test('rota antiga retorna 410 sem autenticação e nunca entrega payloads a um transporte', async (t) => {
    t.mock.method(nodemailer, 'createTransport', () =>
        assert.fail('Boas-vindas não podem abrir SMTP')
    );
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/auth', require('../backend/src/routes/auth.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    for (const body of [
        { email: 'one@example.test' },
        { email: ['one@example.test', 'two@example.test'] },
        { email: { address: 'one@example.test' } },
        {
            email: 'one@example.test',
            nome: '<img src=x onerror=alert(1)>',
            provider: 'Google verificado'
        },
        { email: 'one@example.test\r\nBcc:two@example.test' }
    ]) {
        const res = await fetch(
            'http://127.0.0.1:' + server.address().port + '/api/auth/send-welcome',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );
        assert.equal(res.status, 410);
        const result = await res.json();
        assert.deepEqual(Object.keys(result), ['error']);
        assert.equal(result.details, undefined);
    }
});

test('transporte restringe destinatários, rede, arquivos e TLS; erro SMTP é substituído', async (t) => {
    mailEnvironment(t);
    let options, message;
    t.mock.method(nodemailer, 'createTransport', (data) => {
        options = data;
        return {
            sendMail: async (data) => {
                message = data;
                return { accepted: [data.to] };
            },
            close() {}
        };
    });
    await service.sendPasswordRecovery('recipient@example.test', 'a'.repeat(64));
    assert.equal(options.maxRecipients, 1);
    assert.equal(options.disableFileAccess, true);
    assert.equal(options.disableUrlAccess, true);
    assert.equal(options.requireTLS, true);
    assert.equal(options.tls.rejectUnauthorized, true);
    assert.equal(message.to, 'recipient@example.test');
    assert.deepEqual(message.envelope.to, ['recipient@example.test']);
    assert.match(message.html, /Redefinir senha<\/a>/);
    assert.doesNotMatch(message.html, /<form|<script|onclick/i);
    assert.equal(message.provider, undefined);
    assert.equal(message.raw, undefined);
    t.mock.method(nodemailer, 'createTransport', () => ({
        sendMail: async () => {
            throw Error('SMTP secret must not escape');
        },
        close() {}
    }));
    await assert.rejects(
        service.sendPasswordRecovery('recipient@example.test', 'a'.repeat(64)),
        (error) => error.message === 'PASSWORD_RECOVERY_DELIVERY_FAILED'
    );
});

test('limite ou indisponibilidade bloqueia antes de procurar conta e não cria token nem envia mensagem', async (t) => {
    t.mock.method(service, 'recoveryConfigured', () => true);
    t.mock.method(recovery, 'findInstitutionalByEmail', () => assert.fail('Não consultar conta'));
    t.mock.method(recovery, 'createRecovery', () => assert.fail('Não criar recuperação'));
    t.mock.method(service, 'sendPasswordRecovery', () => assert.fail('Não enviar'));
    for (const status of [429, 503]) {
        t.mock.method(limits, 'requestRecovery', async () => {
            throw Object.assign(Error('internal detail'), { status });
        });
        const res = response();
        await controller.requestRecovery(
            { body: { email: 'recipient@example.test' }, ip: '127.0.0.1' },
            res
        );
        assert.equal(res.code, status);
        assert.ok(!JSON.stringify(res.body).includes('internal detail'));
    }
});

test('cota global mantém resposta genérica e não cria link para envio negado', async (t) => {
    t.mock.method(service, 'recoveryConfigured', () => true);
    t.mock.method(limits, 'requestRecovery', async () => {});
    t.mock.method(limits, 'delivery', async () => {
        throw Object.assign(Error('budget'), { status: 429 });
    });
    t.mock.method(recovery, 'findInstitutionalByEmail', async () => ({
        id_usuario: 1,
        email: 'recipient@example.test'
    }));
    t.mock.method(recovery, 'createRecovery', () => assert.fail('Não criar link'));
    const res = response();
    await controller.requestRecovery({ body: { email: 'recipient@example.test' } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(Object.keys(res.body), ['message']);
});

test('navegador não envia boas-vindas nem cria sessão Google fictícia', async () => {
    const context = {
        window: { Arcadia: { api: {}, token: {} } },
        document: { readyState: 'loading', addEventListener() {} },
        alert() {},
        localStorage: {
            setItem() {
                assert.fail('Não criar sessão');
            }
        },
        fetch() {
            assert.fail('Não enviar e-mail');
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/auth.js', 'utf8'), context);
    const result = await context.window.Arcadia.auth.sendWelcomeEmail({
        email: 'one@example.test'
    });
    assert.equal(result.success, false);
    await assert.rejects(
        context.window.Arcadia.auth.completeGoogleAuth('Nome', 'one@example.test', ''),
        /botão oficial do Google/
    );
    for (const file of ['front/login.html', 'front/signup.html'])
        assert.ok(!fs.readFileSync(file, 'utf8').includes('@emailjs/browser'));
});

test('Nodemailer compõe recuperação em texto e confirmação multipart em memória, sem SMTP', async (t) => {
    mailEnvironment(t);
    const create = createRealTransport;
    const messages = [];
    t.mock.method(nodemailer, 'createTransport', (options) => {
        const stream = create({
            streamTransport: true,
            buffer: true,
            disableFileAccess: options.disableFileAccess,
            disableUrlAccess: options.disableUrlAccess,
            maxRecipients: options.maxRecipients
        });
        return {
            async sendMail(data) {
                const result = await stream.sendMail(data);
                messages.push(
                    result.message
                        .toString()
                        .replace(/=\r?\n/g, '')
                        .replace(/=3D/g, '=')
                );
                return { accepted: result.envelope.to };
            },
            close() {
                stream.close();
            }
        };
    });
    await service.sendPasswordRecovery('recipient@example.test', 'a'.repeat(64));
    await service.sendEmailVerification('recipient@example.test', 'b'.repeat(64));
    assert.match(messages[0], /reset-password\.html#token=/);
    assert.match(messages[1], /verify-email\.html#token=/);
    for (const message of messages) {
        assert.match(message, /Content-Type: text\/plain/);
        assert.doesNotMatch(message, /^Bcc:/m);
    }
    assert.match(messages[0], /Content-Type: multipart\/alternative/);
    assert.match(messages[0], /Content-Type: text\/html/);
    assert.match(messages[1], /Content-Type: multipart\/alternative/);
    assert.match(messages[1], /Content-Type: text\/html/);
});
