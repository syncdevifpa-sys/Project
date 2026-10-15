const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('front/js/avatar-editor.js','utf8');
const {validateProfilePhoto}=require('../backend/src/services/profile-photo.service');
function editor(){
    let dialog,revoked=0;
    const context={window:{Arcadia:{}},URL:{createObjectURL:()=> 'blob:teste',revokeObjectURL:()=>revoked++},Image:class{naturalWidth=1200;naturalHeight=800;async decode(){}},document:{body:{append(){}},createElement(){
        const fields={};
        for(const key of ['canvas','[name=zoom]','[name=horizontal]','[name=vertical]','[data-avatar-reset]','[data-avatar-cancel]','[data-avatar-confirm]'])fields[key]={value:key.includes('zoom')?'1':'50',events:{},addEventListener(type,fn){this.events[type]=fn;},getContext:()=>({fillRect(){},drawImage(){}}),getBoundingClientRect:()=>({width:320}),toDataURL:()=> 'data:image/jpeg;base64,/9j/AA=='};
        dialog={events:{},setAttribute(){},querySelector:key=>fields[key],addEventListener(type,fn){this.events[type]=fn;},showModal(){},close(){this.events.close();},remove(){this.removed=true;},fields};return dialog;
    }}};
    vm.runInNewContext(code,context);return {A:context.window.Arcadia,getDialog:()=>dialog,revoked:()=>revoked};
}
test('enquadramento fica dentro da imagem em formatos e limites de zoom/posição',()=>{
    const {A}=editor();
    for(const [w,h] of [[1200,800],[800,1200],[800,800]])for(const zoom of [1,2,3])for(const x of [0,50,100])for(const y of [0,50,100]){
        const crop=A.avatarCrop(w,h,zoom,x,y);
        assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.size<=w+0.001&&crop.y+crop.size<=h+0.001);
    }
});
test('cancelar devolve nenhuma foto; confirmar entrega apenas o recorte e libera a prévia',async()=>{
    for(const confirm of [false,true]){
        const {A,getDialog,revoked}=editor();
        const result=A.editAvatar({type:'image/png',size:1234});await new Promise(resolve=>setImmediate(resolve));
        const dialog=getDialog();dialog.fields[confirm?'[data-avatar-confirm]':'[data-avatar-cancel]'].events.click();
        assert.equal(await result,confirm?'data:image/jpeg;base64,/9j/AA==':null);
        assert.equal(dialog.removed,true);assert.equal(revoked(),1);
    }
});
test('editor recusa formato não suportado e tamanho excessivo antes de abrir',async()=>{
    const {A,getDialog}=editor();
    await assert.rejects(A.editAvatar({type:'image/svg+xml',size:100}));
    await assert.rejects(A.editAvatar({type:'image/png',size:6*1024*1024}));
    assert.equal(getDialog(),undefined);
});
test('API aceita foto raster pequena/remoção e recusa URL, assinatura inválida ou excesso',()=>{
    validateProfilePhoto({foto:''});validateProfilePhoto({foto:'data:image/jpeg;base64,/9j/AA=='});
    for(const foto of ['https://example.test/photo.png','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,AAAA','data:image/jpeg;base64,'+'A'.repeat(750000)])assert.throws(()=>validateProfilePhoto({foto}),e=>e.status===400);
});
