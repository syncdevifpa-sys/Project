const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
function fixture(
    fail = false,
    ambiguous = false,
    readerVersion = 'colunas-2026-10-16-v3',
    reviewReason
) {
    const nodes = [],
        calls = [];
    let refreshed = 0,
        revoked = 0;
    function make(tag) {
        const node = {
            tag,
            children: [],
            events: {},
            style: {},
            attributes: {},
            value: '',
            checked: false,
            disabled: false,
            append(...items) {
                this.children.push(...items);
            },
            replaceChildren() {
                this.children = [];
            },
            setAttribute(k, v) {
                this.attributes[k] = v;
            },
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            focus() {},
            showModal() {
                this.open = true;
            },
            close() {
                this.open = false;
                this.events.close?.();
            },
            remove() {
                this.removed = true;
            }
        };
        nodes.push(node);
        return node;
    }
    const preview = {
        readerVersion,
        pages: 2,
        candidates: [
            {
                titulo: 'Evento',
                data_evento: '2025-03-12',
                data_fim: null,
                page: 2,
                sourceMonth: 3,
                sourceYear: 2025,
                sourceText: '12 – Evento',
                warning: [],
                requiresEnd: false
            }
        ],
        warnings: [],
        unparsed: [],
        previewToken: 'preview-test',
        detected: { years: [2025], reference: 'Resolução1544', campus: 'Belém' }
    };
    if (ambiguous) {
        Object.assign(preview.candidates[0], {
            needsIndividualReview: true,
            reviewReason,
            natureza: 'interrupcao_presencial',
            categoria: 'evento',
            sourcePages: [1, 2]
        });
        preview.colorAnalysis = {
            legend: [{ color: '#ff0000', text: 'Feriados', kind: 'sem_aula' }]
        };
    }
    const A = {
        auth: { getSessao: () => ({ id_usuario: 4, tipo_usuario: 'servidor' }) },
        showToast() {},
        api: {
            request: async (path, opts) => {
                calls.push({ path, opts });
                return preview;
            },
            expect: (p) => p,
            post: async (path, body) => {
                calls.push({ path, body });
                if (fail) throw Error('Falha de teste');
                return { imported: 1, skipped: 0, message: '1 evento importado' };
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/calendar-import.js', 'utf8'), {
        window: { Arcadia: A },
        document: { body: make('body'), createElement: make },
        URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => revoked++ },
        URLSearchParams,
        TextDecoder
    });
    const dialog = A.calendarImport.open(() => {
        refreshed++;
    });
    const findLabel = (text) =>
        nodes.find((n) => n.tag === 'label' && n.textContent === text).children[0];
    return {
        nodes,
        calls,
        dialog,
        findLabel,
        get refreshed() {
            return refreshed;
        },
        get revoked() {
            return revoked;
        }
    };
}
test('abrir e cancelar importador não envia arquivo nem grava eventos', () => {
    const f = fixture();
    assert.equal(f.calls.length, 0);
    f.nodes.find((n) => n.textContent === 'Fechar').events.click();
    assert.equal(f.dialog.removed, true);
    assert.equal(f.calls.length, 0);
});

test('prévia de servidor antigo é recusada antes de permitir importação', async () => {
    const old = fixture(false, false, 'leitor-anterior');
    old.nodes.find((n) => n.name === 'file').files = [
        {
            name: 'calendar.pdf',
            size: 100,
            slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-').buffer })
        }
    ];
    old.nodes.find((n) => n.name === 'metadataConfirmed').checked = true;
    await old.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    assert.ok(
        old.nodes.some((n) =>
            /servidor ainda está usando uma versão anterior/.test(n.textContent || '')
        )
    );
    assert.equal(
        old.nodes.some((n) => n.textContent === 'Importar eventos selecionados'),
        false
    );
    assert.equal(old.calls.length, 1);
});
test('upload prepara só prévia; gravação exige revisão e confirmação pública; erro preserva valores', async () => {
    for (const fail of [false, true]) {
        const f = fixture(fail);
        f.nodes.find((n) => n.name === 'file').files = [
            {
                name: 'calendar.pdf',
                size: 100,
                slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-').buffer })
            }
        ];
        f.nodes.find((n) => n.name === 'year').value = '2025';
        f.nodes.find((n) => n.name === 'label').value = 'Res1544';
        f.findLabel('Modalidade').value = 'basica';
        f.nodes.find((n) => n.name === 'metadataConfirmed').checked = true;
        await f.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
        assert.equal(f.calls.length, 1);
        assert.equal(f.calls[0].opts.raw, true);
        assert.ok(f.nodes.some((n) => n.tag === 'h3' && n.textContent === 'março de 2025'));
        const commit = f.nodes.find((n) => n.textContent === 'Importar eventos selecionados');
        await commit.events.click();
        assert.equal(f.calls.length, 1);
        const reviewed = f.findLabel('Conferi o trecho, o título e as datas no PDF');
        reviewed.checked = true;
        reviewed.events.change();
        const selected = f.findLabel('Importar este evento');
        assert.equal(selected.disabled, false);
        selected.checked = true;
        await commit.events.click();
        assert.equal(f.calls.length, 1);
        f.findLabel(
            'Confirmo a publicação dos eventos selecionados no calendário público'
        ).checked = true;
        f.findLabel('Título revisado').value = 'Evento revisado';
        await commit.events.click();
        assert.equal(f.calls[1].path, '/api/calendar-import/commit');
        assert.equal(f.calls[1].body.events.length, 1);
        assert.equal(f.calls[1].body.events[0].titulo, 'Evento revisado');
        assert.equal(f.refreshed, fail ? 0 : 1);
        if (fail) assert.equal(f.findLabel('Título revisado').value, 'Evento revisado');
        f.nodes.find((n) => n.textContent === 'Fechar').events.click();
        assert.equal(f.revoked, 1);
    }
});

test('seleção em lote exige conferência, ignora datas inválidas e permite desmarcar sem importar', async () => {
    const f = fixture();
    f.nodes.find((n) => n.name === 'file').files = [
        {
            name: 'calendar.pdf',
            size: 100,
            slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-').buffer })
        }
    ];
    f.nodes.find((n) => n.name === 'year').value = '2025';
    f.nodes.find((n) => n.name === 'label').value = 'Res1544';
    f.findLabel('Modalidade').value = 'basica';
    f.nodes.find((n) => n.name === 'metadataConfirmed').checked = true;
    await f.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    const batch = f.nodes.find((n) => n.textContent === 'Marcar todos os eventos válidos'),
        selected = f.findLabel('Importar este evento');
    batch.events.click();
    assert.equal(selected.checked, false);
    f.findLabel(
        'Conferi no PDF os títulos e as datas dos eventos que vou selecionar em lote'
    ).checked = true;
    f.findLabel('Data inicial').value = '2025-02-30';
    batch.events.click();
    assert.equal(selected.checked, false);
    f.findLabel('Data inicial').value = '2025-03-12';
    batch.events.click();
    assert.equal(selected.checked, true);
    assert.equal(f.findLabel('Conferi o trecho, o título e as datas no PDF').checked, true);
    assert.equal(f.calls.length, 1);
    f.nodes.find((n) => n.textContent === 'Desmarcar todos').events.click();
    assert.equal(selected.checked, false);
    assert.equal(selected.disabled, true);
    assert.equal(f.calls.length, 1);
});
test('cores ambíguas ficam fora do lote e só podem ser marcadas após revisão individual', async () => {
    const f = fixture(false, true);
    f.nodes.find((n) => n.name === 'file').files = [
        {
            name: 'calendar.pdf',
            size: 100,
            slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-').buffer })
        }
    ];
    f.nodes.find((n) => n.name === 'year').value = '2025';
    f.nodes.find((n) => n.name === 'label').value = 'Res1544';
    f.findLabel('Modalidade').value = 'basica';
    f.nodes.find((n) => n.name === 'metadataConfirmed').checked = true;
    await f.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    assert.ok(
        f.nodes.some((n) => n.textContent === 'Legenda de cores reconhecida nesta modalidade')
    );
    assert.ok(
        f.nodes.some(
            (n) =>
                n.textContent ===
                'Interrupção presencial: não implica suspensão de todas as atividades.'
        )
    );
    assert.ok(f.nodes.some((n) => n.textContent === 'Páginas de origem: 1, 2'));
    f.findLabel(
        'Conferi no PDF os títulos e as datas dos eventos que vou selecionar em lote'
    ).checked = true;
    f.nodes.find((n) => n.textContent === 'Marcar todos os eventos válidos').events.click();
    const selected = f.findLabel('Importar este evento');
    assert.equal(selected.checked, false);
    assert.equal(selected.disabled, true);
    const reviewed = f.findLabel('Conferi o trecho, o título e as datas no PDF');
    reviewed.checked = true;
    reviewed.events.change();
    assert.equal(selected.disabled, false);
    assert.equal(f.calls.length, 1);
});

test('data válida com aviso apenas de cor pode ser marcada em lote', async () => {
    const f = fixture(false, true, 'colunas-2026-10-16-v3', 'color');
    f.nodes.find((n) => n.name === 'file').files = [
        {
            name: 'calendar.pdf',
            size: 100,
            slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('%PDF-').buffer })
        }
    ];
    f.nodes.find((n) => n.name === 'metadataConfirmed').checked = true;
    await f.nodes.find((n) => n.tag === 'form').events.submit({ preventDefault() {} });
    f.findLabel(
        'Conferi no PDF os títulos e as datas dos eventos que vou selecionar em lote'
    ).checked = true;
    f.nodes.find((n) => n.textContent === 'Marcar todos os eventos válidos').events.click();
    assert.equal(f.findLabel('Importar este evento').checked, true);
    assert.equal(f.findLabel('Conferi o trecho, o título e as datas no PDF').checked, true);
    assert.equal(f.calls.length, 1);
});
