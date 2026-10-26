const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function registration() {
    const input = { value: 'Student' },
        wrapper = { style: {} },
        course = {},
        help = {},
        submit = {},
        teacherInputs = ['teacherMatricula','teacherUsername','teacherFormacao','studentCourseInfo'].map(id=>({id,wrapper:{hidden:false},closest(){return this.wrapper;}})),
        teacherFields = { hidden: true, querySelectorAll: () => teacherInputs };
    const buttons = ['Student', 'Professor', 'Staff', 'External'].map((value, index) => {
        const attributes = {
            'data-vinculo': value,
            'aria-checked': index === 0 ? 'true' : 'false'
        };
        const handlers = {},
            classes = new Set(index === 0 ? ['is-active'] : []);
        return {
            attributes,
            handlers,
            classList: {
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name))
            },
            getAttribute: (key) => attributes[key],
            setAttribute: (key, value) => {
                attributes[key] = value;
            },
            addEventListener: (key, handler) => {
                handlers[key] = handler;
            },
            click() {
                handlers.click({ preventDefault() {} });
            },
            focus() {
                this.focused = true;
            }
        };
    });
    let ready;
    const context = {
        window: {
            Arcadia: { api: { get: async () => [], expect: (promise) => promise }, token: {} },
            addEventListener() {}
        },
        localStorage: { getItem: () => null },
        document: {
            readyState: 'loading',
            addEventListener: (_, callback) => {
                ready = callback;
            },
            getElementById: (id) =>
                ({
                    vinculoInput: input,
                    campoCursoWrapper: wrapper,
                    curso: course,
                    registrationRoleHelp: help,
                    signupSubmit: submit,
                    teacherSignupFields: teacherFields
                })[id] || null,
            querySelector: () => null,
            querySelectorAll: (selector) => (selector === '.ar-role-btn' ? buttons : [])
        }
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(__dirname, '../front/js/auth.js'), 'utf8'),
        context
    );
    ready();
    return { buttons, input, wrapper, course, help, submit, teacherFields, teacherInputs };
}

test('clique seleciona professor/servidor e volta para aluno sem conceder cadastro privilegiado', () => {
    const r = registration();
    assert.equal(r.course.required, false);
    assert.equal(r.teacherFields.hidden, false);
    assert.equal(r.teacherInputs.find(input=>input.id==='studentCourseInfo').required,true);
    assert.equal(r.submit.disabled, false);
    for (const index of [1, 2]) {
        r.course.value = '7';
        r.buttons[index].click();
        assert.equal(r.input.value, index === 1 ? 'Professor' : 'Staff');
        assert.equal(r.buttons[index].attributes['aria-checked'], 'true');
        assert.equal(r.buttons[0].attributes['aria-checked'], 'false');
        assert.equal(r.wrapper.style.display, 'none');
        assert.equal(r.course.required, false);
        assert.equal(r.course.value, '');
        assert.equal(r.course.disabled, true);
        assert.equal(r.submit.disabled, false);
        assert.equal(r.teacherFields.hidden, false);
        assert.ok(
            r.teacherInputs.every(
                (input) => input.id==='studentCourseInfo' ? input.disabled : input.required === !(index === 2 && input.id === 'teacherFormacao') && input.disabled === false
            )
        );
        assert.match(
            r.help.textContent,
            index === 1 ? /Requisitos|Comunidade externa/ : /Formação é opcional/
        );
    }
    r.buttons[0].click();
    assert.equal(r.input.value, 'Student');
    assert.equal(r.wrapper.style.display, 'none');
    assert.equal(r.course.required, false);
    assert.match(r.help.textContent,/aprovação em Requisitos/);
    assert.equal(r.submit.disabled, false);
    r.buttons[3].click();
    assert.equal(r.input.value, 'External');
    assert.equal(r.course.required, false);
    assert.equal(r.submit.disabled, false);
    assert.match(r.help.textContent, /Comunidade externa/);
});

test('setas e extremos do teclado selecionam e movem foco no grupo de vínculos', () => {
    const r = registration();
    r.buttons[0].handlers.keydown({ key: 'ArrowRight', preventDefault() {} });
    assert.equal(r.input.value, 'Professor');
    assert.equal(r.buttons[1].focused, true);
    assert.equal(r.buttons[1].tabIndex, 0);
    r.buttons[1].handlers.keydown({ key: 'End', preventDefault() {} });
    assert.equal(r.input.value, 'External');
    r.buttons[3].handlers.keydown({ key: 'Home', preventDefault() {} });
    assert.equal(r.input.value, 'Student');
});

test('cadastro de todos os vínculos usa conta externa até aprovação, incluindo Aluno', async () => {
    for (const [value, route, role] of [
        ['External', '/api/external/register', 'externo'],
        ['Student', '/api/external/register', 'discente'],
        ['Professor', '/api/external/register', 'docente'],
        ['Staff', '/api/external/register', 'servidor']
    ]) {
        const fields = {
            '#nome, #name': { value: 'Pessoa de teste' },
            '#email': { value: 'pessoa@gmail.com' },
            '#senha, #password': { value: 'senha-de-teste' },
            '#telefone, #phone': { value: '' },
            '#vinculoInput, #affiliationInput': { value },
            '#curso': { value: '1' },
            '#teacherMatricula': { value: '12345' },
            '#teacherUsername': { value: 'professor.teste' },
            '#teacherFormacao': { value: 'Licenciatura' }
            ,'#studentCourseInfo': {value:'Informática · 1º semestre'}
        };
        let submit, request;
        const form = {
            getAttribute: () => 'cadastro',
            querySelector: (selector) => fields[selector] || null,
            addEventListener: (_, callback) => {
                submit = callback;
            }
        };
        let ready;
        const context = {
            window: {
                Arcadia: {
                    api: {
                        post: async (path, body) => {
                            request = { path, body };
                            return {
                                ok: true,
                                status: 201,
                                data: {
                                    externalId: 10,
                                    verificationRequired: true,
                                    verificationSent: true
                                }
                            };
                        }
                    },
                    token: {}
                },
                addEventListener() {}
            },
            localStorage: { getItem: () => null },
            setTimeout() {},
            alert() {},
            document: {
                readyState: 'loading',
                addEventListener: (_, callback) => {
                    ready = callback;
                },
                getElementById: () => null,
                querySelectorAll: (selector) => (selector === 'form[data-acesso]' ? [form] : [])
            }
        };
        vm.runInNewContext(
            fs.readFileSync(path.join(__dirname, '../front/js/auth.js'), 'utf8'),
            context
        );
        ready();
        await submit({ preventDefault() {} });
        assert.equal(request.path, route);
        assert.equal(request.body.tipo_usuario, role);
        assert.equal(request.body.id_curso, role === 'discente' ? 1 : null);
        if (role === 'docente') {
            assert.equal(request.body.matricula, '12345');
            assert.equal(request.body.nome_usuario, 'professor.teste');
            assert.equal(request.body.formacao, 'Licenciatura');
        }
    }
});
