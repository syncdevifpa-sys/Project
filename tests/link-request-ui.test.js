const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('pedido de vínculo contém formulário e controles HTML reais, não texto de tags incompletas', () => {
    const html = fs.readFileSync('front/community-settings.html', 'utf8');
    const form = html.match(/<form\b[^>]*id="teacherRequestForm"[^>]*>([\s\S]*?)<\/form>/);
    assert.ok(form, 'formulário deve existir no DOM');
    for (const name of [
        'nome',
        'email',
        'matricula',
        'nome_usuario',
        'formacao',
        'tipo_solicitado',
        'curso_informado'
    ]) {
        assert.match(form[1], new RegExp('<(?:input|select)\\b[^>]*name="' + name + '"'));
    }
    for (const role of ['docente', 'servidor', 'discente'])
        assert.match(form[1], new RegExp('<option\\b[^>]*value="' + role + '"'));
    assert.match(form[1], /<button\b[^>]*type="submit"/);
});
function fixture() {
    const calls = [],
        nodes = {};
    const make = () => ({
        hidden: false,
        disabled: false,
        events: {},
        value: '',
        dataset: {},
        focus() {},
        addEventListener(key, fn) {
            this.events[key] = fn;
        }
    });
    for (const id of [
        'teacherRequestStatus',
        'teacherRequestSection',
        'startLinkRequest',
        'requestedCourseLabel',
        'requestedRoleTitle',
        'requestedTrainingLabel',
        'teacherRequestState'
    ])
        nodes[id] = make();
    const form = make(),
        button = make();
    form.querySelector = () => button;
    form.elements = {};
    for (const name of [
        'nome',
        'email',
        'matricula',
        'nome_usuario',
        'formacao',
        'tipo_solicitado',
        'curso_informado'
    ])
        form.elements[name] = make();
    nodes.teacherRequestForm = form;
    const A = {
        auth: { getSessao: () => ({ tipo_usuario: 'externo' }) },
        api: {
            expect: (p) => p,
            get: async () => ({
                can_start_change: true,
                can_request: false,
                profile: { nome: 'Pessoa', email: 'pessoa@example.com' },
                request: null
            }),
            post: async (path, body) => {
                calls.push({ path, body });
                return {};
            }
        }
    };
    const started = vm.runInNewContext(
        fs.readFileSync('front/js/teacher-requirements.js', 'utf8'),
        { window: { Arcadia: A }, document: { getElementById: (id) => nodes[id] } }
    );
    return { calls, nodes, form, button, started };
}
test('externo inicia pedido somente pela ação discreta, com campos de Aluno e aviso antes do envio', async () => {
    const f = fixture();
    await f.started;
    assert.equal(f.nodes.startLinkRequest.hidden, false);
    assert.equal(f.nodes.teacherRequestSection.hidden, true);
    f.nodes.startLinkRequest.events.click();
    assert.equal(f.nodes.teacherRequestSection.hidden, false);
    f.form.elements.tipo_solicitado.value = 'discente';
    f.form.elements.tipo_solicitado.events.change();
    assert.equal(f.form.elements.curso_informado.required, true);
    assert.equal(f.form.elements.formacao.required, false);
    f.form.elements.matricula.value = '123';
    f.form.elements.nome_usuario.value = 'pessoa';
    f.form.elements.curso_informado.value = 'Informática 2027.1';
    await f.form.events.submit({ preventDefault() {} });
    assert.equal(f.calls[0].path, '/api/teacher-requirements/mine/change');
    assert.equal(f.calls[0].body.tipo_solicitado, 'discente');
    for (const file of ['front/community-settings.html']) {
        const html = fs.readFileSync(file, 'utf8');
        assert.match(html, /id="requestedRolePicker"/);
        assert.match(html, /id="requestedCourseLabel"/);
        assert.match(html.replace(/\s+/g, ' '), /não desativa sua conta automaticamente/);
    }
    assert.ok(!fs.readFileSync('front/community.html', 'utf8').includes('id="startLinkRequest"'));
    assert.ok(!fs.readFileSync('front/community.html', 'utf8').includes('id="teacherRequestForm"'));
});
