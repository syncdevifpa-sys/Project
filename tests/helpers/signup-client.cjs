const fs = require('node:fs');
const vm = require('node:vm');
module.exports = function signupClient(role, email, post, access = 'cadastro') {
    const error = { textContent: '', style: {} },
        success = { textContent: '', style: {} },
        help = { hidden: true };
    const fields = {
        '#nome, #name': { value: 'Pessoa de teste' },
        '#email': { value: email },
        '#senha, #password': { value: 'password-for-test-only' },
        '#telefone, #phone': { value: '' },
        '#vinculoInput, #affiliationInput': { value: role === 'users' ? 'Student' : 'External' },
        '#curso': { value: '1' },
        '.mensagem-erro, .error-message': error,
        '.mensagem-sucesso, .success-message': success,
        '[data-signup-verification]': help
    };
    let submit, ready;
    const timers = [];
    const form = {
        getAttribute: () => access,
        querySelector: (selector) => fields[selector] || null,
        addEventListener: (_, fn) => {
            submit = fn;
        }
    };
    const storage = new Map();
    const window = {
        location: { href: 'signup.html' },
        addEventListener() {},
        Arcadia: { api: { post }, token: { set: value => storage.set('arcadiaToken', value), get: () => storage.get('arcadiaToken') } }
    };
    vm.runInNewContext(fs.readFileSync('front/js/auth.js', 'utf8'), {
        window,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        alert() {},
        setTimeout: (fn) => timers.push(fn),
        document: {
            readyState: 'loading',
            addEventListener: (_, fn) => {
                ready = fn;
            },
            getElementById: id => id === 'googleAuthForm' ? { addEventListener() {} } : null,
            querySelectorAll: (selector) => (selector === 'form[data-acesso]' ? [form] : [])
        }
    });
    ready();
    return { submit: () => submit({ preventDefault() {} }), error, success, help, timers, window, storage };
};
