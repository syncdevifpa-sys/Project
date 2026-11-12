const { test } = require('node:test');
const assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
const code = fs.readFileSync('front/js/navigation.js', 'utf8');
// Pages whose HTML ships the top menu that navigation.js replaces.
const PAGES = [
    'admin',
    'calendar',
    'classes',
    'documents',
    'notice',
    'notices',
    'people',
    'projects',
    'settings',
    'tasks'
];
function fixture(page, session, mobile = false, saved = '0', label) {
    const nodes = [],
        storage = new Map([['arcadia-sidebar-collapsed', saved]]);
    function element(tag) {
        const node = {
            tag,
            dataset: {},
            children: [],
            attributes: {},
            events: {},
            classList: {
                values: [],
                add(v) {
                    this.values.push(v);
                },
                toggle(v, on) {
                    this.values = this.values.filter((x) => x !== v);
                    if (on) this.values.push(v);
                }
            },
            setAttribute(k, v) {
                this.attributes[k] = v;
            },
            getAttribute(k) {
                return this.attributes[k];
            },
            removeAttribute(k) {
                delete this.attributes[k];
            },
            append(...items) {
                this.children.push(...items);
            },
            replaceChildren(...items) {
                this.children = items;
            },
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            focus() {
                this.focused = true;
            }
        };
        nodes.push(node);
        return node;
    }
    const host = element('nav'),
        end = element('div'),
        body = element('body'),
        app = element('main'),
        root = element('html'),
        media = {
            matches: mobile,
            addEventListener(k, fn) {
                this.change = fn;
            }
        };
    // js/navigation-boot.js leaves this mark on <html> before first paint.
    root.setAttribute('data-nav-pending', '');
    // data-nav-label on the menu: the page label already painted by the stylesheet.
    if (label) host.dataset.navLabel = label;
    const document = {
        readyState: 'complete',
        documentElement: root,
        body,
        querySelector: (s) => (s === '.ar-nav-end' ? end : s === '.ar-app' ? app : host),
        createElement: element,
        createElementNS: (ns, t) => Object.assign(element(t), { namespaceURI: ns })
    };
    const Arcadia = { auth: { getSessao: () => session } };
    vm.runInNewContext(code, {
        window: { Arcadia, matchMedia: () => media },
        Arcadia,
        document,
        location: { pathname: '/front/' + page },
        localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) }
    });
    return {
        nodes,
        root,
        body,
        app,
        media,
        storage,
        current: nodes.find((n) => n.className === 'ar-nav-current'),
        toggle: nodes.find((n) => n.className === 'ar-iconbtn ar-sidebar-toggle'),
        sidebar: nodes.find((n) => n.id === 'portalSidebar'),
        nav: nodes.find((n) => n.attributes['aria-label'] === 'Navegação do portal'),
        backdrop: nodes.find((n) => n.className === 'ar-sidebar-backdrop')
    };
}
test('sidebar marks current section, gates administration and remembers icon rail', () => {
    const f = fixture('admin.html', { is_admin: true, tipo_usuario: 'servidor' });
    assert.equal(f.nodes.find((n) => n.attributes['aria-current'] === 'page').href, 'admin.html');
    assert.equal(f.nodes.find((n) => n.classList.values.includes('ar-sidebar-admin')).open, true);
    f.toggle.events.click();
    assert.equal(f.storage.get('arcadia-sidebar-collapsed'), '1');
    assert.equal(f.toggle.attributes['aria-expanded'], 'false');
    assert.equal(
        fixture('settings.html', { tipo_usuario: 'discente' }, false, '1').toggle.attributes[
            'aria-label'
        ],
        'Expandir navegação'
    );
    assert.equal(
        fixture('dashboard.html', { tipo_usuario: 'discente' }).nodes.some(
            (n) => n.href === 'admin.html'
        ),
        false
    );
    assert.equal(
        fixture('community.html', { tipo_usuario: 'externo', is_admin: true }).sidebar,
        undefined
    );
});
test('mobile drawer closes with Escape, backdrop and navigation; restores background access', () => {
    const f = fixture('settings.html', { tipo_usuario: 'discente' }, true);
    assert.equal(f.sidebar.inert, true);
    f.toggle.events.click();
    assert.equal(f.app.inert, true);
    assert.equal(f.sidebar.attributes['aria-modal'], 'true');
    let prevented = false;
    f.sidebar.events.keydown({
        key: 'Escape',
        preventDefault() {
            prevented = true;
        }
    });
    assert.equal(prevented, true);
    assert.equal(f.app.inert, false);
    assert.equal(f.toggle.focused, true);
    f.toggle.events.click();
    f.backdrop.events.click();
    assert.equal(f.sidebar.inert, true);
    f.toggle.events.click();
    f.nav.events.click({ target: { closest: () => ({ href: 'tasks.html' }) } });
    assert.equal(f.sidebar.inert, true);
});
test('notice detail marks its parent and production pages do not embed fictional identity', () => {
    const f = fixture('notice.html', { tipo_usuario: 'discente' });
    assert.equal(f.nodes.find((n) => n.attributes['aria-current'] === 'true').href, 'notices.html');
    for (const p of ['people', 'settings', 'projects', 'tasks'])
        assert.doesNotMatch(
            fs.readFileSync('front/' + p + '.html', 'utf8'),
            /Ana Ribeiro|ana\.ribeiro/i
        );
});

test('compact navigation has distinct semantic icons and accessible names', () => {
    const f = fixture('notices.html', { tipo_usuario: 'servidor', is_admin: true }, false, '1');
    const links = f.nodes.filter((n) => n.tag === 'a' && n.children[0]?.tag === 'svg');
    const paths = links.map((n) => n.children[0].children[0].attributes.d);
    assert.equal(new Set(paths).size, links.length);
    assert.ok(links.every((n) => n.title && n.attributes['aria-label'] === n.title));
    assert.equal(links.find((n) => n.href === 'notices.html').title, 'Avisos e notícias');
});

test('navigation clears the pending mark for sidebar and link menus', () => {
    for (const session of [{ tipo_usuario: 'discente' }, { tipo_usuario: 'externo' }, {}])
        assert.equal(
            'data-nav-pending' in fixture('notices.html', session).root.attributes,
            false
        );
});

test('boot script tells the stylesheet which menu to reserve before first paint', () => {
    const boot = fs.readFileSync('front/js/navigation-boot.js', 'utf8');
    function run(session, collapsed) {
        const attributes = {},
            storage = {
                arcadiaSessao: JSON.stringify(session),
                'arcadia-sidebar-collapsed': collapsed
            };
        vm.runInNewContext(boot, {
            document: {
                documentElement: {
                    setAttribute: (k, v) => (attributes[k] = v),
                    removeAttribute: (k) => delete attributes[k]
                }
            },
            localStorage: { getItem: (k) => storage[k] ?? null },
            setTimeout: () => {}
        });
        return attributes;
    }
    assert.deepEqual(run({ tipo_usuario: 'discente' }, '0'), {
        'data-nav': 'sidebar',
        'data-nav-pending': ''
    });
    assert.deepEqual(run({ tipo_usuario: 'docente' }, '1'), {
        'data-nav': 'sidebar',
        'data-nav-pending': '',
        'data-nav-collapsed': ''
    });
    assert.equal(run({ tipo_usuario: 'externo' }, '1')['data-nav'], 'links');
    assert.equal(run({}, '0')['data-nav'], 'links');
    // The script must run before the first stylesheet on every page with this menu.
    for (const p of PAGES) {
        const html = fs.readFileSync('front/' + p + '.html', 'utf8'),
            at = html.indexOf('js/navigation-boot.js');
        assert.ok(at > 0 && at < html.indexOf('tokens.css'), p);
    }
});

test('each page ships the label the sidebar script shows, so it never changes on screen', () => {
    const admin = { tipo_usuario: 'servidor', is_admin: true };
    for (const p of PAGES) {
        const html = fs.readFileSync('front/' + p + '.html', 'utf8'),
            shipped = /class="ar-navpill"[^>]*data-nav-label="([^"]+)"/.exec(html)?.[1];
        // Without the attribute the script falls back to the name it computes itself.
        assert.equal(shipped, fixture(p + '.html', admin).current.textContent, p);
    }
    // The label already painted wins, even where the script would compute another one.
    assert.equal(fixture('admin.html', { tipo_usuario: 'discente' }).current.textContent, 'Portal');
    assert.equal(
        fixture('admin.html', { tipo_usuario: 'discente' }, false, '0', 'Gerenciar aplicativo')
            .current.textContent,
        'Gerenciar aplicativo'
    );
    // The waiting state paints that label from the attribute, not from the old menu links.
    assert.match(
        fs.readFileSync('front/navigation.css', 'utf8'),
        /\.ar-navpill\[data-nav-label\]::before \{\s*content: attr\(data-nav-label\);/
    );
});
