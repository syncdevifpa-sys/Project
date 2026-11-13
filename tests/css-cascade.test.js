const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const policy=require('../frontend/js/banner-preferences');
test('degradê intenso acompanha o tema, preserva cor e contraste, sem mudar o modo liso',()=>{
 const base={mode:'custom',background:'#c6f36b',text:'#182020',gradient:true,gradientStrength:'heavy'};
 assert.equal(policy.resolve(base).gradientStrength,'heavy');
 const light=policy.backgroundCSS({...base,theme:'light'}),dark=policy.backgroundCSS({...base,theme:'dark'});
 assert.notEqual(light,dark);assert.ok(light.includes(base.background));assert.ok(dark.includes(base.background));
 for(const css of [light,dark]) for(const color of css.match(/#[a-f0-9]{6}/g)) assert.ok(policy.contrast(color,base.text)>=4.5);
 assert.equal(policy.backgroundCSS({...base,gradient:false}),base.background);
});
test('páginas usam somente estilos existentes, sem folhas repetidas ou tema studio sobreposto',()=>{
 for(const file of fs.readdirSync('frontend').filter(n=>n.endsWith('.html'))){
  const html=fs.readFileSync('frontend/'+file,'utf8');
  const css=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
  assert.equal(new Set(css).size,css.length,file);
  assert.ok(!css.includes('portal-studio.css'),file);
  for(const path of css) assert.ok(fs.existsSync('frontend/'+path),file+': '+path);
  if(css.includes('notice-cover.css')&&css.includes('theme-options.css')) assert.ok(css.indexOf('notice-cover.css')>css.indexOf('theme-options.css'),file);
  if(file!=='settings.html')assert.ok(!css.includes('settings-profile.css'),file);
 }
});

const vm = require('node:vm');
test('barra superior inicia com o documento, sem aguardar imagens no evento load', () => {
 const source = fs.readFileSync('frontend/js/topbar.js', 'utf8');
 for (const readyState of ['loading', 'interactive', 'complete']) {
  const events = new Map(); let mounts = 0;
  const document = { readyState, addEventListener: (name, fn) => events.set(name, fn), querySelector: () => { mounts++; return null; } };
  vm.runInNewContext(source, { document, window: { addEventListener: (name) => { throw new Error('A barra não deve aguardar '+name); } } });
  if (readyState === 'loading') { assert.equal(mounts, 0); events.get('DOMContentLoaded')(); }
  assert.equal(mounts, 1, readyState);
 }
 assert.ok(!fs.readFileSync('frontend/settings.html','utf8').includes('js/settings-sidebar.js'));
});
