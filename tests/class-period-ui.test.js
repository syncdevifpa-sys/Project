const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(subject,legacy=false){
 const nodes=[];
 const node=tag=>({tag,children:[],events:{},value:'',attributes:{},append(...items){this.children.push(...items);for(const item of items)item.parentElement=this;},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.events[k]=fn;}});
 const A={};vm.runInNewContext(fs.readFileSync('front/js/class-period.js','utf8'),{window:{Arcadia:A},document:{createElement:node}});
 const editor={fields:node('div'),field(label,options={}){const wrap=node('label'),input=node('input');Object.assign(input,options);input.label=label;wrap.append(input);this.fields.append(wrap);nodes.push(input);return input;},select(label,options,value){const wrap=node('label'),input=node('select');Object.assign(input,{label,options,value:String(value)});wrap.append(input);this.fields.append(wrap);nodes.push(input);return input;}};
 return {fields:A.classPeriod.fields(editor,subject,legacy),nodes};
}
test('formulário exige semestre somente no regime semestral e mostra confirmação ao mudar legado',()=>{
 const f=fixture({ano_letivo:2026,regime_letivo:'legado',semestre:0},true),[year,regime,semester,,]=f.nodes,confirm=f.nodes.at(-1);
 assert.equal(semester.disabled,true);assert.deepEqual(JSON.parse(JSON.stringify(f.fields.read())),{});
 regime.value='semestral';regime.events.change();assert.equal(semester.required,true);assert.equal(semester.parentElement.hidden,false);assert.throws(()=>f.fields.read(),/semestre/);
 semester.value='2';semester.events.change();assert.equal(confirm.required,true);assert.throws(()=>f.fields.read(),/Confirme/);confirm.checked=true;
 assert.deepEqual(JSON.parse(JSON.stringify(f.fields.read())),{ano_letivo:2026,regime_letivo:'semestral',semestre:2,periodo_anterior:'2026.legado',confirmar_periodo:true});
 regime.value='anual';regime.events.change();assert.equal(semester.required,false);assert.equal(f.fields.read().semestre,0);
});
test('cadastro não presume regime ou semestre; edição preenche 2026.1',()=>{
 const create=fixture({ano_letivo:2026});assert.throws(()=>create.fields.read(),/regime/);
 const edit=fixture({ano_letivo:2026,regime_letivo:'semestral',semestre:1},true);assert.equal(edit.fields.read().semestre,1);assert.equal(edit.nodes[2].required,true);
 const html=fs.readFileSync('front/classes.html','utf8');assert.ok(html.indexOf('js/class-period.js')<html.indexOf('js/classes.js'));
});
