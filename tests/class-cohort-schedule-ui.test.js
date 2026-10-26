const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.events={};this.classList={add(){},toggle(){}};}
 append(...nodes){for(const n of nodes){this.children.push(n);if(typeof n==='object')n.parent=this;}}
 replaceChildren(...nodes){for(const n of this.children)if(typeof n==='object')n.parent=null;this.children=[];this.append(...nodes);}
 set textContent(v){this.text=v;this.replaceChildren();}get textContent(){return (this.text||'')+this.children.map(n=>typeof n==='object'?n.textContent:n).join(' ');}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){this.events[k]=fn;}
 querySelector(selector){return all(this).slice(1).find(n=>n.tag===selector)||null;}
 get isConnected(){return this.tag==='body'||!!this.parent?.isConnected;}
}
const all=n=>[n,...n.children.filter(c=>typeof c==='object').flatMap(all)];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('todas as disciplinas autorizadas da turma compartilham a grade, inclusive a sem horário próprio',async()=>{
 const body=new Element('body'),nodes=new Map();
 for(const id of ['classStatus','classCreate','classTabs','classSubjects','classContext','classContent','classInvites','classIntro','.ar-hero','.ar-hero-title']){const node=new Element('div');body.append(node);nodes.set(id,node);}
 const offers=[8,9,10,11].map(id=>({id_disciplina:id,id_turma:id===11?20:2,id_professor:1,nome:'Disciplina '+id,turma:'Turma real',ano_letivo:id===10?2025:2026,ano_ingresso:2024,regime_letivo:'anual',semestre:0,turno:'tarde',campus:'Belém',canManage:true}));
 const requested=[],grids=[],mounts=[];
 const A={auth:{estaLogado:()=>true,getSessao:()=>({id_usuario:1,tipo_usuario:'docente'})},classAppearance:{decorate(){}},classSchedule:{renderGrid:(host,rows)=>grids.push(rows),mount:(host,offer)=>mounts.push(offer)},api:{request:async path=>{
 requested.push(path);
 if(path==='/api/classes')return {subjects:offers,invites:[],role:'docente',canAdminister:false,canCreate:true};
 if(path.endsWith('/info'))return {};
 if(path.endsWith('/schedule'))return path.includes('/9/')?[{id_horario:30,id_disciplina:9,dia_semana:1,hora_inicio:'08:00',hora_fim:'09:00'}]:[];
 const id=Number(path.split('/').at(-1));return {subject:offers.find(o=>o.id_disciplina===id),posts:[],people:[],pending:[]};
 },expect:p=>p}};
 vm.runInNewContext(fs.readFileSync('front/js/classes.js','utf8'),{window:{Arcadia:A,addEventListener(){}},document:{body,createElement:tag=>new Element(tag),querySelector:s=>nodes.get(s.startsWith('#')?s.slice(1):s)||null,addEventListener(){}},Intl,Date,queueMicrotask});
 await settle();await settle();
 nodes.get('classTabs').children.find(n=>n.textContent==='Horários').onclick();await settle();
 assert.equal(mounts.at(-1).id_disciplina,8);assert.equal(grids.at(-1)[0].id_disciplina,9);
 assert.ok(!requested.some(p=>/\/(10|11)\/schedule/.test(p)));
 const choice=all(nodes.get('classSubjects')).find(n=>n.tag==='button'&&n.textContent.includes('Disciplina 9'));
 await choice.onclick();await settle();assert.equal(mounts.at(-1).id_disciplina,9);assert.equal(grids.at(-1)[0].id_disciplina,9);
 assert.equal(mounts.at(-1).showGrid,false);
});
