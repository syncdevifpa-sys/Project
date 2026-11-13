const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'), fs=require('node:fs');
function setup(){
 const node=tag=>({tag,style:{},children:[],textContent:'',attrs:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attrs[k]=v}});
 const A={};vm.runInNewContext(fs.readFileSync('frontend/js/notice-text.js','utf8'),{window:{Arcadia:A},document:{createElement:node},URL});
 return {A,target:node('div')};
}
const walk=n=>[n,...n.children.flatMap(walk)];
test('formatação restrita preserva ênfase, cor e tópicos sem interpretar HTML',()=>{
 const {A,target}=setup();
 A.noticeText.render(target,'**Importante** _destaque_ __leitura__ [cor=#174c66]azul[/cor]\n- Um\n- Dois\n<img src=x onerror=alert(1)> [cor=red]inválido[/cor]');
 const nodes=walk(target);
 for(const tag of ['strong','em','u'])assert.ok(nodes.some(n=>n.tag===tag));
 assert.ok(nodes.some(n=>n.style.color==='#174c66'));
 assert.equal(nodes.filter(n=>n.attrs.role==='listitem').length,2);
 assert.equal(nodes.some(n=>['img','script'].includes(n.tag)),false);
 assert.ok(nodes.some(n=>n.textContent.includes('[cor=red]')));
});
test('links com sublinhados continuam íntegros na publicação formatada',()=>{
 const {A,target}=setup();
 A.noticeText.render(target,'https://example.test/arquivo_com_nome **Leia**');
 assert.equal(walk(target).find(n=>n.tag==='a').href,'https://example.test/arquivo_com_nome');
});
test('alinhamento permite somente opções conhecidas e conserva a formatação interna',()=>{
 for(const alignment of ['left','center','right','justify']){
  const {A,target}=setup();
  A.noticeText.render(target,'[alinhar='+alignment+']**Título**\nTexto do parágrafo.[/alinhar]');
  const nodes=walk(target);
  assert.ok(nodes.some(n=>n.style.textAlign===alignment));
  assert.ok(nodes.some(n=>n.tag==='strong'));
 }
 const {A,target}=setup();
 A.noticeText.render(target,'[alinhar=expression(alert(1))]texto[/alinhar]');
 assert.equal(walk(target).some(n=>n.style.textAlign),false);
});
