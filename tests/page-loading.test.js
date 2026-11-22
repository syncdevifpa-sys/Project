const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('cada página entrega a proteção de carregamento antes dos arquivos externos',()=>{
 const source=fs.readFileSync('frontend/js/page-ready.js','utf8');
 const css=source.match(/style\.textContent = `([\s\S]*?)`;/)[1];
 for(const name of fs.readdirSync('frontend').filter(name=>name.endsWith('.html'))){
  const html=fs.readFileSync('frontend/'+name,'utf8');
  if(!html.includes('js/page-ready.js'))continue;
  const critical=html.match(/<style id="arcadia-critical-loader">([\s\S]*?)<\/style>/);
  assert.ok(critical,name);
  assert.equal(critical[1].replace(/\r\n/g,'\n'),css.replace(/\r\n/g,'\n'),name+' deve acompanhar a fonte compartilhada; execute node tools/sync-page-loader.cjs');
  assert.ok(html.indexOf(critical[0])<html.indexOf('<script src='),name);
  assert.ok(html.indexOf('<meta charset=')<1024,name);
  const attrs={};
  const boot=html.match(/<!-- arcadia-loader:start -->[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(boot,{document:{documentElement:{setAttribute:(k,v)=>attrs[k]=v}}});
  assert.equal(attrs['data-page-loading'],'true');
 }
});
