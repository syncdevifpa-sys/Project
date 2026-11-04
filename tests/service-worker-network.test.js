const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('cache do service worker não intercepta API, verificação de conexão, escrita ou outro domínio', () => {
    const handlers = {};
    vm.runInNewContext(fs.readFileSync('frontend/sw.js', 'utf8'), {
        self: {
            location: { origin: 'https://arcadia.test' },
            addEventListener: (type, fn) => {
                handlers[type] = fn;
            }
        },
        URL
    });
    for (const [path, method] of [
        ['/api', 'GET'],
        ['/api?connection-check=123', 'GET'],
        ['/api/notices', 'GET'],
        ['/api/users', 'POST'],
        ['https://other.test/script.js', 'GET']
    ]) {
        handlers.fetch({
            request: { url: new URL(path, 'https://arcadia.test').href, method },
            respondWith() {
                assert.fail('Requisição não deve entrar no cache');
            }
        });
    }
});
