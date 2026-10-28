const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
function fixture() {
    const classes = new Set(),
        document = {
            activeElement: null,
            documentElement: {
                classList: { toggle: (key, on) => (on ? classes.add(key) : classes.delete(key)) }
            }
        };
    class Element {
        constructor(tag) {
            this.tagName = tag.toUpperCase();
            this.children = [];
            this.dataset = {};
            this.attrs = {};
            this.events = {};
            this.style = {};
            this.value = '';
            this.type = '';
            this.disabled = false;
            this.isConnected = true;
            const set = new Set();
            this.classList = { add: (key) => set.add(key), contains: (key) => set.has(key) };
        }
        append(...items) {
            for (const item of items) {
                item.remove();
                item.parent = this;
                this.children.push(item);
            }
        }
        remove() {
            if (this.parent)
                this.parent.children = this.parent.children.filter((child) => child !== this);
            this.parent = null;
        }
        get firstChild() {
            return this.children[0];
        }
        setAttribute(key, value) {
            this.attrs[key] = value;
        }
        hasAttribute(key) {
            return Object.hasOwn(this.attrs, key);
        }
        querySelectorAll(selector) {
            const all = this.children.flatMap((child) => [child, ...child.querySelectorAll('*')]);
            if (selector === '*') return all;
            if (selector.includes('form input'))
                return all.filter(
                    (node) =>
                        ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) &&
                        node.closest('form')
                );
            if (selector === 'input,textarea,select')
                return all.filter((node) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName));
            if (selector === 'form button[type="submit"]')
                return all.filter(
                    (node) =>
                        node.tagName === 'BUTTON' && node.type === 'submit' && node.closest('form')
                );
            if (selector === '[data-dialog-busy="true"]')
                return all.filter((node) => node.dataset.dialogBusy === 'true');
            if (selector === '[role="dialog"]')
                return all.filter((node) => node.attrs.role === 'dialog');
            return all.filter((node) =>
                selector.split(',').some((tag) => node.tagName === tag.toUpperCase())
            );
        }
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        }
        closest(tag) {
            return this.tagName === tag.toUpperCase() ? this : this.parent?.closest(tag) || null;
        }
        contains(node) {
            return node === this || this.children.some((child) => child.contains(node));
        }
        getBoundingClientRect() {
            return { left: 100, top: 100, right: 500, bottom: 500 };
        }
        getClientRects() {
            return this.hidden ? [] : [{}];
        }
        addEventListener(type, fn) {
            (this.events[type] ||= []).push(fn);
        }
        dispatchEvent(event) {
            for (const fn of this.events[event.type] || []) fn(event);
            return !event.defaultPrevented;
        }
        emit(type, values = {}) {
            const event = {
                type,
                target: this,
                button: 0,
                pointerId: 1,
                clientX: 50,
                clientY: 50,
                defaultPrevented: false,
                preventDefault() {
                    this.defaultPrevented = true;
                },
                stopImmediatePropagation() {},
                stopPropagation() {},
                ...values
            };
            this.dispatchEvent(event);
            return event;
        }
        showModal() {
            this.open = true;
            document.activeElement = this.querySelector('button,input');
        }
        close() {
            this.open = false;
            this.emit('close');
        }
        requestClose() {
            const event = this.emit('cancel');
            if (!event.defaultPrevented) this.close();
        }
        focus() {
            document.activeElement = this;
            this.focused = true;
        }
    }
    document.createElement = (tag) => new Element(tag);
    let consent = false,
        confirmations = 0;
    const A = {
        confirmAction: async () => {
            confirmations++;
            return consent;
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/dialog-shell.js', 'utf8'), {
        window: { Arcadia: A },
        document,
        queueMicrotask,
        Event
    });
    const make = () => {
        const dialog = new Element('dialog'),
            title = new Element('h2'),
            form = new Element('form'),
            input = new Element('input'),
            save = new Element('button');
        input.name = 'title';
        input.value = 'original';
        save.type = 'submit';
        form.append(input, save);
        title.textContent = 'Janela longa';
        dialog.append(title, form);
        return { dialog, form, input, save };
    };
    return {
        A,
        make,
        Element,
        document,
        classes,
        setConsent: (value) => (consent = value),
        get confirmations() {
            return confirmations;
        }
    };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
test('moldura separa cabeçalho do corpo rolável e restaura foco sem duplicar listeners', async () => {
    const f = fixture(),
        { dialog } = f.make(),
        trigger = new f.Element('button');
    trigger.focus();
    f.A.dialogShell.open(dialog);
    await settle();
    assert.equal(dialog.children.length, 2);
    assert.equal(dialog.children[0].className, 'ar-dialog-shell-head');
    assert.equal(dialog.children[1].className, 'ar-dialog-shell-body');
    const close = dialog.children[0].children[1];
    assert.equal(close.attrs['aria-label'], 'Fechar janela');
    assert.equal(f.classes.has('ar-dialog-open'), true);
    dialog.emit('click', { target: close });
    assert.equal(dialog.open, false);
    assert.equal(f.document.activeElement, trigger);
    assert.equal(f.classes.size, 0);
    f.A.dialogShell.open(dialog);
    assert.equal(dialog.children.length, 2);
    assert.equal(dialog.events.pointerdown.length, 1);
});
test('só fundo externo fecha: interior, arrasto para fora e popover não fecham', async () => {
    const f = fixture(),
        { dialog, input } = f.make();
    f.A.dialogShell.open(dialog);
    await settle();
    dialog.emit('pointerdown', { target: input, clientX: 200, clientY: 200 });
    dialog.emit('pointerup');
    assert.equal(dialog.open, true);
    dialog.emit('pointerdown', { clientX: 200, clientY: 200 });
    dialog.emit('pointerup', { clientX: 200, clientY: 200 });
    assert.equal(dialog.open, true);
    dialog.emit('pointerdown', { target: new f.Element('div') });
    dialog.emit('pointerup');
    assert.equal(dialog.open, true);
    dialog.emit('pointerdown');
    dialog.emit('pointerup');
    assert.equal(dialog.open, false);
});
test('Escape, X e backdrop respeitam dados alterados e gravação em andamento', async () => {
    const f = fixture(),
        { dialog, input, save } = f.make();
    f.A.dialogShell.open(dialog);
    await settle();
    input.value = 'alterado';
    dialog.emit('input', { target: input });
    dialog.emit('cancel');
    await settle();
    assert.equal(dialog.open, true);
    assert.equal(f.confirmations, 1);
    f.setConsent(true);
    dialog.emit('submit');
    save.disabled = true;
    dialog.emit('cancel');
    await settle();
    assert.equal(dialog.open, true);
    assert.equal(f.confirmations, 1);
    save.disabled = false;
    dialog.emit('pointerdown');
    dialog.emit('pointerup');
    await settle();
    assert.equal(dialog.open, false);
    assert.equal(f.confirmations, 2);
});
test('apenas janela superior fecha e a rolagem continua bloqueada até fechar a última', async () => {
    const f = fixture(),
        first = f.make(),
        second = f.make();
    f.A.dialogShell.open(first.dialog);
    f.A.dialogShell.open(second.dialog);
    await settle();
    first.dialog.emit('pointerdown');
    first.dialog.emit('pointerup');
    assert.equal(first.dialog.open, true);
    second.dialog.emit('cancel');
    assert.equal(second.dialog.open, false);
    assert.equal(f.classes.has('ar-dialog-open'), true);
    first.dialog.emit('cancel');
    assert.equal(first.dialog.open, false);
    assert.equal(f.classes.size, 0);
});
test('CSS mantém controle no cabeçalho e limita conteúdo à viewport móvel', () => {
    const css = fs.readFileSync('front/dialog-shell.css', 'utf8');
    assert.match(css, /100dvh/);
    assert.match(css, /\.ar-dialog-shell-body[^}]*overflow: auto/s);
    assert.match(css, /\.ar-dialog-shell-head[^}]*flex: 0 0 auto/s);
    assert.doesNotMatch(css, /position:\s*fixed/);
});
test('overlay existente mantém foco, Escape e bloqueio de rolagem no empilhamento', async () => {
    const f = fixture(),
        parent = f.make();
    f.A.dialogShell.open(parent.dialog);
    const overlay = new f.Element('div'),
        content = new f.Element('div'),
        first = new f.Element('button'),
        last = new f.Element('button');
    content.setAttribute('role', 'dialog');
    content.append(first, last);
    overlay.append(content);
    f.A.dialogShell.openOverlay(overlay);
    await settle();
    assert.equal(overlay.style.display, 'grid');
    last.focus();
    overlay.emit('keydown', { key: 'Tab' });
    assert.equal(f.document.activeElement, first);
    overlay.emit('keydown', { key: 'Escape' });
    assert.equal(overlay.style.display, 'none');
    assert.equal(parent.dialog.open, true);
    assert.equal(f.classes.has('ar-dialog-open'), true);
    parent.dialog.close();
    assert.equal(f.classes.size, 0);
});
