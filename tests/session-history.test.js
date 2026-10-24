const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function browser({page='dashboard.html',token='one',status=200,external=false}={}) {
    const handlers={},stored=new Map(token?[['arcadiaToken',token],['arcadiaSessao',JSON.stringify({logado:true,tipo_usuario:external?'externo':'discente'})]]:[]);
    const redirects=[],calls=[],body={replaceChildren(){this.cleared=true;}},root={style:{}};
    const location={hostname:'portal.example',origin:'https://portal.example',pathname:'/'+page,replace:p=>redirects.push(p),reload:()=>redirects.push('reload')};
    const window={Arcadia:{},location,addEventListener:(name,fn)=>handlers[name]=fn};
    vm.runInNewContext(fs.readFileSync('front/js/api.js','utf8'),{window,location,document:{body,documentElement:root},
        localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
        fetch:async(url,options)=>{calls.push({url,options});return{ok:status===200,status,json:async()=>({private:'data'})};}});
    return{window,handlers,stored,redirects,calls,body,root};
}
test('acesso direto privado exige token; política e termos continuam públicos',()=>{
    assert.deepEqual(browser({token:null}).redirects,['login.html']);
    for(const page of ['privacy.html','terms.html','cookies.html','login.html'])
        assert.deepEqual(browser({page,token:null}).redirects,[]);
});

test('Configurações externas tem destino próprio e permanece no destino após refresh e histórico',async()=>{
    const redirected=browser({page:'settings.html',external:true});
    assert.deepEqual(redirected.redirects,['community-settings.html']);
    const settings=browser({page:'community-settings.html',external:true});
    assert.deepEqual(settings.redirects,[]);
    await settings.handlers.pageshow({persisted:true});
    assert.deepEqual(settings.redirects,[]);
    assert.match(settings.calls[0].url,/\/api\/external\/me$/);
    assert.deepEqual(browser({page:'community-settings.html',token:null}).redirects,['login.html']);
    assert.deepEqual(browser({page:'settings.html'}).redirects,[]);
});
test('histórico depois de logout descarta dados sem consultar API com token antigo',async()=>{
    const b=browser();b.handlers.pagehide();assert.equal(b.root.style.visibility,'hidden');
    b.stored.clear();await b.handlers.pageshow({persisted:true});
    assert.equal(b.body.cleared,true);assert.deepEqual(b.redirects,['login.html']);assert.equal(b.calls.length,0);
});
test('restauração valida sessão no servidor antes de mostrar dados; revogação bloqueia',async()=>{
    const b=browser();b.handlers.pagehide();await b.handlers.pageshow({persisted:true});
    assert.match(b.calls[0].url,/\/api\/auth\/perfil$/);assert.equal(b.calls[0].options.cache,'no-store');
    assert.equal(b.root.style.visibility,'');assert.deepEqual(b.redirects,[]);
    const revoked=browser({status:401});revoked.handlers.pagehide();await revoked.handlers.pageshow({persisted:true});
    assert.equal(revoked.body.cleared,true);assert.equal(revoked.stored.has('arcadiaToken'),false);
});
test('logout em outra aba ou troca de conta apaga imediatamente a tela anterior',()=>{
    const b=browser();b.stored.set('arcadiaToken','two');b.handlers.storage({key:'arcadiaToken'});
    assert.equal(b.body.cleared,true);assert.deepEqual(b.redirects,['login.html']);
});

test('resposta Google pendente não restaura sessão depois de logout',async()=>{
    const stored=new Map(),events=[],calls=[];let resolveGoogle;
    const window={Arcadia:{token:{get:()=>stored.get('arcadiaToken'),set:t=>stored.set('arcadiaToken',t),clear:()=>stored.delete('arcadiaToken')},
        api:{post:path=>{calls.push(path);return path==='/api/auth/google'?new Promise(r=>resolveGoogle=r):Promise.resolve({ok:true});}}},
        google:{accounts:{id:{cancel:()=>events.push('cancel'),disableAutoSelect:()=>events.push('disable')}}},location:{replace:p=>events.push(p)}};
    vm.runInNewContext(fs.readFileSync('front/js/auth.js','utf8'),{window,console,
        localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
        sessionStorage:{setItem(){},removeItem(){}},document:{readyState:'loading',addEventListener(){},body:{replaceChildren:()=>events.push('clear')}}});
    const login=window.Arcadia.auth.completeGoogleAuth('a.b.c','d.e.f');
    await window.Arcadia.auth.logout();
    resolveGoogle({ok:true,data:{token:'old',user:{tipo_usuario:'discente'}}});
    await assert.rejects(login,/cancelada ao sair/);
    assert.equal(stored.has('arcadiaToken'),false);
    assert.deepEqual(events,['cancel','disable','clear','login.html']);
});
