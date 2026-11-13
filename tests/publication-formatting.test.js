const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function setup(){const A={};const node=tag=>({tag,style:{},children:[],textContent:'',append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(k,v){this[k]=v}});vm.runInNewContext(fs.readFileSync('frontend/js/notice-text.js','utf8'),{window:{Arcadia:A},document:{createElement:node},URL});return{A,node};}
test('formatação renderiza títulos de seção e lista numerada sem executar HTML',()=>{
 const {A,node}=setup(),host=node('div');
 A.noticeText.render(host,'## Sobre o evento\nTexto de apresentação.\n1. Primeiro item\n2. Segundo item\n### Informações\n<img src=x onerror=alert(1)>');
 assert.ok(host.children.some(n=>n.tag==='h2'));
 assert.ok(host.children.some(n=>n.tag==='h3'));
 const list=host.children.find(n=>n.className==='ar-text-list ar-text-list--numbered');
 assert.equal(list.children.length,2);
 assert.equal(list.children[0].children[0].textContent,'Primeiro item');
 assert.ok(!host.children.some(n=>n.tag==='img'));
});
test('ícones da barra superior têm dimensões próprias, mesmo antes de aplicar CSS',()=>{
 const source=fs.readFileSync('frontend/js/topbar.js','utf8');
 for(const [tag] of source.matchAll(/<svg\b[^>]*>/g)){assert.match(tag,/width="18"/);assert.match(tag,/height="18"/);}
});
test('conversão conserva espaços, parágrafos e linha vazia, sem juntar palavras',()=>{
 const {A}=setup();
 const text=value=>({nodeType:3,textContent:value});
 const element=(tag,childNodes=[],style={})=>({nodeType:1,tagName:tag.toUpperCase(),childNodes,style,getAttribute(){return null},classList:{contains(){return false}}});
 const root=element('div',[text('Primeira\u00a0linha.'),element('div',[text('Segunda linha.')]),element('div',[element('br')],{textAlign:'justify'}),element('div',[text('Terceira linha.')])]);
 assert.equal(A.noticeText.serializeEditor(root),'Primeira linha.\nSegunda linha.\n\nTerceira linha.');
 const bold=element('b',[text('uma\nduas')]);
 assert.equal(A.noticeText.serializeEditor(element('div',[bold])),'**uma**\n**duas**');
});
test('alinhamentos e cores aninhados não deixam comandos internos visíveis',()=>{
 const {A,node}=setup(),host=node('div');
 A.noticeText.render(host,'[alinhar=left][alinhar=justify][cor=#123456]duas palavras[/cor][/alinhar][/alinhar]');
 const leaves=n=>[n.textContent,...n.children.flatMap(leaves)].join('');
 assert.equal(leaves(host),'duas palavras');
 assert.equal(host.children[0].style.textAlign,'left');
 assert.equal(host.children[0].children[0].style.textAlign,'justify');
});

