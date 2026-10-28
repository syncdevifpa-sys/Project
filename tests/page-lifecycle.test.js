const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
function fixture() {
    const requests = [],
        toasts = [];
    const A = {
        auth: {
            exigirLogin: () => true,
            getSessao: () => ({ id_usuario: 1, tipo_usuario: 'discente' })
        },
        showToast: (message) => toasts.push(message),
        api: {
            BASE: 'http://localhost',
            get: (path, options) =>
                new Promise((resolve) => requests.push({ path, options, resolve })),
            expect: async (promise) => (await promise).data
        }
    };
    const document = { readyState: 'loading', addEventListener() {} };
    vm.runInNewContext(fs.readFileSync('front/js/pages.js', 'utf8'), {
        window: { Arcadia: A },
        document,
        location: { pathname: '/dashboard.html' },
        AbortController,
        URL,
        URLSearchParams
    });
    const root = () => {
        const stats = Array.from({ length: 3 }, () => ({ textContent: '' })),
            captions = Array.from({ length: 3 }, () => ({ textContent: '' })),
            panels = Array.from({ length: 2 }, () => ({ innerHTML: '' }));
        return {
            stats,
            panels,
            querySelector: () => null,
            querySelectorAll: (selector) =>
                selector === '.ar-stat-value'
                    ? stats
                    : selector === '.ar-stat-cap'
                      ? captions
                      : selector === '.ar-panel-body'
                        ? panels
                        : []
        };
    };
    const complete = (group, unread) => {
        for (const request of group)
            request.resolve({ ok: true, data: request.path.includes('/count') ? { unread } : [] });
    };
    return { A, requests, toasts, root, complete };
}
test('desmontar uma tela cancela suas requisições e respostas antigas não atingem a nova', async () => {
    const f = fixture(),
        first = f.root(),
        second = f.root();
    const old = f.A.pages.mount({ root: first, page: 'dashboard.html' });
    const original = f.requests.slice();
    const fresh = f.A.pages.mount({ root: second, page: 'dashboard.html' });
    const recent = f.requests.slice(original.length);
    assert.equal(original.length, 5);
    assert.ok(original.every((request) => request.options.signal.aborted));
    assert.ok(recent.every((request) => !request.options.signal.aborted));
    f.complete(recent, 2);
    await fresh.ready;
    assert.equal(second.stats[0].textContent, 2);
    f.complete(original, 99);
    await old.ready;
    assert.equal(second.stats[0].textContent, 2);
    assert.notEqual(first.stats[0].textContent, 99);
    assert.deepEqual(f.toasts, []);
    f.A.pages.dispose();
    assert.ok(recent.every((request) => request.options.signal.aborted));
});
