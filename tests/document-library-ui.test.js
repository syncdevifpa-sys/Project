const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('erro de envio mantém descrição e PDF; contador e limite impedem excesso antes da API', async () => {
    class Node {
        constructor(tag = 'div') {
            this.tagName = tag;
            this.children = [];
            this.events = {};
            this.attrs = {};
            this.value = '';
            this.dataset = {};
            this.classList = { add() {}, toggle() {} };
        }
        append(...nodes) {
            this.children.push(...nodes);
        }
        replaceChildren(...nodes) {
            this.children = nodes;
        }
        setAttribute(key, value) {
            this.attrs[key] = value;
        }
        addEventListener(key, fn) {
            this.events[key] = fn;
        }
        focus() {}
        showModal() {
            this.open = true;
        }
        close() {
            this.open = false;
        }
        remove() {}
        querySelector(selector) {
            return this.all().find((n) =>
                selector.split(',').some((s) => {
                    s = s.trim();
                    if (s.startsWith('.')) return n.className === s.slice(1);
                    if (s === 'option[value="publico"]')
                        return n.tagName === 'option' && n.value === 'publico';
                    return n.tagName === s;
                })
            );
        }
        all() {
            return this.children.flatMap((n) => [n, ...n.all()]);
        }
    }
    const body = new Node('body'),
        trigger = new Node('button'),
        status = new Node();
    const nodes = new Map();
    const root = new Node();
    root.querySelector = (selector) => {
        if (selector === '[data-library-status]') return status;
        if (!nodes.has(selector)) nodes.set(selector, new Node());
        return nodes.get(selector);
    };
    root.querySelectorAll = () => [];
    const library = { folders: [], items: [], saved: [], used: 0, limits: { description: 3000 } };
    let payload;
    const A = {
        auth: { estaLogado: () => true, getSessao: () => ({ tipo_usuario: 'discente' }) },
        api: {
            get: async (path) => (path.endsWith('/public') ? [] : library),
            expect: (promise) => promise,
            request: async (path, options) => {
                payload = { path, options };
                throw Error('Falha de teste: tente novamente.');
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/document-library.js', 'utf8'), {
        window: { Arcadia: A },
        URLSearchParams,
        document: {
            body,
            activeElement: null,
            getElementById: (id) => (id === 'documentLibrary' ? root : null),
            querySelectorAll: (selector) =>
                selector === '[data-library-document]' ? [trigger] : [],
            createElement: (tag) => new Node(tag),
            createElementNS: (_, tag) => new Node(tag)
        }
    });
    await new Promise((resolve) => setImmediate(resolve));
    trigger.events.click();
    const dialog = body.children.at(-1),
        form = dialog.querySelector('form');
    const description = dialog.querySelector('textarea');
    assert.equal(description.maxLength, 3000);
    assert.equal(description.attrs['aria-describedby'], 'libraryDescriptionHelp');
    description.value = 'Ação e 😀.\n\nSegundo parágrafo.';
    description.events.input();
    const help = dialog.all().find((n) => n.id === 'libraryDescriptionHelp');
    assert.match(help.textContent, new RegExp('^' + description.value.length + '/3000'));
    const fileInput = dialog.all().find((n) => n.type === 'file');
    const file = { name: 'resumo.pdf', size: 1234 };
    fileInput.files = [file];
    fileInput.events.change();
    await form.events.submit({ preventDefault() {} });
    assert.equal(dialog.open, true);
    assert.equal(fileInput.files[0], file);
    assert.equal(payload.options.body, file);
    assert.equal(
        new URLSearchParams(payload.path.split('?')[1]).get('descricao'),
        description.value
    );
    assert.match(dialog.querySelector('.ar-library-feedback').textContent, /Falha de teste/);
    assert.equal(dialog.all().find((n) => n.type === 'submit').disabled, false);
    description.value = 'á'.repeat(3001);
    payload = null;
    await form.events.submit({ preventDefault() {} });
    assert.equal(payload, null);
    assert.equal(description.value.length, 3001);
    assert.match(
        dialog.querySelector('.ar-library-feedback').textContent,
        /Use até 3000 caracteres/
    );
});
