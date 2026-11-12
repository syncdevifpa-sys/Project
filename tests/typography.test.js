const { test } = require('node:test');
const assert = require('node:assert/strict'),
    fs = require('node:fs');
const read = (file) => fs.readFileSync('front/' + file, 'utf8');
// Value of a custom property as declared in a stylesheet, with whitespace collapsed.
function token(css, name) {
    const match = new RegExp(name + ':\\s*([^;]+);').exec(css);
    return match && match[1].replace(/\s+/g, ' ').trim();
}

test('landing, portal and dashboard share one type system', () => {
    const portal = read('tokens.css'),
        landing = read('landing.css'),
        dashboard = read('dashboard.css');
    assert.equal(token(portal, '--font-serif'), "'Times New Roman', Times, serif");
    assert.match(token(portal, '--font-sans'), /^-apple-system, .*system-ui, sans-serif$/);
    // landing.css is loaded without tokens.css, so it repeats the same values.
    for (const name of ['--font-serif', '--font-sans'])
        assert.equal(token(landing, name), token(portal, name), name);
    // dashboard.html loads tokens.css and only points at it.
    assert.equal(token(dashboard, '--db-serif'), 'var(--font-serif)');
    assert.equal(token(dashboard, '--db-sans'), 'var(--font-sans)');
    assert.equal(token(dashboard, '--db-mono'), 'var(--font-mono)');
    assert.ok(read('dashboard.html').includes('href="tokens.css"'));
});

test('no page downloads fonts: the design system uses system fonts only', () => {
    for (const file of fs.readdirSync('front').filter((name) => /\.(css|html)$/.test(name)))
        assert.doesNotMatch(
            read(file),
            /@font-face|fonts\.googleapis\.com|fonts\.gstatic\.com/,
            file
        );
});
