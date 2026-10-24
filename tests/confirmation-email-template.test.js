const { test } = require('node:test');
const assert = require('node:assert/strict');
const { confirmationHTML } = require('../backend/src/services/email-templates.service');

test('confirmação tem botão e alternativa curtos com o mesmo link íntegro e sem URL visível', () => {
    const url = new URL('https://portal.example.test/verify-email.html');
    url.hash = new URLSearchParams({ token: 'b'.repeat(64) }).toString();
    const html = confirmationHTML(url);
    const links = [...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    assert.equal(links.length, 2);
    assert.deepEqual(links.map(match => match[1]), [url.href, url.href]);
    assert.deepEqual(links.map(match => match[2]), ['Confirmar e-mail', 'Abrir confirmação']);
    const visible = html.replace(/<[^>]+>/g, '');
    assert.ok(!visible.includes(url.href));
    assert.ok(!visible.includes('b'.repeat(64)));
    assert.match(visible, /30 minutos/);
    assert.match(visible, /só pode ser utilizado uma vez/);
    assert.match(visible, /Na página, clique em/);
    assert.match(visible, /não solicitou.*ignore/);
    assert.match(html, /background-color:#1b4332;color:#ffffff/);
    assert.match(html, /padding:14px 24px/);
    assert.doesNotMatch(html, /<script|<form|<img|@import|onclick|http-equiv="refresh"/i);
});

test('URL interpolada é escapada como atributo, sem permitir markup ou requisições externas adicionais', () => {
    const html = confirmationHTML({ href: 'https://portal.example.test/verify-email.html?x="<test>&y=\'value\'' });
    assert.ok(html.includes('x=&quot;&lt;test&gt;&amp;y=&#39;value&#39;'));
    assert.ok(!html.includes('<test>'));
    assert.equal((html.match(/href=/g) || []).length, 2);
});
