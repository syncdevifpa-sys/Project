const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
test('FAQ mantém perguntas, responde limites reais e associa botões e painéis acessíveis', () => {
    const html = fs.readFileSync('frontend/tutorial.html', 'utf8').replace(/\s+/g, ' ');
    for (const question of [
        'Quem pode usar a Arcádia?',
        'Há alguma taxa de assinatura?',
        'Como meu vínculo é verificado?',
        'A Arcádia substitui o SIGAA?',
        'Funciona no celular?'
    ])
        assert.ok(html.includes(question));
    assert.match(html, /Comunidade externa/);
    // A apresentação usa o acordeão da landing: botões com aria-expanded ligados ao painel
    // por aria-controls (js/tutorial-landing.js, testado abaixo).
    assert.ok(
        (html.match(/<button type="button" class="faq-trigger" aria-expanded="false">/g) || []).length >= 5,
        'FAQ usa botões acessíveis na apresentação'
    );
    assert.match(html, /src="js\/tutorial-landing\.js"/);
    assert.doesNotMatch(fs.readFileSync('frontend/index.html', 'utf8'), /class="guide-faq"/, 'guia não ocupa o Início');
    assert.match(html, /Google permite entrar em uma conta já cadastrada/);
    assert.match(html, /recuperação de senha depende do serviço/i);
    assert.match(html, /validação administrativa/);
    assert.match(html, /não gera um documento oficial automaticamente/);
    const panel = {
            classList: { contains: () => true },
            setAttribute(k, v) {
                this[k] = v;
            }
        },
        attrs = { 'aria-expanded': 'false' },
        trigger = {
            nextElementSibling: panel,
            setAttribute(k, v) {
                attrs[k] = v;
            },
            getAttribute(k) {
                return attrs[k];
            },
            addEventListener(k, fn) {
                this[k] = fn;
            },
            querySelector: () => null
        };
    const A = { auth: {}, api: {} };
    const document = {
        readyState: 'complete',
        querySelectorAll: (s) => (s === '.faq-trigger' ? [trigger] : []),
        getElementById: () => null
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/tutorial-landing.js', 'utf8'), {
        document,
        window: { Arcadia: A, addEventListener() {} },
        localStorage: { getItem: () => null }
    });
    assert.equal(panel.hidden, true);
    assert.equal(attrs['aria-controls'], panel.id);
    assert.equal(panel['aria-labelledby'], trigger.id);
    trigger.click();
    assert.equal(attrs['aria-expanded'], 'true');
    assert.equal(panel.hidden, false);
    trigger.click();
    assert.equal(panel.hidden, true);
});
