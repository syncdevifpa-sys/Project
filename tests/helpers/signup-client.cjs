const fs = require('node:fs');
const vm = require('node:vm');
module.exports = function signupClient(role, email, post, access = 'cadastro', initialSession = {}) {
    const error = { textContent: '', style: {} },
        success = { textContent: '', style: {} },
        help = { hidden: true },
        confirmationHelp = { hidden: true },
        confirmedNotice = { hidden: true };
    const fields = {
        '#nome, #name': { value: 'Pessoa de teste' },
        '#email': { value: email },
        '#senha, #password': { value: 'password-for-test-only' },
        '#telefone, #phone': { value: '' },
        '#vinculoInput, #affiliationInput': { value: role === 'users' ? 'Student' : 'External' },
        '#curso': { value: '1' },
        '#teacherMatricula': {value:'202600001'},
        '#teacherUsername': {value:'pessoa.teste'},
        '#studentCourseInfo': {value:'Informática · 1º semestre'},
        '.mensagem-erro, .error-message': error,
        '.mensagem-sucesso, .success-message': success,
        '[data-signup-verification]': help,
        '[data-email-verification-help]': confirmationHelp,
        '[data-email-confirmation-notice]': confirmedNotice
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
    const session = new Map(Object.entries(initialSession));
    const window = {
        location: { href: 'signup.html' },
        addEventListener() {},
        sessionStorage: {
            getItem: (key) => session.get(key) || null,
            setItem: (key, value) => session.set(key, value),
            removeItem: (key) => session.delete(key)
        },
        Arcadia: {
            api: { post },
            token: {
                set: (value) => storage.set('arcadiaToken', value),
                get: () => storage.get('arcadiaToken'),
                clear: () => {
                    storage.delete('arcadiaToken');
                    storage.delete('arcadiaSessao');
                }
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/auth.js', 'utf8'), {
        window,
        localStorage: {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key)
        },
        alert() {},
        setTimeout: (fn) => timers.push(fn),
        document: {
            readyState: 'loading',
            addEventListener: (_, fn) => {
                ready = fn;
            },
            getElementById: (id) => (id === 'googleAuthForm' ? { addEventListener() {} } : null),
            querySelectorAll: (selector) => (selector === 'form[data-acesso]' ? [form] : [])
        }
    });
    ready();
    return {
        submit: () => submit({ preventDefault() {} }),
        error,
        success,
        help,
        confirmationHelp,
        confirmedNotice,
        timers,
        window,
        storage,
        session
    };
};
