const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.attributes={};this.hidden=false;}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
 replaceChildren(...items){for(const child of this.children)child.parent=null;this.children=[];this.append(...items);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(){}
 focus(){this.focused=true;}
 get isConnected(){return this.tag==='body'||!!this.parent?.isConnected;}
 get textContent(){return (this.text||'')+this.children.map(c=>c.textContent).join(' ');}
 set textContent(text){this.text=text;this.replaceChildren();}
 checkValidity(){return true;}
}
const walk=root=>[root,...root.children.flatMap(walk)];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const body=new Element('body'),host=new Element('div');body.append(host);
 const requests=[],records=[];let failWrite=false,failRead=false;
 const A={api:{request:async(path,options)=>{
  requests.push({path,...options});
  if(options.method==='GET'){if(failRead)throw new Error('Falha de atualização');return records.map(r=>({...r}));}
  if(failWrite)throw new Error('Horário sobreposto');
  if(options.method==='POST')records.push({id_horario:30,versao:0,...options.body});
  if(options.method==='PUT')Object.assign(records[0],options.body,{versao:1});
  if(options.method==='DELETE')records.length=0;
  return {id_horario:30,message:'Horário salvo.'};
 },expect:promise=>promise},confirmAction:async()=>true};
 vm.runInNewContext(fs.readFileSync('front/js/class-schedule.js','utf8'),{window:{Arcadia:A},document:{body,readyState:'loading',addEventListener(){},createElement:tag=>new Element(tag)}});
 const mount=(id=8,manage=true)=>A.classSchedule.mount(host,{id_disciplina:id,nome:'Dados',ano_letivo:2026,regime_letivo:'legado',canManage:manage});
 const button=text=>walk(host).find(n=>n.tag==='button'&&n.textContent===text);
 const fill=()=>{const values={dia_semana:'1',hora_inicio:'08:00',hora_fim:'09:00',vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-31',sala:''};for(const input of walk(host).filter(n=>n.name))input.value=values[input.name];};
 const submit=()=>walk(host).find(n=>n.tag==='form').onsubmit({preventDefault(){}});
 return {host,requests,records,mount,button,fill,submit,renderGrid:A.classSchedule.renderGrid,setFailWrite:v=>failWrite=v,setFailRead:v=>failRead=v};
}
test('aba de horários cria, edita e retira na oferta correta com retorno visível',async()=>{
 const f=fixture();f.mount();await settle();f.fill();await f.submit();
 assert.match(f.host.textContent,/Horário salvo/);assert.equal(f.requests.find(r=>r.method==='POST').path,'/api/classes/8/schedule');
 f.button('Editar horário').onclick();assert.equal(f.button('Cancelar edição').hidden,false);
 await f.submit();const update=f.requests.find(r=>r.method==='PUT');assert.equal(update.path,'/api/classes/8/schedule/30');assert.equal(update.body.versao,0);
 await f.button('Retirar horário').onclick();assert.equal(f.records.length,0);assert.match(f.host.textContent,/retirado/);
});
test('falha ao salvar preserva formulário; gravação seguida de falha de leitura não é apresentada como perdida',async()=>{
 const f=fixture();f.mount();await settle();f.fill();f.setFailWrite(true);await f.submit();
 assert.match(f.host.textContent,/Horário sobreposto/);assert.equal(walk(f.host).find(n=>n.name==='hora_inicio').value,'08:00');
 f.setFailWrite(false);f.setFailRead(true);await f.submit();assert.match(f.host.textContent,/Horário salvo.*Não foi possível atualizar/);
 f.setFailRead(false);await f.button('Tentar carregar novamente').onclick();assert.match(f.host.textContent,/Segunda-feira/);
});
test('participante consulta sem formulário de gestão; trocar oferta descarta resposta atrasada',async()=>{
 const f=fixture();f.mount(8,false);await settle();assert.equal(walk(f.host).some(n=>n.tag==='form'),false);
 f.mount(8);f.mount(9);await settle();f.fill();await f.submit();assert.equal(f.requests.find(r=>r.method==='POST').path,'/api/classes/9/schedule');
 assert.equal(f.host.children.length,1);
});

test('grade semântica agrupa aulas adjacentes, mantém lacunas e sábado sem inventar recreio',()=>{
 const f=fixture();const row={id_disciplina:8,nome:'Dados',dia_semana:1,hora_inicio:'08:00',hora_fim:'08:50'};
 f.renderGrid(f.host,[row,{...row,hora_inicio:'08:50',hora_fim:'09:40'},{...row,dia_semana:6,hora_inicio:'10:00',hora_fim:'10:50',nome:'Artes'}],'Turma real');
 const all=walk(f.host);assert.equal(all.filter(n=>n.tag==='strong'&&n.textContent==='Dados').length,1);
 assert.ok(all.some(n=>n.tag==='th'&&n.textContent==='08:00–09:40'&&n.attributes.scope==='row'));
 assert.ok(all.some(n=>n.tag==='th'&&n.textContent==='Sábado'&&n.attributes.scope==='col'));
 assert.match(f.host.textContent,/Sem aula/);assert.doesNotMatch(f.host.textContent,/Recreio|Intervalo informado/);
 assert.equal(all.find(n=>n.attributes.role==='region').tabIndex,0);
});
test('grade preserva aulas sobrepostas, cancelamentos e sala sem criar registros',()=>{
 const f=fixture();const rows=[{id_disciplina:8,nome:'Dados',dia_semana:1,hora_inicio:'08:00',hora_fim:'09:00',sala:'B1'},
 {id_disciplina:9,nome:'Outra',dia_semana:1,hora_inicio:'08:30',hora_fim:'09:30',cancelada:true}];
 const before=JSON.stringify(rows);f.renderGrid(f.host,rows);assert.equal(JSON.stringify(rows),before);
 assert.match(f.host.textContent,/Dados/);assert.match(f.host.textContent,/Outra/);assert.match(f.host.textContent,/Aula cancelada/);assert.match(f.host.textContent,/Sala: B1/);
 assert.equal(f.requests.length,0);
});
