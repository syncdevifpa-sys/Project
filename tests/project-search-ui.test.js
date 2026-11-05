const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
    const nodes = [];
    const node = (tag = 'div') => {
        const n = {
            tagName: tag.toUpperCase(),
            value: '',
            children: [],
            events: {},
            style: {},
            dataset: {},
            append(...children) {
                this.children.push(...children);
            },
            after(child) {
                this.following = child;
            },
            addEventListener(name, fn) {
                this.events[name] = fn;
            },
            removeEventListener(name) {
                delete this.events[name];
            },
            setAttribute(name, value) {
                this[name] = value;
            }
        };
        nodes.push(n);
        return n;
    };
    const grid = node(),
        search = node('input'),
        status = node(),
        chipbar = node(),
        create = node('button');
    const chips = ['All', 'Research', 'Extension'].map((key) => {
        const chip = node('button');
        chip.dataset.filterKey = key;
        const count = node();
        chip.querySelector = () => count;
        return chip;
    });
    const ids = {
        '#gridProjetos': grid,
        '#filterProjectText': search,
        '#projectSearchStatus': status,
        '#chipbarProjetos': chipbar,
        '#btnNovoProjeto': create
    };
    let boot, visible;
    const rows = [
        {
            id_projeto: 1,
            titulo: 'Pesquisa de robótica',
            descricao: 'Atividade acadêmica',
            responsavel_nome: 'Ana Silva',
            eixo: 'pesquisa',
            situacao: 'ativo'
        },
        {
            id_projeto: 2,
            titulo: 'Extensão comunitária',
            descricao: 'Oficina de arte',
            responsavel_nome: 'João Costa',
            eixo: 'extensao',
            situacao: 'encerrado'
        }
    ];
    const A = {
        auth: { getSessao: () => ({ tipo_usuario: 'externo' }) },
        contentFields: require('../frontend/js/content-fields'),
        contentEditor: { canEdit: () => false },
        contentViews: {
            update: (_, result) => {
                visible = result;
            }
        },
        api: { get: async (path) => (path === '/api/projects' ? rows : []), expect: (p) => p },
        showToast: (message) => assert.fail(message)
    };
    const document = {
        readyState: 'loading',
        createElement: node,
        querySelector: (selector) => ids[selector] || null,
        querySelectorAll: (selector) => (selector === '#chipbarProjetos .ar-chip' ? chips : []),
        addEventListener: (_, fn) => {
            boot = fn;
        }
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/pages.js', 'utf8'), {
        window: { Arcadia: A },
        document,
        location: { pathname: '/projects.html' }
    });
    boot();
    return {
        A,
        search,
        status,
        chips,
        nodes,
        get visible() {
            return visible;
        }
    };
}

test('busca de Projetos combina texto sem acentos, responsável, eixo e situação', async () => {
    const f = fixture();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.visible.length, 2);
    f.search.value = 'joao ARTE';
    f.search.events.input();
    assert.equal(f.visible.length, 1);
    assert.equal(f.visible[0].id_projeto, 2);
    assert.equal(f.status.textContent, '1 de 2 projetos');
    f.chips[1].events.click();
    assert.equal(f.visible.length, 0);
    f.chips[0].events.click();
    assert.equal(f.visible.length, 1);
    const situation = f.nodes.find((n) => n.tagName === 'SELECT');
    situation.value = 'ativo';
    situation.events.change();
    assert.equal(f.visible.length, 0);
    situation.value = '';
    f.search.value = 'robotica';
    f.search.events.input();
    assert.equal(f.visible[0].id_projeto, 1);
    f.A.pages.dispose();
    assert.equal(f.search.events.input, undefined);
});
