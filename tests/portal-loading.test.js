const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function bootstrap(stored,blocked=false) {
    const attrs={},timers=[];
    vm.runInNewContext(fs.readFileSync('front/js/portal-bootstrap.js','utf8'),{
        document:{documentElement:{setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],removeAttribute:k=>delete attrs[k]}},
        localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return stored[k]||null;}},
        window:{setTimeout:fn=>timers.push(fn)}
    });
    return{attrs,timers};
}
test('espaço da navegação é reservado antes do conteúdo e possui fallback quando JS não termina',()=>{
    const saved={'arcadiaToken':'token','arcadiaSessao':'{"tipo_usuario":"externo"}','arcadia-sidebar-collapsed':'1','arcadia-theme-accent':'cyan','arcadia-theme-text':'large'};
    const b=bootstrap(saved);
    assert.equal(b.attrs['data-sidebar-size'],'compact');assert.equal(b.attrs['data-portal-navigation'],'pending');assert.equal(b.attrs['data-text'],'large');
    b.attrs['data-portal-navigation']='ready';b.timers[0]();assert.equal(b.attrs['data-portal-layout'],'sidebar');
    const failed=bootstrap(saved);failed.timers[0]();assert.equal(failed.attrs['data-portal-layout'],undefined);
    assert.equal(bootstrap({}).attrs['data-portal-layout'],undefined);
    assert.equal(bootstrap({},true).timers.length,0);
});
test('estrutura externa tem um conteúdo principal, controles separados e carregamento sem ocultar a página',()=>{
    for(const page of ['community.html','community-settings.html']) {
        const html=fs.readFileSync('front/'+page,'utf8');
        assert.equal((html.match(/<main\b/g)||[]).length,1);
        assert.ok(html.indexOf('id="mainContent"')<html.indexOf('id="externalGreeting"'));
        assert.ok(html.indexOf('src="js/portal-bootstrap.js"')<html.indexOf('href="tokens.css"'));
        assert.match(html,/rel="preload"[^>]*Onest-Variable-latin\.woff2[^>]*crossorigin/);
        assert.match(html,/aria-busy="true"/);assert.doesNotMatch(html,/\sstyle="/);
        const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,page);
        assert.doesNotMatch(html,/href="(?:documents|people|classes|admin)\.html"/);
    }
    const panel=fs.readFileSync('front/community.html','utf8');
    assert.doesNotMatch(panel,/id="(?:teacherRequestForm|profileSharing|accountRemoval)"/);
    assert.match(fs.readFileSync('front/community-settings.html','utf8'),/id="teacherRequestForm"/);
});
