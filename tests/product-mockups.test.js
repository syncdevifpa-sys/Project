const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('apresentação usa seis mockups atuais, acessíveis, sem dados reais nem scripts externos', () => {
    const html=fs.readFileSync('front/index.html','utf8');
    const matches=[...html.matchAll(/<img\b[^>]*src="illustrations\/product\/([^"/]+)\.svg"[^>]*>/g)];
    assert.equal(matches.length,6);
    for(const [tag,name] of matches) {
        assert.match(tag,/alt="[^"]*demonstrativ/i);
        assert.match(tag,/decoding="async"/);
        const svg=fs.readFileSync('front/illustrations/product/'+name+'.svg','utf8');
        assert.doesNotMatch(svg,/<script|<foreignObject|Ana Ribeiro|https?:\/\/(?!www\.w3\.org)/i);
        assert.match(svg,/demonstrativ/i);
        assert.ok(Buffer.byteLength(svg)<40000);
        if(name!=='mobile') assert.match(svg,/Avisos e notícias/);
    }
});
test('etiqueta de matrícula vazia fica oculta sem remover os controles de foto', () => {
    const html=fs.readFileSync('front/settings.html','utf8');
    assert.match(html,/id="confProfileMatricula" hidden/);
    const script=html.match(/var matriculaTag = document[\s\S]*?matriculaTag\.hidden = [^;]+;/)[0];
    for(const value of ['',null,'   ','12345']) {
        const tag={};
        vm.runInNewContext(script,{sessao:{matricula:value},document:{getElementById:()=>tag}});
        assert.equal(tag.hidden,!String(value||'').trim());
    }
    for(const id of ['btnCamAlterarFoto','inputFotoPerfil','btnRemoverFoto']) assert.ok(html.includes('id="'+id+'"'));
});
