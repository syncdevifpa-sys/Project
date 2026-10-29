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
    const views = ['board', 'table', 'list'].map((mode) => {
        const node = new Node('button');
        node.dataset.libraryView = mode;
        return node;
    });
    root.querySelectorAll = (selector) => (selector === '[data-library-view]' ? views : []);
    const library = {
        folders: [],
        items: [],
        saved: [],
        used: 0,
        limits: { description: 3000 },
        canSetAuthorship: true
    };
    let payload;
    let previewRequest,
        resolvePreview,
        objectUrls = 0;
    class BrowserURL extends URL {
        static createObjectURL() {
            objectUrls++;
            return 'blob:test';
        }
        static revokeObjectURL() {}
    }
    const A = {
        token: { get: () => 'token-de-teste' },
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
        FormData: class {
            constructor() {
                this.fields = new Map();
            }
            append(key, value) {
                this.fields.set(key, value);
            }
            get(key) {
                return this.fields.get(key);
            }
        },
        URL: BrowserURL,
        AbortController,
        fetch: (url, options) =>
            new Promise((resolve) => {
                previewRequest = { url, options };
                resolvePreview = resolve;
            }),
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
    const authorInput = dialog.all().find((n) => n.maxLength === 500);
    assert.equal(authorInput.required, false);
    authorInput.value = 'Autora declarada 😀';
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
    assert.equal(payload.options.body.get('arquivo'), file);
    assert.equal(payload.options.body.get('descricao'), description.value);
    assert.equal(payload.options.body.get('autor_obra'), authorInput.value);
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
    library.items.push({
        autor_obra: 'Autoria <declarada>',
        id_item: 3,
        tipo: 'arquivo',
        titulo: 'Documento',
        nome_arquivo: 'aula.pdf',
        tamanho: 1234,
        visibilidade: 'privado',
        id_pasta: null
    });
    const items = nodes.get('[data-library-items]');
    views[0].events.click();
    assert.equal(items.dataset.view, 'board');
    assert.ok(items.querySelector('.ar-library-cover'));
    assert.equal(
        items.querySelector('.ar-library-authors').textContent,
        'Autor(es): Autoria <declarada>'
    );
    const cover = items.querySelector('.ar-library-cover');
    cover
        .all()
        .find((n) => n.textContent === 'Carregar prévia')
        .events.click();
    assert.match(previewRequest.url, /items\/3\/preview$/);
    assert.equal(previewRequest.options.headers.Authorization, 'Bearer token-de-teste');
    views[1].events.click();
    assert.equal(items.dataset.view, 'table');
    assert.equal(previewRequest.options.signal.aborted, true);
    resolvePreview({
        ok: true,
        headers: { get: () => 'image/png' },
        blob: async () => ({ size: 4 })
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(objectUrls, 0, 'resposta atrasada não cria miniatura depois de trocar o modo');
    assert.ok(items.querySelector('table'));
    assert.equal(items.all().filter((n) => n.tagName === 'td').length, 3);
    views[2].events.click();
    assert.equal(items.dataset.view, 'list');
    assert.ok(items.querySelector('article'));
    assert.equal(items.querySelector('.ar-library-cover'), undefined);
});
