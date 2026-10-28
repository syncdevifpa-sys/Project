const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
class Element {
    constructor(tag) {
        this.tag = tag;
        this.children = [];
        this.value = '';
        this.events = {};
        this.attributes = {};
        this.dataset = {};
    }
    append(...items) {
        for (const item of items) {
            item.parentElement = this;
            this.children.push(item);
            if (this.tag === 'select' && this.children.length === 1) this.value = item.value;
        }
    }
    replaceChildren(...items) {
        this.children = [];
        this.append(...items);
    }
    set textContent(v) {
        this.text = v;
        this.children = [];
    }
    get textContent() {
        return (this.text || '') + this.children.map((c) => c.textContent).join(' ');
    }
    setAttribute(k, v) {
        this.attributes[k] = v;
    }
    addEventListener(k, fn) {
        this.events[k] = fn;
    }
    get isConnected() {
        return this.tag === 'body' || !!this.parentElement?.isConnected;
    }
    focus() {
        this.focused = true;
    }
    showModal() {
        this.open = true;
    }
    close() {
        this.open = false;
        this.events.close?.();
    }
    remove() {
        if (this.parentElement)
            this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
    }
    querySelector(selector) {
        return (
            all(this)
                .slice(1)
                .find((n) => selector.split(',').includes(n.tag)) || null
        );
    }
    checkValidity() {
        return all(this).every((n) => !n.required || n.value);
    }
    reportValidity() {}
}
const all = (node) => [node, ...node.children.flatMap(all)],
    settle = () => new Promise((resolve) => setImmediate(resolve));
function fixture(role = 'servidor', admin = true) {
    const body = new Element('body'),
        ids = new Map(),
        requests = [];
    for (const name of [
        'adminGeneralPanel',
        'adminRequirementsPanel',
        'adminAcademicPanel',
        'adminGeneralTab',
        'adminRequirementsTab',
        'adminAcademicTab',
        'academicAccess'
    ]) {
        const n = new Element('div');
        ids.set(name, n);
        body.append(n);
    }
    const cohort = {
        id_turma: 10,
        nome: 'Turma A',
        curso: 'Técnico',
        campus: 'Belém',
        arquivada_em: '2026-10-26T15:00:00Z'
    };
    const pending = [];
    const A = {
        auth: {
            estaLogado: () => true,
            getSessao: () => ({ id_usuario: 1, tipo_usuario: role, is_admin: admin })
        },
        api: {
            expect: (p) => p,
            request: async (path, options) => {
                requests.push({ path, ...options });
                if (path.endsWith('/features'))
                    return {
                        available: true,
                        canAdmin: admin,
                        canRequest: role === 'discente',
                        canReview: false
                    };
                if (path.endsWith('/memberships'))
                    return { memberships: [], requests: [...pending] };
                if (path.includes('/cohorts?'))
                    return [
                        {
                            id_turma: 10,
                            nome: 'Turma A',
                            curso: 'Técnico',
                            ano_ingresso: 2024,
                            turno: 'tarde',
                            campus: 'Belém'
                        }
                    ];
                if (path.endsWith('/requests') && options.method === 'POST') {
                    pending.push({
                        id_pedido: 20,
                        turma: 'Turma A',
                        curso: 'Técnico',
                        estado: 'pendente'
                    });
                    return { message: 'Pedido enviado.' };
                }
                if (path.includes('/management?')) return { cohorts: [cohort], offers: [] };
                if (path.includes('/restore/')) {
                    cohort.arquivada_em = null;
                    return { message: 'Turma restaurada.' };
                }
                if (path.includes('/records/')) throw new Error('Há vínculos. Use Arquivar.');
                return [];
            }
        }
    };
    const context = {
        window: { Arcadia: A },
        document: {
            body,
            activeElement: null,
            createElement: (tag) => new Element(tag),
            getElementById: (id) => ids.get(id)
        },
        location: { hash: '#turmas' },
        queueMicrotask,
        Intl,
        Date
    };
    vm.runInNewContext(fs.readFileSync('front/js/academic-ui.js', 'utf8'), context);
    return { body, ids, A, context, requests };
}
test('admin abre arquivadas, restaura com confirmação explícita e exibe bloqueio de exclusão no diálogo', async () => {
    const f = fixture();
    vm.runInNewContext(fs.readFileSync('front/js/admin-academic.js', 'utf8'), f.context);
    await settle();
    const panel = f.ids.get('adminAcademicPanel');
    assert.equal(panel.hidden, false);
    assert.equal(f.ids.get('adminGeneralPanel').hidden, true);
    all(panel)
        .find((n) => n.tag === 'button' && n.textContent === 'Restaurar')
        .onclick();
    let dialog = all(f.body).find((n) => n.tag === 'dialog');
    await dialog.querySelector('form').onsubmit({ preventDefault() {} });
    assert.ok(
        f.requests.some(
            (r) => r.path.endsWith('/restore/turma/10') && r.body.confirmacao === 'RESTAURAR'
        )
    );
    assert.match(panel.textContent, /Turma restaurada/);
    all(panel)
        .find((n) => n.tag === 'button' && n.textContent === 'Excluir definitivamente')
        .onclick();
    dialog = all(f.body).find((n) => n.tag === 'dialog');
    all(dialog).find((n) => n.tag === 'input').value = 'Turma A';
    await dialog.querySelector('form').onsubmit({ preventDefault() {} });
    assert.equal(dialog.open, true);
    assert.match(dialog.textContent, /Há vínculos/);
});
test('aluno envia pedido por ID selecionado e vê estado pendente sem controles de aprovação', async () => {
    const f = fixture('discente', false);
    vm.runInNewContext(fs.readFileSync('front/js/class-access.js', 'utf8'), f.context);
    await settle();
    const host = f.ids.get('academicAccess'),
        details = all(host).find((n) => n.tag === 'details');
    details.open = true;
    details.events.toggle();
    await settle();
    const picker = all(host).find((n) => n.tag === 'select');
    picker.value = '10';
    all(host)
        .find((n) => n.tag === 'form')
        .onsubmit({ preventDefault() {} });
    await settle();
    await settle();
    const send = f.requests.find((r) => r.path.endsWith('/requests') && r.method === 'POST');
    assert.equal(send.body.id_turma, 10);
    assert.match(host.textContent, /Aguardando análise/);
    assert.ok(!all(host).some((n) => n.tag === 'button' && n.textContent === 'Aprovar entrada'));
});
test('gravação confirmada e falha de recarga informam os dois resultados sem induzir reenvio', async () => {
    const f = fixture(),
        status = new Element('p');
    await f.A.academicUI.reloadAfter(
        { message: 'Registro salvo.' },
        async () => {
            throw new Error('Servidor indisponível');
        },
        status
    );
    assert.match(
        status.textContent,
        /Registro salvo.*Não foi possível atualizar.*Servidor indisponível/
    );
});
