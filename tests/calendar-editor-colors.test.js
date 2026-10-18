const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('formulário manual atualiza amostra e borda ao trocar categoria e usa a cor personalizada', () => {
    const nodes = [];
    function make(tag) {
        const node = {
            tag,
            children: [],
            style: {},
            events: {},
            value: '',
            append(...children) {
                for (const child of children) {
                    child.parentElement = this;
                    this.children.push(child);
                }
            },
            after(child) {
                child.parentElement = this.parentElement;
                this.parentElement.children.push(child);
            },
            setAttribute() {},
            addEventListener(name, fn) {
                this.events[name] = fn;
            },
            focus() {},
            showModal() {},
            close() {},
            remove() {}
        };
        nodes.push(node);
        return node;
    }
    const A = {
        calendarCategories: require('../front/js/calendar-categories'),
        auth: { getSessao: () => ({ id_usuario: 1, tipo_usuario: 'docente' }) },
        noticeActions: { canDelete: () => true },
        contentFields: require('../front/js/content-fields'),
        calendarColors: {
            read: () => ({ evento: '#123456', registro_academico: '#aabbcc' }),
            labels: { evento: 'Eventos', registro_academico: 'Registros acadêmicos' }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/notice-editor.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: make, body: make('body') }
    });
    A.contentEditor.open('calendar', null, () => {});
    const select = nodes.find((node) => node.name === 'categoria');
    const swatch = nodes.find((node) => node.className === 'ar-color-swatch');
    assert.equal(swatch.style.backgroundColor, '#123456');
    select.value = 'registro_academico';
    select.events.change();
    assert.equal(swatch.style.backgroundColor, '#aabbcc');
    assert.equal(select.style.borderInlineStart, '6px solid #aabbcc');
    assert.equal(swatch.parentElement.children[1].textContent, 'Registros acadêmicos');
    assert.equal(A.contentEditor.canEdit('calendar', { automatico: true }), false);
});

test('editar um evento antigo preserva o tipo específico se o grupo não foi alterado', async () => {
    const nodes = [],
        writes = [];
    const make = (tag) => {
        const node = {
            tag,
            children: [],
            style: {},
            events: {},
            value: '',
            append(...items) {
                for (const item of items) {
                    item.parentElement = this;
                    this.children.push(item);
                }
            },
            after(item) {
                this.parentElement.append(item);
            },
            setAttribute() {},
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            focus() {},
            showModal() {},
            close() {},
            remove() {}
        };
        nodes.push(node);
        return node;
    };
    const A = {
        calendarCategories: require('../front/js/calendar-categories'),
        contentFields: require('../front/js/content-fields'),
        auth: { getSessao: () => ({ id_usuario: 4, tipo_usuario: 'servidor' }) },
        noticeActions: { canDelete: () => true },
        api: {
            patch: async (path, body) => {
                writes.push({ path, body });
                return {};
            },
            expect: (p) => p
        },
        showToast() {}
    };
    vm.runInNewContext(fs.readFileSync('front/js/notice-editor.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: make, body: make('body') }
    });
    const event = {
        id_evento: 9,
        id_usuario: 4,
        titulo: 'Recesso',
        categoria: 'recesso',
        data_evento: '2026-10-20'
    };
    A.contentEditor.open('calendar', event, async () => {});
    const category = nodes.find((n) => n.name === 'categoria');
    assert.equal(category.children.length, 8);
    assert.equal(category.value, 'ferias');
    nodes.find((n) => n.name === 'titulo').value = 'Recesso revisado';
    await nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    assert.equal(writes[0].path, '/api/content/calendar/9');
    assert.equal(writes[0].body.categoria, 'recesso');
    assert.equal(writes[0].body.titulo, 'Recesso revisado');
    category.value = 'avaliacao';
    await nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    assert.equal(writes[1].body.categoria, 'avaliacao');
    assert.equal(event.categoria, 'recesso');
});
