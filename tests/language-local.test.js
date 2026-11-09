const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('frontend/js/idioma.js', 'utf8');
function fixture(native = true) {
    let observer, writes = 0;
    const events = {}, store = new Map();
    const element = () => ({ nodeType:1, isConnected:true, classList:{remove(){}},
        closest:()=>null, matches:()=>false, hasAttribute:()=>false, append(){}, replaceChildren(){}, setAttribute(){}, querySelector:()=>null });
    const text = value => {
        let current = value;
        return { nodeType:3, isConnected:true, parentElement:element(),
            get textContent(){return current;},
            set textContent(next){current=next; if (++writes > 30) throw Error('Ciclo de tradução');
                if(observer) queueMicrotask(()=>observer([{type:'characterData',target:this}]));}
        };
    };
    const nodes = [text('Tarefas desta semana'), text('Conteúdo livre da publicação')];
    const document = { title:'Meu painel', body:element(), documentElement:{classList:{remove(){}}},
        querySelector:()=>null, querySelectorAll:()=>[], getElementById:()=>null,
        createElement:()=>element(), createTreeWalker:()=>{let i=0;return {nextNode:()=>nodes[i++]||null};},
        addEventListener(){} };
    const window = { addEventListener:(name,fn)=>{events[name]=fn;}, dispatchEvent(){},
        ...(native ? {Translator:{ availability:async()=> 'available', create:async({targetLanguage})=>({translate:async value=>targetLanguage+': '+value,destroy(){}})}} : {}) };
    vm.runInNewContext(source, {window,document,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
        NodeFilter:{SHOW_TEXT:4,SHOW_ELEMENT:1},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},
        CustomEvent:class{},console,Promise,Map,WeakMap,queueMicrotask});
    return {api:window.ArcadiaI18n,nodes,store,writes:()=>writes};
}
const settle = async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
test('interface, datas e contadores alternam PT/EN/ES sem depender do motor local', async()=>{
    const f=fixture(false);
    f.api.definir('en');
    assert.equal(f.nodes[0].textContent,'Tasks this week');
    assert.equal(f.api.t('domingo, 8 de novembro'),'Sunday, November 8');
    assert.equal(f.api.t('em 23 dias'),'in 23 days');
    f.api.definir('es');
    assert.equal(f.nodes[0].textContent,'Tareas de esta semana');
    assert.equal(f.api.t('1 aviso novo'),'1 aviso nuevo');
    assert.equal(f.api.t('Terça'),'Martes');
    assert.equal(f.api.t('DEZ'),'DIC');
    assert.equal(f.api.t('Domingo: hoje'),'Domingo: hoy');
    assert.equal(f.store.get('arcadia-lang'),'es');
    f.api.definir('pt');
    assert.equal(f.nodes[0].textContent,'Tarefas desta semana');
    assert.equal(f.nodes[1].textContent,'Conteúdo livre da publicação');
    await settle();
});
test('tradução local preserva o original e não entra em ciclo ao observar o próprio resultado', async()=>{
    const f=fixture();
    f.api.definir('en'); await settle();
    assert.equal(f.nodes[1].textContent,'en: Conteúdo livre da publicação');
    assert.ok(f.writes()<12);
    f.api.definir('es'); await settle();
    assert.equal(f.nodes[1].textContent,'es: Conteúdo livre da publicação');
    f.api.definir('pt'); await settle();
    assert.equal(f.nodes[1].textContent,'Conteúdo livre da publicação');
});
