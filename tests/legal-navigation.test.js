const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function legal(referrer,saved) {
    const values=new Map(saved?[['arcadiaLegalReturn',saved]]:[]),links=[];
    const element=()=>({append(){},setAttribute(){},addEventListener(){},querySelectorAll:()=>[]});
    const window={};window.self=window;window.top=window;
    vm.runInNewContext(fs.readFileSync('front/js/privacy-notice.js','utf8'),{window,URL,
        location:{origin:'https://portal.example',pathname:'/privacy.html'},
        document:{referrer,createElement:element,body:element(),addEventListener(){},querySelector:s=>s==='header nav'?{prepend:l=>links.push(l)}:element()},
        localStorage:{getItem:()=>null},sessionStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}});
    return links;
}
test('política retorna somente à página local permitida, descartando query e fragmento',()=>{
    assert.equal(legal('https://portal.example/settings.html?redirect=https://evil.example#private')[0].href,'settings.html');
    assert.equal(legal('', 'tasks.html')[0].href,'tasks.html');
});
test('política não aceita origem externa nem destino manipulado para retorno',()=>{
    assert.equal(legal('https://evil.example/settings.html').length,0);
    for(const path of ['//evil.example','https://evil.example','javascript:alert(1)','../settings.html'])
        assert.equal(legal('',path).length,0);
});
