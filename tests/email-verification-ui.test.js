const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
    vm = require('node:vm');

test('erro de rede ou expiração mantém confirmação disponível e não redireciona; sucesso limpa estado e vai ao login', async () => {
    for (const failure of [true,false]) {
        const nodes={},requests=[],redirects=[],stored=new Map();
        for(const id of ['confirmEmailForm','resendEmailForm','emailVerificationStatus']) nodes[id]={events:{},button:{},elements:{email:{}},querySelector(){return this.button;},addEventListener(k,fn){this.events[k]=fn;}};
        let fail=failure;
        const context={
            document:{getElementById:id=>nodes[id]},
            location:{hash:'#token='+'b'.repeat(64),pathname:'/verify-email.html',replace:to=>redirects.push(to)},
            history:{replaceState(){}},URLSearchParams,
            window:{sessionStorage:{getItem:k=>stored.get(k),removeItem:k=>stored.delete(k),setItem:(k,v)=>stored.set(k,v)},Arcadia:{api:{post:async(path,body,options)=>{requests.push({path,body,options});if(fail)throw Error('Link expirado ou rede indisponível');return{message:'E-mail confirmado.',alreadyConfirmed:true};},expect:p=>p},token:{clear(){assert.fail('Cadastro confirmado não autentica nem altera outra sessão');}}}}
        };
        vm.runInNewContext(fs.readFileSync('front/js/email-verification.js','utf8'),context);
        assert.equal(requests.length,0);
        nodes.confirmEmailForm.events.submit({preventDefault(){}});
        await new Promise(resolve=>setImmediate(resolve));
        if(failure) {
            assert.equal(redirects.length,0);assert.equal(nodes.confirmEmailForm.hidden,false);assert.equal(nodes.confirmEmailForm.button.disabled,false);
            fail=false;nodes.confirmEmailForm.events.submit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
        }
        assert.deepEqual(redirects,['login.html']);assert.equal(stored.get('arcadia.emailConfirmed'),'1');
        assert.ok(![...stored.values()].some(value=>value==='b'.repeat(64)));
        assert.equal(nodes.confirmEmailForm.hidden,true);
    }
});
test('abrir fragmento não envia token; clique explícito confirma e remove o token da URL', async () => {
    const nodes = {},
        calls = [];
    for (const id of ['confirmEmailForm', 'resendEmailForm', 'emailVerificationStatus'])
        nodes[id] = {
            events: {},
            hidden: false,
            button: {},
            elements: { email: { value: 'person@example.test' } },
            querySelector() {
                return this.button;
            },
            addEventListener(name, fn) {
                this.events[name] = fn;
            }
        };
    let removed = false,
        cleared = false;
    vm.runInNewContext(fs.readFileSync('front/js/email-verification.js', 'utf8'), {
        document: { getElementById: (id) => nodes[id] },
        location: { hash: '#token=' + 'a'.repeat(64), pathname: '/verify-email.html', replace: value => calls.push({redirect:value}) },
        history: {
            replaceState() {
                removed = true;
            }
        },
        URLSearchParams,
        window: {
            sessionStorage: {
                getItem: () => 'signup@example.test',
                removeItem: () => {}
            },
            Arcadia: {
                api: {
                    post: (path, body, options) => {
                        calls.push({ path, body, options });
                        return { message: 'E-mail confirmado.', reauthenticate: true };
                    },
                    expect: async (value) => value
                },
                token: {
                    clear() {
                        cleared = true;
                    }
                }
            }
        }
    });
    assert.equal(nodes.resendEmailForm.elements.email.value, 'signup@example.test');
    assert.equal(removed, true);
    assert.equal(calls.length, 0);
    assert.equal(nodes.confirmEmailForm.hidden, false);
    nodes.confirmEmailForm.events.submit({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.filter(call => call.path).length, 1);
    assert.equal(calls[0].path, '/api/email-verification/confirm');
    assert.equal(calls[0].options.auth, false);
    assert.equal(nodes.confirmEmailForm.hidden, true);
    assert.equal(nodes.resendEmailForm.hidden, true);
    assert.equal(cleared, true);
    nodes.confirmEmailForm.events.submit({ preventDefault() {} });
    nodes.resendEmailForm.events.submit({ preventDefault() {} });
    assert.equal(calls.filter(call => call.path).length, 1);
    assert.ok(calls.some(call => call.redirect === 'login.html'));
});

test('cadastro abre confirmação com destinatário preenchido e aviso de envio sem disparar mensagem', () => {
    for (const notice of ['sent', 'failed']) {
        const fields = {
            confirmEmailForm: { hidden: false, addEventListener() {} },
            resendEmailForm: { elements: { email: { value: '' } }, addEventListener() {} },
            emailVerificationStatus: { textContent: '' }
        };
        const session = new Map([
            ['arcadia.pendingEmail', 'signup@example.test'],
            ['arcadia.signupNotice', notice]
        ]);
        vm.runInNewContext(fs.readFileSync('front/js/email-verification.js', 'utf8'), {
            document: { getElementById: (id) => fields[id] },
            location: { hash: '', pathname: '/verify-email.html' },
            URLSearchParams,
            window: {
                sessionStorage: {
                    getItem: (key) => session.get(key),
                    removeItem: (key) => session.delete(key)
                },
                Arcadia: { api: { post: () => assert.fail('Não enviar automaticamente') } }
            }
        });
        assert.equal(fields.resendEmailForm.elements.email.value, 'signup@example.test');
        assert.equal(fields.confirmEmailForm.hidden, true);
        assert.match(fields.emailVerificationStatus.textContent, /conta foi criada/);
        assert.match(
            fields.emailVerificationStatus.textContent,
            notice === 'sent' ? /Abra o link/ : /solicitar outro link/
        );
        assert.equal(session.has('arcadia.signupNotice'), false);
        assert.equal(session.get('arcadia.pendingEmail'), 'signup@example.test');
    }
});

for (const storedEmail of ['signup@example.test', null, 'invalid']) {
    test('reenvio usa destinatário original sem digitação: ' + storedEmail, async () => {
        const calls = [];
        const nodes = {};
        for (const id of ['confirmEmailForm', 'resendEmailForm', 'emailVerificationStatus']) {
            nodes[id] = {
                events: {},
                button: {},
                elements: { email: { value: '' } },
                querySelector() {
                    return this.button;
                },
                addEventListener(name, fn) {
                    this.events[name] = fn;
                }
            };
        }
        vm.runInNewContext(fs.readFileSync('front/js/email-verification.js', 'utf8'), {
            document: { getElementById: (id) => nodes[id] },
            location: { hash: '', pathname: '/verify-email.html' },
            URLSearchParams,
            window: {
                sessionStorage: {
                    getItem: (key) => (key === 'arcadia.pendingEmail' ? storedEmail : null),
                    removeItem() {}
                },
                Arcadia: {
                    api: {
                        post: (path, body) => {
                            calls.push({ path, body });
                            return { message: 'Solicitação recebida.' };
                        },
                        expect: async (value) => value
                    }
                }
            }
        });
        const resend = nodes.resendEmailForm;
        assert.equal(calls.length, 0);
        assert.equal(resend.elements.email.readOnly, true);
        if (storedEmail === 'signup@example.test') {
            assert.equal(resend.hidden, false);
            await resend.events.submit({ preventDefault() {} });
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(calls[0].body.email, storedEmail);
            // Alterar a exibição não muda o destinatário capturado do cadastro/login.
            resend.elements.email.value = 'other@example.test';
            await resend.events.submit({ preventDefault() {} });
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(calls[1].body.email, storedEmail);
        } else {
            assert.equal(resend.hidden, true);
            resend.events.submit({ preventDefault() {} });
            assert.equal(calls.length, 0);
            assert.match(nodes.emailVerificationStatus.textContent, /Volte ao login/);
        }
    });
}
