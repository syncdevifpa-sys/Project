const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const time=require('../front/js/reminder-time');

test('dia do lembrete usa instante e fuso do usuário, sem usar intervalo do evento',()=>{
 const row={id_lembrete:1,ativo:1,agendado_utc:'2026-10-27T01:00:00Z',evento:{data_evento:'2026-10-29',data_fim:'2026-11-01'}};
 assert.equal(time.calendarDay(row,'America/Belem'),'2026-10-26');
 assert.equal(time.calendarDay(row,'Asia/Tokyo'),'2026-10-27');
 assert.equal(time.calendarDay({...row,ativo:0},'UTC'),null);
 assert.equal(time.calendarDay({...row,indisponivel:true},'UTC'),null);
 assert.equal(time.calendarDay({...row,agendado_utc:null},'UTC'),null);
 assert.equal(time.calendarDay(row,'invalid/zone'),null);
 const index=time.calendarIndex([row,row,{...row,id_lembrete:2,contexto:'avulso'}],'America/Belem');
 assert.equal(index.size,1);assert.equal(index.get('2026-10-26').length,2);
});

class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.classList={contains:name=>name==='ar-calendar-page'};}
 append(...items){for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(child=>child!==item);item.parent=this;this.children.push(item);}}
 replaceChildren(...items){for(const child of this.children)child.parent=null;this.children=[];this.append(...items);}
 setAttribute(key,value){this.attributes[key]=value;}
 get textContent(){return (this.text||'')+this.children.map(child=>child.textContent||'').join(' ');}
 set textContent(value){this.text=value;this.replaceChildren();}
 querySelector(){return this.children.find(child=>child.tag==='summary');}
 focus(){} scrollIntoView(){}
}
const walk=node=>[node,...node.children.flatMap(walk)];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('lista diária reutiliza ações, atualiza exclusão e remove dados quando a conta muda',async()=>{
 const body=new Element('body'),host=new Element('details'),daily=new Element('section');host.append(new Element('summary'));body.append(daily,host);
 let session={id_usuario:8,tipo_usuario:'discente'};
 let rows=[{id_lembrete:1,titulo:'Avulso',ativo:1,agendado_utc:'2026-10-26T12:00:00Z',fuso_horario:'UTC'},
 {id_lembrete:2,titulo:'Outro dia',ativo:1,agendado_utc:'2026-10-28T12:00:00Z',fuso_horario:'UTC'},
 {id_lembrete:3,titulo:'Desativado',ativo:0,agendado_utc:'2026-10-26T12:00:00Z',fuso_horario:'UTC'}];
 const listeners={},events=[],requests=[];
 const A={auth:{estaLogado:()=>true,getSessao:()=>session},reminderTime:time,confirmAction:async()=>true,
 api:{expect:p=>p,request:async(path,{method})=>{requests.push({path,method});if(method==='DELETE'){rows=rows.filter(row=>row.id_lembrete!==Number(path.split('/').at(-1)));return {};}
 return path.endsWith('/preferences')?{email_confirmado:false,email_lembretes:false}:structuredClone(rows);}}};
 vm.runInNewContext(fs.readFileSync('front/js/task-reminders.js','utf8'),{window:{Arcadia:A,addEventListener:(type,fn)=>listeners[type]=fn,dispatchEvent:event=>events.push(event.type)},Event,location:{hash:''},document:{readyState:'complete',body,getElementById:id=>id==='taskReminders'?host:daily,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text,children:[]})}});
 await settle();A.reminderUI.setCalendarDay('2026-10-26');
 assert.equal(walk(daily).filter(node=>node.tag==='article').length,1);
 assert.match(daily.textContent,/Avulso/);assert.doesNotMatch(daily.textContent,/Outro dia|Desativado/);
 assert.doesNotMatch(walk(host).find(node=>node.className==='ar-task-reminders-list').textContent,/Avulso/);
 assert.equal(A.reminderUI.calendarCounts().get('2026-10-26'),1);
 assert.match(daily.textContent,/e-mail desativado/);
 await walk(daily).find(node=>node.tag==='button'&&node.textContent==='Excluir').onclick();
 assert.equal(A.reminderUI.calendarCounts().has('2026-10-26'),false);assert.match(daily.textContent,/Nenhum lembrete ativo/);
 assert.ok(requests.some(row=>row.method==='DELETE'&&row.path==='/api/reminders/1'));
 assert.ok(events.includes('arcadia:reminders-changed'));
 session={id_usuario:9,tipo_usuario:'discente'};await listeners.storage();await settle();
 assert.equal(A.reminderUI.calendarCounts().size,0);assert.doesNotMatch(host.textContent,/Outro dia|Desativado/);
 assert.match(daily.textContent,/A conta mudou/);
});

test('seção diária fica entre eventos e horários sem duplicar painel ou formulário',()=>{
 const html=fs.readFileSync('front/calendar.html','utf8');
 assert.equal((html.match(/id="calendarDayReminders"/g)||[]).length,1);
 assert.ok(html.indexOf('ar-panel-body')<html.indexOf('id="calendarDayReminders"'));
 assert.ok(html.indexOf('id="calendarDayReminders"')<html.indexOf('data-class-weekly-agenda'));
});
