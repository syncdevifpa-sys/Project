const { test } = require('node:test');
const assert = require('node:assert/strict');
const { eligible, createNavigator } = require('../front/js/progressive-navigation');
const current = new URL('https://portal.example/campus-map.html');
function anchor(href, attributes = {}) {
    return {
        href: new URL(href, current).href,
        target: '',
        dataset: {},
        hasAttribute: (key) => key in attributes,
        ...attributes
    };
}
const click = { button: 0 };
test('somente links de telas compatíveis e do mesmo diretório são interceptados', () => {
    for (const page of ['notices.html', 'projects.html', 'dashboard.html', 'notice.html?id=4'])
        assert.equal(eligible(anchor(page), click, current, '/'), true, page);
    for (const page of [
        'login.html',
        'classes.html',
        'calendar.html',
        'admin.html',
        'https://outro.example/notices.html',
        'mailto:a@b.test',
        '#local=a',
        'campus-map.html#mapPlaces',
        '/outra/notices.html'
    ])
        assert.equal(eligible(anchor(page), click, current, '/'), false, page);
    for (const attribute of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey', 'defaultPrevented'])
        assert.equal(
            eligible(anchor('notices.html'), { ...click, [attribute]: true }, current, '/'),
            false,
            attribute
        );
    assert.equal(eligible(anchor('notices.html'), { button: 1 }, current, '/'), false);
    assert.equal(
        eligible(anchor('notices.html', { target: '_blank' }), click, current, '/'),
        false
    );
    assert.equal(eligible(anchor('notices.html', { download: '' }), click, current, '/'), false);
    assert.equal(
        eligible(anchor('notices.html', { dataset: { noProgressive: '' } }), click, current, '/'),
        false
    );
});
function fixture() {
    const waiting = new Map(),
        committed = [],
        failures = [],
        activity = [];
    let owner = 'conta-a';
    const nav = createNavigator({
        prepare: (url, signal) =>
            new Promise((resolve, reject) => {
                waiting.set(url, { resolve, reject, signal });
                signal.addEventListener('abort', () => reject(new Error('Cancelado')), {
                    once: true
                });
            }),
        commit: async (data, url, options) => committed.push({ data, url, options }),
        fallback: (url, error) => failures.push({ url, error }),
        busy: (value) => activity.push(value),
        session: () => owner
    });
    return {
        nav,
        waiting,
        committed,
        failures,
        activity,
        owner(value) {
            owner = value;
        }
    };
}
test('navegação rápida cancela resposta anterior e só a última tela é montada', async () => {
    const f = fixture(),
        first = f.nav.go('avisos'),
        last = f.nav.go('projetos');
    assert.equal(f.waiting.get('avisos').signal.aborted, true);
    f.waiting.get('projetos').resolve('tela-projetos');
    await Promise.all([first, last]);
    assert.deepEqual(
        f.committed.map((row) => row.url),
        ['projetos']
    );
    assert.equal(f.failures.length, 0);
    assert.equal(f.activity.at(-1), false);
});
test('troca de conta entre fetch e montagem não entrega a tela antiga', async () => {
    const f = fixture(),
        pending = f.nav.go('painel');
    f.owner('conta-b');
    f.waiting.get('painel').resolve('dados-antigos');
    await pending;
    assert.equal(f.committed.length, 0);
    assert.equal(f.failures.length, 1);
    assert.equal(f.activity.at(-1), false);
});
test('falha usa navegação normal, libera estado ocupado e preserva opção de histórico', async () => {
    const f = fixture(),
        bad = f.nav.go('indisponivel');
    f.waiting.get('indisponivel').reject(new Error('Falha de rede'));
    await bad;
    assert.equal(f.failures.length, 1);
    assert.equal(f.activity.at(-1), false);
    const back = f.nav.go('avisos', { pop: true });
    f.waiting.get('avisos').resolve('tela');
    await back;
    assert.equal(f.committed[0].options.pop, true);
});
test('cancelar ao sair impede montagem tardia sem iniciar fallback', async () => {
    const f = fixture(),
        pending = f.nav.go('avisos');
    f.nav.cancel();
    await pending;
    assert.equal(f.committed.length, 0);
    assert.equal(f.failures.length, 0);
    assert.equal(f.activity.at(-1), false);
});

test('tempo excedido retorna à navegação normal e libera a interface uma única vez', async () => {
    const failures = [],
        activity = [];
    const nav = createNavigator({
        timeoutMs: 5,
        session: () => '',
        busy: (value) => activity.push(value),
        prepare: (url, signal) =>
            new Promise((resolve, reject) =>
                signal.addEventListener('abort', () => reject(new Error('Cancelado')), {
                    once: true
                })
            ),
        commit: () => assert.fail('Tela fora do prazo não pode montar.'),
        fallback: (url, error) => failures.push(error.message)
    });
    await nav.go('avisos');
    assert.equal(failures.length, 1);
    assert.match(failures[0], /Tempo excedido/);
    assert.equal(activity.at(-1), false);
});
