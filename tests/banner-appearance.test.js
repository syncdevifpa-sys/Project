const test = require('node:test');
test('padrão configurado aplica-se às áreas de conteúdo, preservando Meu espaço', () => {
    const { usesSiteDefault } = require('../front/js/class-appearance.js');
    for (const page of [
        'notices.html',
        'calendar.html',
        'projects.html',
        'classes.html',
        'people.html'
    ])
        require('node:assert/strict').equal(usesSiteDefault(page), true);
    for (const page of [
        'dashboard.html',
        'tasks.html',
        'documents.html',
        'settings.html',
        'community.html'
    ])
        require('node:assert/strict').equal(usesSiteDefault(page), false);
});
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { valid, contrast, readable } = require('../front/js/class-appearance');

test('cores de banner rejeitam valores inválidos e corrigem contraste insuficiente', () => {
    assert.equal(valid('var(--ink)'), false);
    assert.equal(valid('#112233'), true);
    assert.equal(readable('#ffffff', '#ffffff'), '#000000');
    assert.equal(readable('#000000', '#000000'), '#ffffff');
    assert.equal(readable('#112233', '#ffffff'), '#ffffff');
    assert.equal(readable('red', '#ffffff'), null);
    assert.equal(contrast('#ffffff', '#000000'), 21);
    // Confere todo o intervalo de cinza e cores intermediárias, inclusive próximas do limiar.
    for (let n = 0; n <= 255; n++) {
        const background = '#' + n.toString(16).padStart(2, '0').repeat(3);
        assert.ok(contrast(background, readable(background, '#777777')) >= 4.5);
    }
});

test('todos os banners de página carregam personalização e estilos circulares do calendário', () => {
    const front = path.join(__dirname, '../front');
    const pages = readdirSync(front).filter((p) => p.endsWith('.html'));
    let count = 0;
    for (const page of pages) {
        const html = readFileSync(path.join(front, page), 'utf8');
        if (!/class="(?:ar-hero |ar-detail |hero-card")/.test(html)) continue;
        count++;
        assert.equal((html.match(/src="js\/class-appearance.js"/g) || []).length, 1, page);
        assert.ok(html.includes('href="banner-appearance.css"'), page);
        assert.ok(html.includes('href="content-views.css"'), page);
    }
    assert.equal(count, 14);
});

test('cards de resumo usam chaves independentes, paleta do portal e restauram apenas o item escolhido', () => {
    function node(title) {
        const classes = new Set(),
            styles = new Map();
        return {
            title,
            children: [],
            dataset: {},
            styles,
            classList: {
                add: (...names) => names.forEach((n) => classes.add(n)),
                remove: (...names) => names.forEach((n) => classes.delete(n)),
                toggle: (n, on) => (on ? classes.add(n) : classes.delete(n))
            },
            style: {
                setProperty: (k, v) => styles.set(k, v),
                removeProperty: (k) => styles.delete(k)
            },
            setAttribute(k, v) {
                this[k] = v;
            },
            querySelector(selector) {
                return selector === '.ar-banner-appearance-trigger'
                    ? this.children.find((n) => n.className === 'ar-banner-appearance-trigger')
                    : { textContent: title, setAttribute() {} };
            },
            append(n) {
                this.children.push(n);
            }
        };
    }
    const hero = node('Olá, Usuário'),
        cards = ['unread-notices', 'open-tasks', 'pending-documents'].map((key) => {
            const n = node(key);
            n.dataset.appearanceId = key;
            return n;
        });
    const preferences = {
        'page:dashboard.html:0': { toString: null },
        'dashboard:summary:unread-notices': {
            mode: 'custom',
            background: '#ffffff',
            text: '#ffffff'
        },
        'dashboard:summary:open-tasks': { mode: 'neutral' }
    };
    const saved = new Map([
        ['arcadiaToken', 'test'],
        ['arcadia-class-banner-styles:7', JSON.stringify(preferences)]
    ]);
    const A = {
        bannerPreferences: require('../front/js/banner-preferences'),
        auth: { getSessao: () => ({ id_usuario: 7 }) },
        getIconSvg: (name) => '<svg data-icon="' + name + '"></svg>'
    };
    const context = {
        window: { Arcadia: A },
        location: { pathname: '/dashboard.html', search: '' },
        localStorage: {
            getItem: (key) => saved.get(key),
            setItem: (key, value) => saved.set(key, value)
        },
        document: {
            readyState: 'complete',
            querySelectorAll: (s) => (s.includes('ar-stat') ? cards : [hero]),
            createElement: () => node('')
        }
    };
    vm.runInNewContext(
        readFileSync(path.join(__dirname, '../front/js/class-appearance.js'), 'utf8'),
        context
    );
    assert.equal(cards[0].styles.get('--personal-banner-ink'), '#000000');
    assert.match(cards[1].styles.get('--personal-banner-bg'), /var\(--surface/);
    assert.equal(cards[2].styles.size, 0);
    assert.equal(hero.styles.size, 0);
    for (const card of cards) {
        assert.equal(card.children.length, 1);
        assert.match(card.children[0].innerHTML, /data-icon="palette"/);
        assert.equal(card.children[0]['aria-label'], 'Personalizar cores');
    }
    delete preferences['dashboard:summary:unread-notices'];
    saved.set('arcadia-class-banner-styles:7', JSON.stringify(preferences));
    A.classAppearance.apply(cards[0], 'dashboard:summary:unread-notices');
    assert.equal(cards[0].styles.size, 0);
    assert.ok(cards[1].styles.size);
    // Uma renderização de Turmas reutiliza o mesmo nó, substituindo seu conteúdo.
    cards[0].children = [];
    A.classAppearance.decorate(cards[0], 'dashboard:summary:unread-notices', 'Novo título');
    assert.equal(cards[0].children.length, 1);
});
