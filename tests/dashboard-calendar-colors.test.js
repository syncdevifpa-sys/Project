const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('painel identifica categorias do calendário e aplica cores personalizadas sem colorir notícias', async () => {
    const panels = [{}, {}],
        stats = [{}, {}, {}],
        captions = [{}, {}, {}],
        ready = [],
        properties = {};
    const A = {
        auth: { exigirLogin: () => true, getSessao: () => ({ id_usuario: 4 }) },
        calendarCategories: require('../front/js/calendar-categories'),
        showToast: (message) => assert.fail(message),
        api: {
            expect: (result) => result,
            get: async (path) =>
                ({
                    '/api/read-notices/unread/count': { unread: 1 },
                    '/api/tasks': [],
                    '/api/documents/my': [],
                    '/api/calendar': [
                        { titulo: 'Recesso', categoria: 'recesso', data_evento: '2099-12-01' },
                        {
                            titulo: 'Notas',
                            categoria: 'registro_academico',
                            data_evento: '2099-12-02'
                        }
                    ],
                    '/api/notices': [
                        {
                            id_aviso: 7,
                            titulo: 'Notícia',
                            categoria: 'evento',
                            data_publicacao: '2026-10-19'
                        }
                    ]
                })[path]
        }
    };
    const context = {
        window: { Arcadia: A, addEventListener() {} },
        location: { pathname: '/dashboard.html' },
        localStorage: { getItem: () => JSON.stringify({ ferias: '#123456' }) },
        document: {
            documentElement: { style: { setProperty: (key, value) => (properties[key] = value) } },
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: (selector) =>
                ({ '.ar-panel-body': panels, '.ar-stat-value': stats, '.ar-stat-cap': captions })[
                    selector
                ] || [],
            addEventListener: (event, callback) => ready.push(callback)
        }
    };
    for (const name of ['calendar-colors', 'pages'])
        vm.runInNewContext(fs.readFileSync('front/js/' + name + '.js', 'utf8'), context);
    ready.forEach((callback) => callback());
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(panels[0].innerHTML, /data-event-category="ferias"/);
    assert.match(panels[0].innerHTML, /data-event-category="registro_academico"/);
    assert.match(panels[0].innerHTML, /Férias e recessos/);
    assert.match(panels[0].innerHTML, /Prazos e registros acadêmicos/);
    assert.equal(properties['--event-ferias'], '#123456');
    assert.equal(properties['--event-recesso'], '#123456');
    assert.doesNotMatch(panels[1].innerHTML, /data-event-category/);
});
