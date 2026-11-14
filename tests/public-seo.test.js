const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const express=require('express');
const {createPublicNoticeRouter,renderSitemap}=require('../backend/src/routes/public-notice.routes');

test('sitemap inclui notícias públicas e exclui rascunhos e conteúdo restrito',()=>{
    const xml=renderSitemap([
        {id_aviso:4,titulo:'Extensão no campus',situacao:'publicado',publico_alvo:'todos'},
        {id_aviso:5,titulo:'Reservado',situacao:'publicado',publico_alvo:'docente'},
        {id_aviso:6,titulo:'Rascunho',situacao:'rascunho',publico_alvo:'todos'}
    ]);
    assert.match(xml,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    assert.deepEqual(urls,['https://portalarcadia.vercel.app/','https://portalarcadia.vercel.app/noticias/4/extensao-no-campus']);
    assert.doesNotMatch(xml,/<lastmod>/);
    const html=fs.readFileSync('frontend/index.html','utf8');
    const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
    assert.equal((head.match(/rel="canonical"/g)||[]).length,1);
    assert.match(head,/<link rel="canonical" href="https:\/\/portalarcadia.vercel.app\/"/);
    assert.match(head,/<title>Arcádia — Projeto acadêmico do IFPA Campus Belém | Mural de apoio<\/title>/);
    assert.match(head,/<meta name="description" content="Arcádia é um projeto acadêmico do IFPA Campus Belém,/);
    assert.match(html,/Mural de apoio à comunidade do campus\. Não é um canal oficial da instituição\./);
    assert.doesNotMatch(head,/<meta[^>]*name="robots"[^>]*content="noindex/);
    for(const page of ['privacy','terms','cookies'])
        assert.match(fs.readFileSync(`frontend/${page}.html`,'utf8'),/name="robots" content="noindex"/);
});

test('arquivos de descoberta são públicos e servidos pelo Express com status e MIME adequados',async t=>{
    const app=express();
    app.use(createPublicNoticeRouter({listNotices:async()=>[]}));
    app.use(express.static(path.resolve('frontend')));
    const server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    const sitemap=await fetch(base+'/sitemap.xml');
    assert.equal(sitemap.status,200);
    assert.match(sitemap.headers.get('content-type'),/^(application|text)\/xml/);
    assert.equal(await sitemap.text(),renderSitemap([]));
    const robots=await fetch(base+'/robots.txt');
    assert.equal(robots.status,200);
    assert.match(robots.headers.get('content-type'),/^text\/plain/);
    assert.match(await robots.text(),/^Sitemap: https:\/\/portalarcadia.vercel.app\/sitemap.xml$/m);
    const home=await fetch(base+'/');
    assert.equal(home.status,200);
    assert.match(await home.text(),/name="google-site-verification"/);
});


test('sitemap usa data real da publicação e retorna indisponibilidade quando a consulta falha', async t => {
    const xml=renderSitemap([{id_aviso:7,titulo:'Notícia',situacao:'publicado',publico_alvo:'externo',atualizado_em:'2026-11-14T12:00:00Z'}]);
    assert.match(xml, /<lastmod>2026-11-14T12:00:00.000Z<\/lastmod>/);
    const app=express();
    app.use(createPublicNoticeRouter({listNotices:async()=>{throw Error('banco indisponível');}}));
    const server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/sitemap.xml');
    assert.equal(response.status,503);
    assert.equal(response.headers.get('cache-control'),'no-store');
});


test('sitemap inclui somente projetos aprovados e públicos',()=>{
    const xml=renderSitemap([], 'https://portalarcadia.vercel.app', [
        {id_projeto:2,aprovacao:'aprovado',visibilidade:'publico'},
        {id_projeto:3,aprovacao:'aprovado',visibilidade:'privado'},
        {id_projeto:4,aprovacao:'pendente',visibilidade:'publico'}
    ]);
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
    assert.deepEqual(urls,['https://portalarcadia.vercel.app/','https://portalarcadia.vercel.app/project.html?id=2']);
});
