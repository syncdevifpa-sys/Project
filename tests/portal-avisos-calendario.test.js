const { test } = require('node:test');
const assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
const read = (file) => fs.readFileSync('front/' + file, 'utf8');

test('Avisos: todo botão da área de trabalho tem comportamento ligado no código', () => {
    const html = read('notices.html');
    const area = html.slice(html.indexOf('id="noticesWorkspace"'), html.indexOf('Floating SelectionBar'));
    const code = read('js/pages.js') + read('js/notices-crm.js');
    const ids = [...area.matchAll(/<button[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(ids.length >= 4);
    for (const id of ids) assert.match(code, new RegExp(`['#]${id}'`), id);
    // Botões sem id só podem ser as abas de categoria e o seletor de visualização,
    // que js/pages.js e js/portal.js ligam pelos atributos data-*.
    for (const tag of area.match(/<button(?![^>]*\bid=)[^>]*>/g) || [])
        assert.match(tag, /data-filter-key=|data-view=/, tag);
    // Abas que filtram são botões de alternância, não uma lista de abas (role="tab").
    assert.doesNotMatch(area, /role="tablist"/);
});

test('Avisos: painel de filtros abre, fecha com Esc e Limpar volta ao padrão', () => {
    const doc = [];
    function el(props = {}) {
        return {
            hidden: false,
            attributes: {},
            events: {},
            classList: { toggle() {} },
            setAttribute(k, v) {
                this.attributes[k] = v;
            },
            getAttribute(k) {
                return this.attributes[k];
            },
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            dispatchEvent(e) {
                this.dispatched = e.type;
            },
            contains: () => false,
            focus() {
                focused = this;
            },
            ...props
        };
    }
    let focused = null;
    const pub = (key, checked) => el({ dataset: { filterPublico: key }, checked });
    const sit = (key, checked) => el({ dataset: { filterSituacao: key }, checked });
    const publicos = [pub('All', false), pub('Student', true)];
    const situacoes = [sit('Published', true), sit('Draft', true), sit('Archived', false)];
    const tipo = el({ value: 'noticia' });
    const painel = el({
        hidden: true,
        querySelector: (s) => (s === '[data-filter-publico="All"]' ? publicos[0] : null),
        querySelectorAll: (s) => (s.includes('publico') ? publicos : situacoes)
    });
    const nodes = {
        noticesWorkspace: el(),
        btnNoticeFilters: el(),
        noticeFilterPanel: painel,
        btnCloseNoticeFilters: el(),
        btnClearNoticeFilters: el(),
        noticeFilterCount: el(),
        filterNoticeType: tipo,
        filterTextNotices: el({ select() {} }),
        btnNoticeDensity: el()
    };
    vm.runInNewContext(read('js/notices-crm.js'), {
        document: {
            readyState: 'complete',
            getElementById: (id) => nodes[id],
            addEventListener: (k, fn) => doc.push([k, fn])
        },
        localStorage: { getItem: () => null, setItem() {} },
        Event: class {
            constructor(type) {
                this.type = type;
            }
        }
    });
    const keydown = doc.filter(([k]) => k === 'keydown').map(([, fn]) => fn);
    const contador = nodes.noticeFilterCount;
    // Tipo, público e situação diferentes do padrão: três filtros ativos.
    assert.equal(contador.hidden, false);
    assert.equal(contador.textContent, '3');
    nodes.btnNoticeFilters.events.click();
    assert.equal(painel.hidden, false);
    assert.equal(nodes.btnNoticeFilters.attributes['aria-expanded'], 'true');
    assert.equal(focused, tipo);
    for (const fn of keydown) fn({ key: 'Escape', target: {} });
    assert.equal(painel.hidden, true);
    assert.equal(focused, nodes.btnNoticeFilters);
    nodes.btnClearNoticeFilters.events.click();
    painel.events.change();
    assert.equal(tipo.value, '');
    assert.equal(publicos[0].checked, true);
    assert.deepEqual(
        situacoes.map((s) => s.checked),
        [true, false, false]
    );
    assert.equal(tipo.dispatched, 'change');
    assert.equal(contador.hidden, true);
});

test('Calendário: sem cores fixas; cada categoria usa a cor escolhida nas Configurações', () => {
    const css = read('calendar-view.css');
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i);
    const catalogue = {};
    vm.runInNewContext(read('js/calendar-categories.js'), { window: { Arcadia: catalogue } });
    const { groups, aliases } = catalogue.calendarCategories;
    for (const name of [...Object.keys(groups), ...Object.keys(aliases)])
        for (const selector of ['.ar-month-event', '.ar-calendar-event'])
            assert.match(
                css,
                new RegExp(`\\${selector}\\[data-event-category='${name}'\\] \\{\\s*--cat: var\\(--event-${name}`),
                selector + ' ' + name
            );
});

test('Meu painel continua só no tema claro: nada de tokens do portal que escurecem', () => {
    // dashboard.css não tem tema escuro; os tokens de tokens.css mudam com data-theme.
    assert.doesNotMatch(read('dashboard.css'), /var\(--(surface|surface-sunken|line|ink|ink-muted)\)/);
    assert.match(read('dashboard.html'), /js\/calendar-colors\.js/);
});
