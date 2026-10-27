(function(A){
 'use strict';
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const call=(path,method='GET',body)=>A.api.expect(A.api.request('/api/classes/academic'+path,{method,body}));
 const button=(text,action)=>{const el=node('button',text,'ar-btn');el.type='button';el.onclick=action;return el;};
 async function run(button,status,action){if(button.disabled)return;button.disabled=true;try{await action();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}}
 let sequence=0;
 function dialog(title,saveLabel='Salvar'){
  const previous=document.activeElement,box=node('dialog',undefined,'ar-academic-dialog'),heading=node('h2',title);heading.id='academicDialog'+(++sequence);box.setAttribute('aria-labelledby',heading.id);
  const form=node('form'),fields=node('div',undefined,'ar-academic-fields'),status=node('p'),actions=node('div',undefined,'ar-academic-actions');status.setAttribute('role','status');
  const save=node('button',saveLabel,'ar-btn ar-btn--primary');save.type='submit';actions.append(button('Cancelar',()=>box.close()),save);form.append(fields,status,actions);box.append(heading,form);document.body.append(box);
  box.addEventListener('close',()=>{box.remove();if(previous?.isConnected)previous.focus();},{once:true});(window.Arcadia.dialogShell ? window.Arcadia.dialogShell.open(box) : box.showModal());
  function field(label,value='',type='text',required=false){const wrap=node('label',label),input=node('input');input.type=type;input.required=required;if(type==='checkbox'){input.checked=!!value;wrap.className='ar-academic-check';}else input.value=value;wrap.append(input);fields.append(wrap);return input;}
  function submit(fn){form.onsubmit=async event=>{event.preventDefault();if(!form.checkValidity()){form.reportValidity();return;}if(save.disabled)return;save.disabled=true;status.textContent='Salvando…';try{await fn();box.close();}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};queueMicrotask(()=>fields.querySelector('input,select,textarea')?.focus());}
  return {box,fields,field,submit};
 }
 async function reloadAfter(result,reload,status){try{await reload();status.textContent=result.message;}catch(error){status.textContent=result.message+' Não foi possível atualizar a lista: '+error.message;}}
 async function review(host,status,onChanged){
  const rows=await call('/requests/review');host.replaceChildren();host.append(button('Atualizar pedidos',event=>run(event.currentTarget,status,onChanged)));
  if(!rows.length)host.append(node('p','Nenhum pedido pendente para sua análise.'));
  for(const row of rows){
   const card=node('article',undefined,'ar-academic-card');card.append(node('h3',row.aluno),node('p',row.turma+' · '+row.curso));const actions=node('div',undefined,'ar-academic-actions');
   for(const [decision,label] of [['aprovar','Aprovar entrada'],['recusar','Recusar pedido']])actions.append(button(label,()=>{
    const e=dialog(label,label);e.fields.append(node('p',row.aluno+' · '+row.turma),node('p','A decisão altera apenas o vínculo com a turma. Não matricula automaticamente nas disciplinas.'));
    const reason=e.field('Motivo (opcional)');reason.maxLength=500;e.submit(async()=>{const result=await call('/requests/'+row.id_pedido,'PUT',{decisao:decision,versao:row.versao,motivo:reason.value});await reloadAfter(result,onChanged,status);});
   }));card.append(actions);host.append(card);
  }
 }
 const timestamp=value=>{if(!value)return '';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value):new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Belem'}).format(parsed);};
 A.academicUI={node,call,button,run,dialog,review,timestamp,reloadAfter};
})(window.Arcadia);
