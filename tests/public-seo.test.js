const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const express=require('express');

test('sitemap contém somente a home pública canônica, sem datas inventadas ou páginas privadas',()=>{
    const xml=fs.readFileSync('front/sitemap.xml','utf8');
    assert.match(xml,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    assert.deepEqual(urls,['https://portalarcadia.vercel.app/']);
    assert.doesNotMatch(xml,/<lastmod>/);
    const html=fs.readFileSync('front/index.html','utf8');
    const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
    assert.equal((head.match(/rel="canonical"/g)||[]).length,1);
    assert.match(head,/<link rel="canonical" href="https:\/\/portalarcadia.vercel.app\/"/);
    assert.doesNotMatch(head,/<meta[^>]*name="robots"[^>]*content="noindex/);
    for(const page of ['privacy','terms','cookies'])
        assert.match(fs.readFileSync(`front/${page}.html`,'utf8'),/name="robots" content="noindex"/);
});

test('arquivos de descoberta são públicos e servidos pelo Express com status e MIME adequados',async t=>{
    const app=express();
    app.use(express.static(path.resolve('front')));
    const server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    const sitemap=await fetch(base+'/sitemap.xml');
    assert.equal(sitemap.status,200);
    assert.match(sitemap.headers.get('content-type'),/^(application|text)\/xml/);
    assert.equal(await sitemap.text(),fs.readFileSync('front/sitemap.xml','utf8'));
    const robots=await fetch(base+'/robots.txt');
    assert.equal(robots.status,200);
    assert.match(robots.headers.get('content-type'),/^text\/plain/);
    assert.match(await robots.text(),/^Sitemap: https:\/\/portalarcadia.vercel.app\/sitemap.xml$/m);
    const home=await fetch(base+'/');
    assert.equal(home.status,200);
    assert.match(await home.text(),/name="google-site-verification"/);
});
