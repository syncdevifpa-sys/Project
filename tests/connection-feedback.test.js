const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    class Node {
        constructor(tag) {
            this.tag = tag;
            this.children = [];
            this.events = {};
            this.attributes = {};
            this.disabled = false;
        }
        append(...nodes) {
            for (const node of nodes) {
                node.parent = this;
                this.children.push(node);
            }
        }
        remove() {
            if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
            this.parent = null;
        }
        get isConnected() {
            return this.tag === 'body' || !!this.parent?.isConnected;
        }
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
        addEventListener(name, callback) {
            this.events[name] = callback;
        }
    }
    const body = new Node('body'),
        events = {},
        domEvents = {},
        navigator = { onLine: true },
        calls = [],
        timers = new Map();
    let available = true,
        failure;
    const window = {
        Arcadia: { api: { BASE: 'https://arcadia.test' } },
        addEventListener: (name, fn) => {
            events[name] = fn;
        }
    };
    const document = {
        body,
        createElement: (tag) => new Node(tag),
        addEventListener: (name, fn) => {
            domEvents[name] = fn;
        }
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/connection-feedback.js', 'utf8'), {
        window,
        document,
        navigator,
        location: { origin: 'https://arcadia.test' },
        AbortController,
        setTimeout: (fn) => {
            const id = Symbol();
            timers.set(id, fn);
            return id;
        },
        clearTimeout: (id) => timers.delete(id),
        fetch: async (url, options = {}) => {
            calls.push({ url, method: options.method || 'GET' });
            if (failure) throw failure;
            if (!available) throw new TypeError('fetch failed');
            return { ok: true, status: 200 };
        }
    });
    domEvents.DOMContentLoaded();
    return {
        body,
        Node,
        calls,
        events,
        navigator,
        timers,
        connection: window.Arcadia.connection,
        set available(value) {
            available = value;
        },
        set failure(value) {
            failure = value;
        }
    };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
test('offline persistente não duplica aviso e recuperação só confirma acesso real ao servidor', async () => {
    const f = fixture();
    f.available = false;
    f.navigator.onLine = false;
    f.events.offline();
    f.events.offline();
    assert.equal(f.body.children.length, 1);
    assert.equal(
        f.body.children[0].children[0].textContent,
        'Você está sem conexão. Verifique sua internet e tente novamente.'
    );
    assert.equal(f.body.children[0].attributes['aria-live'], 'polite');
    f.navigator.onLine = true;
    await f.events.online();
    assert.match(
        f.body.children[0].children[0].textContent,
        /Não foi possível conectar ao Arcádia/
    );
    f.available = true;
    await f.events.online();
    assert.equal(f.body.children[0].children[0].textContent, 'Conexão restabelecida.');
    assert.equal(f.body.children[0].children[1].hidden, true);
    for (const fn of [...f.timers.values()]) fn();
    assert.equal(f.body.children.length, 0);
});
test('POST com falha não é reenviado ao recuperar conexão ou clicar na verificação global', async () => {
    const f = fixture();
    f.available = false;
    await assert.rejects(
        f.connection.fetch('/api/users', { method: 'POST' }),
        (error) => error.code === 'NETWORK_ERROR'
    );
    await assert.rejects(
        f.connection.fetch('/api/notices', { method: 'DELETE' }),
        (error) => error.code === 'NETWORK_ERROR'
    );
    assert.equal(f.body.children.length, 1);
    f.available = true;
    await f.events.online();
    assert.deepEqual(
        f.calls.map((call) => call.method),
        ['POST', 'DELETE', 'GET']
    );
    assert.ok(f.calls.at(-1).url.endsWith('/api'));
});
test('tentativa contextual repete somente a leitura e preserva os campos existentes', async () => {
    const f = fixture(),
        area = new f.Node('section'),
        input = new f.Node('input');
    input.value = 'Texto ainda não enviado';
    area.append(input);
    f.body.append(area);
    const failure = Object.assign(new Error('Falha de rede'), { code: 'NETWORK_ERROR' });
    let reads = 0;
    const load = async () => {
        reads++;
        await f.connection.fetch('/api/notices');
    };
    f.connection.offerRetry(area, load, failure);
    f.connection.offerRetry(area, load, failure);
    assert.equal(area.children.length, 2);
    assert.equal(reads, 0);
    await area.children[1].events.click();
    assert.equal(reads, 1);
    assert.equal(area.children.length, 1);
    assert.equal(input.value, 'Texto ainda não enviado');
});
test('cancelamento de navegação não vira erro de conexão', async () => {
    const f = fixture();
    f.failure = Object.assign(new Error('Cancelado'), { name: 'AbortError' });
    await assert.rejects(
        f.connection.fetch('/api/notices'),
        (error) => error.name === 'AbortError'
    );
    assert.equal(f.body.children.length, 0);
});
