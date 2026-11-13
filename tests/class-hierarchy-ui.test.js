const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
class Element {
 constructor(tag,text,cls){this.tag=tag;this.text=text;this.className=cls;this.children=[];this.dataset={};this.events={};this.attributes={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(key,fn){this.events[key]=fn;}
}
function fixture(){
 const nav=new Element('nav'), calls=[];
 const subjects=[
  {id_turma:1,id_disciplina:10,turma:'A',ano_ingresso:2024,curso:'DS',ano_letivo:2026,regime_letivo:'semestral',semestre:1,nome:'Redes'},
  {id_turma:1,id_disciplina:11,turma:'A',ano_ingresso:2024,curso:'DS',ano_letivo:2026,regime_letivo:'semestral',semestre:2,nome:'Banco de dados'},
  {id_turma:2,id_disciplina:20,turma:'B',ano_ingresso:2025,curso:'DS',ano_letivo:2026,regime_letivo:'semestral',semestre:2,nome:'Matemática'}
 ];
 const source=fs.readFileSync('frontend/js/classes.js','utf8');
 const part=source.slice(source.indexOf('    const navigationState ='),source.indexOf('    function renderInvites()'));
 const context=vm.createContext({A:{auth:{getSessao:()=>({id_usuario:9})}},sessionStorage:{getItem:()=>null,setItem(){}},selected:11,data:{subjects,role:'discente',canAdminister:false},q:()=>nav,el:(...a)=>new Element(...a),periodKey:r=>r.ano_letivo+'.'+r.semestre,periodLabel:r=>r.ano_letivo+'.'+r.semestre,load:id=>calls.push(['subject',id]),loadCohort:(id,period)=>calls.push(['cohort',id,period]),subjectChoice:(title,meta,fn,active)=>Object.assign(new Element('button',title),{onclick:fn,active})});
 vm.runInContext(part,context);context.selected=11;context.renderSubjects();return{context,nav,calls};
}
test('árvore separa duas turmas e períodos sem misturar disciplinas ou visão agregada',()=>{
 const {nav,calls}=fixture();const [a,b]=nav.children;
 assert.equal(a.children[0].children[0].text,'A · 2024');
 assert.equal(b.children[0].children[0].text,'B · 2025');
 const firstPeriod=a.children[1].children[1],secondPeriod=a.children[2].children[1],other=b.children[1].children[1];
 assert.deepEqual(firstPeriod.children.map(n=>n.text),['Todas as disciplinas','Banco de dados']);
 assert.deepEqual(secondPeriod.children.map(n=>n.text),['Todas as disciplinas','Redes']);
 assert.deepEqual(other.children.map(n=>n.text),['Todas as disciplinas','Matemática']);
 firstPeriod.children[0].onclick();other.children[1].onclick();
 assert.deepEqual(calls,[['cohort',1,'2026.2'],['subject',20]]);
 assert.equal(firstPeriod.children[1].active,true);
});
test('recolher uma turma preserva seu estado ao renderizar novamente e usa details nativo',()=>{
 const {context,nav}=fixture();const a=nav.children[0];assert.equal(a.tag,'details');assert.equal(a.open,true);
 a.open=false;a.events.toggle();context.renderSubjects();assert.equal(nav.children[0].open,false);
 assert.equal(nav.children[0].children[0].tag,'summary');
});
