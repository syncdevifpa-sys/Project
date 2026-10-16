const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture({
    external = false,
    available = true,
    failure = false,
    loadFailure = false
} = {}) {
    const nodes = [],
        calls = [];
    function make(tag) {
        const node = {
            tag,
            children: [],
            events: {},
            value: '',
            checked: false,
            disabled: false,
            append(...children) {
                this.children.push(...children);
            },
            replaceChildren(...children) {
                this.children = children;
            },
            setAttribute(key, value) {
                this[key] = value;
            },
            addEventListener(key, fn) {
                this.events[key] = fn;
            }
        };
        nodes.push(node);
        return node;
    }
    const root = make('section');
    const initial = {
        disponivel: available,
        contato_email: 'contact@test.test',
        mostrar_email: false,
        mostrar_foto: false
    };
    const A = {
        auth: {
            getSessao: () => ({ logado: true, tipo_usuario: external ? 'externo' : 'discente' })
        },
        token: { get: () => 'test' },
        api: {
            expect: (value) => value,
            get: async (path) => {
                calls.push({ path });
                if (loadFailure) throw Error('Falha ao carregar');
                return initial;
            },
            put: async (path, body) => {
                calls.push({ path, body });
                if (failure) throw Error('Falha ao salvar');
                return body;
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/profile-sharing.js', 'utf8'), {
        window: { Arcadia: A },
        document: { readyState: 'complete', getElementById: () => root, createElement: make }
    });
    return {
        nodes,
        calls,
        root,
        find: (text) =>
            nodes.find((node) => node.tag === 'label' && node.textContent === text)?.children[0]
    };
}
test('compartilhamento carrega privado, salva escolha explícita e erro mantém conteúdo/flags', async () => {
    for (const failure of [false, true]) {
        const f = fixture({ failure });
        await new Promise((resolve) => setImmediate(resolve));
        const email = f.find('E-mail de contato (opcional)');
        assert.equal(email.value, 'contact@test.test');
        const checks = f.nodes.filter((node) => node.type === 'checkbox');
        assert.ok(checks.every((node) => node.checked === false));
        email.value = 'new@test.test';
        checks[0].checked = true;
        await f.nodes.find((node) => node.tag === 'form').events.submit({ preventDefault() {} });
        assert.equal(f.calls[1].body.mostrar_email, true);
        assert.equal(f.calls[1].body.contato_email, 'new@test.test');
        assert.equal(f.calls[1].path, '/api/auth/compartilhamento');
        assert.equal(Object.hasOwn(f.calls[1].body, 'email'), false);
        assert.equal(email.value, 'new@test.test');
        assert.equal(checks[0].checked, true);
        assert.equal(f.nodes.find((node) => node.tag === 'fieldset').disabled, false);
        if (failure) assert.ok(f.nodes.some((node) => node.textContent === 'Falha ao salvar'));
    }
});
test('banco sem migração não permite publicar; externo usa endpoint próprio sem adicionar conta ao diretório', async () => {
    const legacy = fixture({ available: false });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(legacy.nodes.find((node) => node.tag === 'fieldset').disabled, false);
    assert.equal(legacy.nodes.find((node) => node.type === 'submit').disabled, true);
    legacy.find('E-mail de contato (opcional)').value = 'draft@test.test';
    assert.equal(legacy.nodes.find((node) => node.tag === 'form').events.submit, undefined);
    assert.equal(legacy.calls.length, 1);
    const external = fixture({ external: true });
    await new Promise((resolve) => setImmediate(resolve));
    await external.nodes.find((node) => node.tag === 'form').events.submit({ preventDefault() {} });
    assert.equal(external.calls[1].path, '/api/external/compartilhamento');
    assert.ok(
        external.nodes.some((node) => node.textContent?.includes('não adicionam sua conta à lista'))
    );
});
test('falha ao carregar permite digitar, mas impede sobrescrever preferências desconhecidas', async () => {
    const f = fixture({ loadFailure: true });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.nodes.find((node) => node.tag === 'fieldset').disabled, false);
    assert.equal(f.nodes.find((node) => node.type === 'submit').disabled, true);
    await f.nodes.find((node) => node.tag === 'form').events.submit({ preventDefault() {} });
    assert.equal(f.calls.length, 1);
    assert.ok(f.nodes.some((node) => node.textContent?.includes('Falha ao carregar')));
});

test('card usa contatos autorizados como texto e links seguros, sem buscar foto ausente', () => {
    const nodes = [];
    function make(tag) {
        const node = {
            tag,
            children: [],
            append(...children) {
                this.children.push(...children);
            },
            replaceChildren(...children) {
                this.children = children;
            },
            setAttribute(key, value) {
                this[key] = value;
            },
            addEventListener() {},
            get childNodes() {
                return this.children;
            }
        };
        nodes.push(node);
        return node;
    }
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/people-cards.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: make }
    });
    A.personCard(
        {
            nome: 'Ana Silva',
            contato_email: 'public@test.test',
            contato_handle: '<img src=x onerror=alert(1)>',
            contato_telefone: '+5591999999999'
        },
        'Aluno'
    );
    assert.equal(nodes.filter((node) => node.tag === 'img').length, 0);
    assert.ok(nodes.some((node) => node.textContent === 'AS'));
    assert.ok(
        nodes.some(
            (node) => node.tag === 'span' && node.textContent === '<img src=x onerror=alert(1)>'
        )
    );
    assert.deepEqual(
        nodes.filter((node) => node.tag === 'a').map((node) => node.href),
        ['mailto:public%40test.test', 'tel:+5591999999999']
    );
    const start = nodes.length;
    A.personCard({ nome: 'Outra Pessoa' }, 'Aluno');
    assert.equal(
        nodes.slice(start).filter((node) => node.tag === 'a' || node.tag === 'img').length,
        0
    );
    assert.ok(
        nodes.slice(start).some((node) => node.textContent === 'Nenhum contato compartilhado.')
    );
});
