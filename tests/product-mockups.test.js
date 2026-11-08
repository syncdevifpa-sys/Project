const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('guia separado usa fotos locais, exemplo identificado e conserva os mockups sem conteúdo executável', () => {
    const html=fs.readFileSync('frontend/tutorial.html','utf8');
    const photos=[...html.matchAll(/<img\b[^>]*src="(assets\/[^"<>]+)"[^>]*>/g)];
    assert.ok(photos.length >= 4);
    for (const [tag, source] of photos) {
        assert.match(tag,/alt="[^"]+"/);
        assert.ok(fs.existsSync('frontend/'+source));
    }
    assert.match(html,/interface com dados de demonstração/);
    assert.doesNotMatch(html,/<script[^>]+src="https?:/i);
    for(const name of ['hero','notices','mobile','documents','calendar','projects']) {
        const svg=fs.readFileSync('frontend/illustrations/product/'+name+'.svg','utf8');
        assert.doesNotMatch(svg,/<script|<foreignObject|Ana Ribeiro|https?:\/\/(?!www\.w3\.org)/i);
        assert.match(svg,/demonstrativ/i);
        assert.ok(Buffer.byteLength(svg)<40000);
    }
});

test('etiqueta de matrícula vazia fica oculta sem remover os controles de foto', () => {
    const html=fs.readFileSync('frontend/settings.html','utf8');
    assert.match(html,/id="confProfileMatricula" hidden/);
    const script=html.match(/var matriculaTag = document[\s\S]*?matriculaTag\.hidden = [^;]+;/)[0];
    for(const value of ['',null,'   ','12345']) {
        const tag={};
        vm.runInNewContext(script,{sessao:{matricula:value},document:{getElementById:()=>tag}});
        assert.equal(tag.hidden,!String(value||'').trim());
    }
    for(const id of ['btnCamAlterarFoto','inputFotoPerfil','btnRemoverFoto']) assert.ok(html.includes('id="'+id+'"'));
});
