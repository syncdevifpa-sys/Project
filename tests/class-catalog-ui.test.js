const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
class Element {
    constructor(tag) {
        this.tag = tag;
        this.children = [];
        this.value = '';
        this.events = {};
    }
    append(...items) {
        for (const item of items) {
            item.parent = this;
            this.children.push(item);
        }
    }
    replaceChildren(...items) {
        this.children = [];
        this.append(...items);
    }
    setAttribute() {}
    addEventListener(type, fn) {
        this.events[type] = fn;
    }
    setCustomValidity(value) {
        this.error = value;
    }
    checkValidity() {
        return !this.error;
    }
    reportValidity() {
        this.reported = true;
    }
    focus() {
        this.focused = true;
    }
}
const all = (node) => [node, ...node.children.flatMap(all)];
function fixture({ canCreate = true, error = null } = {}) {
    const A = {},
        fields = new Element('div'),
        requests = [],
        items = [{ id_catalogo: 5, nome: 'Física' }];
    const e = {
        fields,
        save: new Element('button'),
        field: (label, { type = 'text', required = false } = {}) => {
            const wrap = new Element('label'),
                input = new Element('input');
            wrap.text = label;
            input.type = type;
            input.required = required;
            wrap.append(input);
            fields.append(wrap);
            return input;
        },
        select: (label) => {
            const wrap = new Element('label'),
                input = new Element('select');
            wrap.text = label;
            wrap.append(input);
            fields.append(wrap);
            return input;
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/class-catalog.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: (tag) => new Element(tag) }
    });
    const result = A.classCatalog.mount(e, {
        items,
        canCreate,
        call: async (path, method, body) => {
            requests.push({ path, method, body });
            if (method === 'POST') {
                if (error) throw error;
                return { id_catalogo: 6, nome: body.nome.trim() };
            }
            return items;
        }
    });
    return {
        e,
        result,
        requests,
        fields,
        items,
        input: () =>
            all(fields).find(
                (node) => node.tag === 'input' && node.type === 'text' && node !== result.title
            ),
        save: () => all(fields).find((node) => node.tag === 'button')
    };
}
test('catálogo busca item existente, sugere título e mantém override da turma', () => {
    const f = fixture();
    f.result.picker.value = '5';
    f.result.picker.onchange();
    assert.equal(f.result.title.value, 'Física');
    assert.equal(f.result.title.required, false);
    f.result.title.value = 'Física aplicada';
    f.result.picker.onchange();
    assert.equal(f.result.title.value, 'Física aplicada');
    all(f.fields).find((node) => node.type === 'search').value = 'FISICA';
    all(f.fields)
        .find((node) => node.type === 'search')
        .oninput();
    assert.equal(f.result.picker.value, '5');
    assert.equal(f.requests.length, 0);
    assert.equal(f.result.picker.required, true);
});
test('novo item é selecionado sem fechar oferta, repetir cadastro ou apagar outros campos', async () => {
    const f = fixture(),
        semester = f.e.field('Semestre');
    semester.value = '2026.2';
    f.input().value = ' Artes ';
    const pending = f.save().onclick();
    assert.equal(f.e.save.disabled, true);
    await pending;
    assert.equal(f.result.picker.value, '6');
    assert.equal(f.result.title.value, 'Artes');
    assert.equal(semester.value, '2026.2');
    assert.equal(f.e.save.disabled, false);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].body.nome, ' Artes ');
});
test('duplicidade seleciona existente e falhas preservam nome e dados; ação depende da permissão', async () => {
    const duplicate = fixture({ error: Object.assign(new Error('Já existe'), { status: 409 }) });
    duplicate.input().value = 'fisica';
    await duplicate.save().onclick();
    assert.equal(duplicate.result.picker.value, '5');
    const failure = fixture({ error: new Error('Banco pendente') });
    failure.input().value = 'Artes';
    await failure.save().onclick();
    assert.equal(failure.input().value, 'Artes');
    assert.equal(failure.result.picker.value, '');
    assert.equal(failure.save().disabled, false);
    const empty = fixture();
    await empty.save().onclick();
    assert.equal(empty.requests.length, 0);
    assert.equal(empty.input().reported, true);
    assert.equal(fixture({ canCreate: false }).save(), undefined);
});
test('formulário carrega helper antes de classes e não simula catálogo vazio em migração pendente', () => {
    const html = fs.readFileSync('front/classes.html', 'utf8'),
        source = fs.readFileSync('front/js/classes.js', 'utf8');
    assert.ok(html.indexOf('js/class-catalog.js') < html.indexOf('js/classes.js'));
    assert.match(source, /if\s*\(\s*!features\.available\s*\)\s*throw new Error/);
    const editor = source.slice(
        source.indexOf('async function subjectEditor()'),
        source.indexOf('function periodEditor()')
    );
    assert.ok(!editor.includes('features.available'));
});
