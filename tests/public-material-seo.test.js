const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createPublicNoticeRouter,renderSitemap}=require('../backend/src/routes/public-notice.routes');
test('projetos e documentos públicos entregam título, texto e metadados; os restritos não vazam',async t=>{
 const projects={1:{id_projeto:1,titulo:'Robótica & campus',descricao:'[alinhar=justify]**Pesquisa** para estudantes[/alinhar]',aprovacao:'aprovado',visibilidade:'publico',capa:'data:image/png;base64,aGVsbG8='},2:{id_projeto:2,titulo:'Projeto secreto',descricao:'Descrição secreta',aprovacao:'aprovado',visibilidade:'privado'}};
 const docs={3:{id_item:3,titulo:'Guia do campus',descricao:'Documento com orientações',tipo:'arquivo',visibilidade:'publico'},4:{id_item:4,titulo:'Material secreto',descricao:'Texto restrito',visibilidade:'campus'}};
 const library={publicList:async()=>Object.values(docs),readable:async(_,id)=>docs[id]};
 const app=express();app.use(createPublicNoticeRouter({listNotices:async()=>[]},'https://portal.example',{listProjects:async()=>Object.values(projects),findProjectById:async id=>projects[id]},library));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r)}));const base='http://127.0.0.1:'+server.address().port;
 const html=await (await fetch(base+'/project.html?id=1')).text();assert.match(html,/<title>Robótica &amp; campus · Arcádia<\/title>/);assert.match(html,/og:image.*projetos\/1\/capa/);assert.match(html,/<div class="body"[^>]*><p>Pesquisa para estudantes/);assert.doesNotMatch(html,/\[\/?alinhar/);
 assert.equal((await fetch(base+'/projetos/1/capa')).status,200);assert.equal((await fetch(base+'/projetos/2/capa')).status,404);
 const privateHTML=await(await fetch(base+'/project.html?id=2')).text();assert.match(privateHTML,/noindex,nofollow/);assert.doesNotMatch(privateHTML,/Projeto secreto|Descrição secreta/);
 const document=await(await fetch(base+'/documents.html?material=3')).text();assert.match(document,/<title>Guia do campus · Documentos · Arcádia<\/title>/);assert.match(document,/data-document-search-result/);assert.match(document,/material=3&amp;busca=Guia%20do%20campus/);
 const restricted=await fetch(base+'/documents.html?material=4');assert.equal(restricted.status,404);assert.doesNotMatch(await restricted.text(),/Material secreto|Texto restrito/);
 const xml=await(await fetch(base+'/sitemap.xml')).text();assert.match(xml,/project.html\?id=1/);assert.match(xml,/documents.html\?material=3&amp;busca=/);assert.doesNotMatch(xml,/material=4|id=2/);
});
