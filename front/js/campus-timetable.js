/* Grade solicitada para o campus Belém. Fonte única para UI e validação do servidor. */
(function(root,factory){const policy=factory();if(typeof module==='object'&&module.exports)module.exports=policy;else (root.Arcadia=root.Arcadia||{}).campusTimetable=policy;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const shifts={manha:{label:'Manhã',start:420},tarde:{label:'Tarde',start:780},noite:{label:'Noite',start:1140}};
 const duration=50,breakMinutes=20,count=6;
 function minutes(value){if(typeof value!=='string'||!/^\d{2}:[0-5]\d$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h<=24?h*60+m:NaN;}
 function clock(value){return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
 function label(value){return clock(value%1440)+(value>=1440?' (+1 dia)':'');}
 function slots(shift){const keys=shifts[shift]?[shift]:Object.keys(shifts),out=[];for(const key of keys){let start=shifts[key].start;for(let index=1;index<=count;index++){out.push({turno:key,tipo:'aula',numero:index,start,end:start+duration});start+=duration;if(index===3){out.push({turno:key,tipo:'intervalo',start,end:start+breakMinutes});start+=breakMinutes;}}}return out;}
 function validate(slot,shift){const from=minutes(slot.hora_inicio),until=minutes(slot.hora_fim),grid=slots(shift);if(!Number.isFinite(from)||!Number.isFinite(until)||until<=from)return false;const first=grid.find(row=>row.tipo==='aula'&&row.start===from);if(!first)return false;return grid.some(row=>row.turno===first.turno&&row.tipo==='aula'&&row.end===until)&&!grid.some(row=>row.tipo==='intervalo'&&row.start<until&&row.end>from);}
 function isBelem(campus){return typeof campus==='string'&&campus.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('belem');}
 function room(row){const override=typeof row.sala==='string'?row.sala.trim():'';const official=typeof row.sala_oficial==='string'?row.sala_oficial.trim():'';return {value:override||official||null,source:override?'aula':official?'turma':null};}
 return {shifts,duration,breakMinutes,count,minutes,clock,label,slots,validate,isBelem,room};
});
