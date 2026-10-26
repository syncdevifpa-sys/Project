const { test } = require('node:test');
const assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
const code = fs.readFileSync('front/js/navigation.js', 'utf8');
function fixture(page, session, mobile = false, saved = '0', sessionValues = new Map()) {
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
        media = {
            matches: mobile,
            addEventListener(k, fn) {
                this.change = fn;
            }
        };
    const document = {
        readyState: 'complete',
        body,
        querySelector: (s) => (s === '.ar-nav-end' ? end : s === '.ar-app' ? app : host),
        createElement: element,
        createElementNS: (ns, t) => Object.assign(element(t), { namespaceURI: ns })
    };
    const Arcadia = { auth: { getSessao: () => session } };
    vm.runInNewContext(code, {
        window: { Arcadia, matchMedia: () => media, addEventListener() {}, setTimeout: fn => fn() },
        sessionStorage: { getItem:k=>sessionValues.get(k),setItem:(k,v)=>sessionValues.set(k,v) },
        Arcadia,
        document,
        location: { pathname: '/front/' + page },
        localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) }
    });
    return {
        nodes,
        body,
        app,
        media,
        storage,
        sessionValues,
        toggle: nodes.find((n) => n.className === 'ar-iconbtn ar-sidebar-toggle'),
        sidebar: nodes.find((n) => n.id === 'portalSidebar'),
        nav: nodes.find((n) => n.attributes['aria-label'] === 'Navegação do portal'),
        backdrop: nodes.find((n) => n.className === 'ar-sidebar-backdrop')
    };
}
test('sidebar preserva grupos expandidos e posição ao trocar de página, separados por conta',()=>{
    const session={id_usuario:7,tipo_usuario:'discente'};
    const first=fixture('dashboard.html',session);
    const content=first.nodes.find(n=>n.dataset.group==='Conteúdo');
    content.open=true;content.children[0].events.click();
    first.sidebar.scrollTop=145;first.sidebar.events.scroll();
    const next=fixture('classes.html',session,false,'0',first.sessionValues);
    assert.equal(next.nodes.find(n=>n.dataset.group==='Conteúdo').open,true);
    assert.equal(next.sidebar.scrollTop,145);
    const other=fixture('classes.html',{id_usuario:8,tipo_usuario:'discente'},false,'0',first.sessionValues);
    assert.equal(other.nodes.find(n=>n.dataset.group==='Conteúdo').open,false);
    assert.equal(other.sidebar.scrollTop,0);
});
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
    const external = fixture('community.html', { tipo_usuario: 'externo', is_admin: true });
    assert.ok(external.sidebar);
    const destinations = external.nodes.filter(node=>node.tag==='a').map(node=>node.href);
    for(const path of ['community.html','community-settings.html','tasks.html','notices.html','calendar.html','projects.html']) assert.ok(destinations.includes(path));
    for(const path of ['documents.html','people.html','classes.html','admin.html']) assert.ok(!destinations.includes(path));
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
