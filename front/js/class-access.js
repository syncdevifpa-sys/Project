(function(A){
 'use strict';
 if(!A.auth.estaLogado()||A.auth.getSessao().tipo_usuario==='externo')return;
 const host=document.getElementById('academicAccess');if(!host)return;
 const {node,call,button,run,review,reloadAfter}=A.academicUI;
 const status=node('p');status.setAttribute('role','status');const content=node('div');host.append(status,content);
 async function reload(){
  const features=await call('/features');A.academicFeatures=features;content.replaceChildren();
  if(!features.available){host.hidden=!features.canAdmin;status.textContent=features.canAdmin?features.message:'';return;}
  host.hidden=!(features.canRequest||features.canReview);status.textContent='';
  if(features.canRequest){
   const {memberships,requests}=await call('/memberships');
   for(const member of memberships){const card=node('article',undefined,'ar-academic-card');card.append(node('h3',member.nome),node('p',member.curso),node('p',member.arquivada_em?'Turma arquivada. Seu vínculo foi preservado; você pode solicitar saída.':'Vínculo ativo com a turma. As disciplinas dependem da inclusão pelo professor.'));
    const leave=button('Sair da turma',event=>run(event.currentTarget,status,async()=>{if(!await A.confirmAction({title:'Sair da turma?',message:'O acesso a todas as disciplinas desta turma será encerrado. O histórico será preservado; um novo ingresso dependerá de aprovação.',items:[member.nome],confirmLabel:'Sair da turma'}))return;const result=await A.api.expect(A.api.request('/api/classes/cohorts/'+member.id_turma+'/leave',{method:'POST',body:{confirmacao:'SAIR'}}));await reloadAfter(result,reload,status);window.location.reload();}));card.append(leave);content.append(card);}
   const details=node('details',undefined,'ar-academic-section');details.append(node('summary','Solicitar entrada em uma turma'));
   const form=node('form',undefined,'ar-academic-toolbar'),searchLabel=node('label','Turma ou curso'),search=node('input');search.type='search';search.maxLength=100;searchLabel.append(search);
   const pickerLabel=node('label','Turma e curso'),picker=node('select');picker.required=true;pickerLabel.append(picker);const send=node('button','Enviar pedido','ar-btn');send.type='submit';
   const find=button('Buscar turmas',event=>run(event.currentTarget,status,loadOptions));form.append(searchLabel,find,pickerLabel,send);details.append(node('p','Somente a administração ou o representante atual da turma pode aprovar. O pedido não transfere sua turma nem libera todas as disciplinas.'),form);content.append(details);
   async function loadOptions(){const rows=await call('/cohorts?busca='+encodeURIComponent(search.value));picker.replaceChildren();const empty=node('option','Selecione uma turma');empty.value='';picker.append(empty);for(const row of rows){const option=node('option',row.nome+' · '+row.curso+' · ingresso '+row.ano_ingresso+' · '+row.turno+' · '+row.campus);option.value=String(row.id_turma);picker.append(option);}status.textContent=rows.length?'':'Nenhuma turma encontrada.';}
   let loaded=false;details.addEventListener('toggle',()=>{if(details.open&&!loaded){loaded=true;loadOptions().catch(error=>{loaded=false;status.textContent=error.message;});}});
   form.onsubmit=event=>{event.preventDefault();if(!form.checkValidity()){form.reportValidity();return;}run(send,status,async()=>{const result=await call('/requests','POST',{id_turma:Number(picker.value)});await reloadAfter(result,reload,status);});};
   if(requests.length){const history=node('details',undefined,'ar-academic-section');history.append(node('summary','Meus pedidos de entrada'));const labels={pendente:'Aguardando análise',aprovado:'Aprovado',recusado:'Recusado',cancelado:'Cancelado'};for(const request of requests){history.append(node('p',request.turma+' · '+request.curso+' · '+labels[request.estado]+(request.motivo?' · '+request.motivo:'')));}content.append(history);}
  }
  if(features.canReview){const section=node('details',undefined,'ar-academic-section'),list=node('div');section.append(node('summary','Pedidos de entrada para analisar'),node('p','Esta aprovação é exclusiva da administração e do representante atual com vínculo ativo. Vices não recebem esta permissão.'),list);content.append(section);await review(list,status,reload);}
 }
 reload().catch(error=>{host.hidden=false;status.textContent=error.message;});
})(window.Arcadia);
