/* Modelos transacionais: HTML escapado e estilos essenciais em linha para clientes de e-mail. */
const {plainText}=require('../../../frontend/js/notice-links');
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const clean=value=>String(value??'').split(/\r?\n/).map(line=>plainText(line)).join('\n').trim();
const paragraph=value=>escapeHTML(clean(value)).replace(/\n/g,'<br>');
function layout({title,preheader,content,footer}) {
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHTML(title)} — Arcádia</title>
<style>@media only screen and (max-width:600px){.email-pad{padding-left:18px!important;padding-right:18px!important}.email-heading{font-size:27px!important;line-height:34px!important}.email-action{display:block!important;text-align:center!important}}@media(prefers-color-scheme:dark){.email-bg{background-color:#101214!important}.email-card{background-color:#1b1e22!important;border-color:#3a3f46!important;color:#f2f3f5!important}.email-heading,.email-label,.email-copy{color:#f2f3f5!important}.email-muted{color:#b9bec6!important}.email-task{background-color:#25292e!important;border-color:#3a3f46!important}.email-brand{color:#bad4ff!important}.email-alt{color:#bad4ff!important}}</style></head>
<body class="email-bg" style="margin:0;padding:0;background-color:#f5f6f9;color:#0c203b;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHTML(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="width:100%;background-color:#f5f6f9;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-card" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dce1e8;border-radius:16px;color:#0c203b;">
<tr><td class="email-pad" style="padding:26px 28px 20px;border-bottom:1px solid #dce1e8;"><span class="email-brand" style="font-family:'Times New Roman',Times,serif;font-size:27px;color:#2146a3;">Arcádia</span><br><span class="email-muted" style="font-size:11px;letter-spacing:1px;color:#596578;">IFPA CAMPUS BELÉM · MURAL DE APOIO</span></td></tr>
<tr><td class="email-pad" style="padding:24px 28px 10px;"><h1 class="email-heading" style="margin:0;font-family:'Times New Roman',Times,serif;font-size:30px;font-weight:400;line-height:38px;color:#0c203b;">${escapeHTML(title)}</h1></td></tr>
${content}
<tr><td class="email-pad email-muted" style="padding:20px 28px 26px;border-top:1px solid #dce1e8;font-size:13px;line-height:21px;color:#596578;overflow-wrap:anywhere;">${footer}</td></tr>
</table><p class="email-muted" style="margin:18px 0 0;font-size:12px;line-height:20px;color:#596578;">Projeto desenvolvido por alunos do IFPA Campus Belém.</p>
</td></tr></table></body></html>`;
}
function button(url,label){return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#2146a3" style="background-color:#2146a3;border-radius:10px;"><a href="${escapeHTML(url.href)}" class="email-action" style="display:inline-block;padding:14px 24px;min-height:22px;border:1px solid #2146a3;border-radius:10px;background-color:#2146a3;color:#ffffff;font-size:16px;font-weight:bold;line-height:22px;text-align:center;text-decoration:none;">${label}</a></td></tr></table>`;}
function linkHTML(url,verification){
 const heading=verification?'Confirme seu e-mail':'Redefina sua senha',action=verification?'Confirmar e-mail':'Redefinir senha';
 const intro=verification?'Recebemos uma solicitação de confirmação deste endereço no Arcádia. Use o botão para abrir a página segura e concluir a confirmação.':'Recebemos uma solicitação para redefinir sua senha no Arcádia. Use o botão para abrir a página segura e escolher uma nova senha.';
 const instruction=verification?'Na página, clique em <strong>Confirmar e-mail</strong>.':'Na página, escolha e confirme sua nova senha. Abrir este link não altera sua senha automaticamente.';
 const warning=verification?'Se você não solicitou esta confirmação, ignore a mensagem. Confirmar o endereço não comprova vínculo institucional nem concede permissões de professor ou administrador.':'Se você não solicitou a alteração, ignore esta mensagem. Sua senha atual continua válida até concluir a redefinição.';
 return layout({title:heading,preheader:heading+' com segurança. O link expira em 30 minutos.',content:`<tr><td class="email-pad email-copy" style="padding:0 28px 20px;font-size:16px;line-height:25px;">${intro}</td></tr><tr><td class="email-pad" style="padding:0 28px 22px;">${button(url,action)}</td></tr><tr><td class="email-pad email-copy" style="padding:0 28px 16px;font-size:14px;line-height:22px;">${instruction} O link expira em <strong>30 minutos</strong> e só pode ser utilizado uma vez.</td></tr><tr><td class="email-pad email-copy" style="padding:0 28px 24px;font-size:14px;line-height:22px;">Se o botão não abrir, use <a href="${escapeHTML(url.href)}" class="email-alt" style="color:#2146a3;text-decoration:underline;">${verification?'Abrir confirmação':'Abrir redefinição'}</a>.</td></tr>`,footer:warning});
}
function due(value){const raw=value instanceof Date?value.toISOString():String(value||'');const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(raw);return match?`${match[3]}/${match[2]}/${match[1]}`:'Sem prazo definido';}
function reminderContent(reminder){
 const task=reminder.task;
 const details=task?[
  ['Prazo',due(task.data_entrega)],['Responsável',clean(task.responsavel)||'Não informado'],
  ['Prioridade',({baixa:'Baixa',media:'Média',alta:'Alta'})[task.prioridade]||'Não informada'],
  ['Situação',({aberta:'Aberta',em_andamento:'Em andamento',concluida:'Concluída'})[task.status]||'Não informada'],
  ['Categoria',clean(task.categoria)||'Geral']
 ]:[];
 return {task,title:clean(task?.titulo||reminder.titulo),description:clean(task?.descricao||''),details};
}
function reminderHTML(url,reminder){
 const {task,title,description,details}=reminderContent(reminder);
 const rows=details.map(([label,value])=>`<tr><td class="email-label" style="padding:8px 0 3px;font-size:12px;font-weight:bold;color:#596578;">${escapeHTML(label)}</td></tr><tr><td class="email-copy" style="padding:0 0 8px;font-size:15px;line-height:23px;overflow-wrap:anywhere;word-break:break-word;">${escapeHTML(value)}</td></tr>`).join('');
 const note=clean(reminder.descricao);
 return layout({title:task?'Lembrete da sua tarefa':'Seu lembrete',preheader:title+(task?' · Prazo: '+due(task.data_entrega):''),content:`<tr><td class="email-pad email-copy" style="padding:0 28px 20px;font-size:15px;line-height:24px;">${task?'Confira os detalhes da tarefa que você pediu para lembrar.':'Você programou este aviso no Arcádia.'}</td></tr>
<tr><td class="email-pad" style="padding:0 28px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-task" style="width:100%;table-layout:fixed;border:1px solid #dce1e8;border-left:4px solid #2146a3;border-radius:12px;background-color:#f1f4f9;"><tr><td style="padding:20px;"><h2 class="email-copy" style="margin:0 0 14px;font-family:'Times New Roman',Times,serif;font-size:24px;line-height:31px;color:#0c203b;overflow-wrap:anywhere;word-break:break-word;">${escapeHTML(title)}</h2><p class="email-label" style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#596578;">${task?'Descrição':'Mensagem'}</p><div class="email-copy" style="font-size:15px;line-height:24px;overflow-wrap:anywhere;word-break:break-word;">${task?(description?paragraph(description):'Sem descrição informada.'):paragraph(note||title)}</div>${task?'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #dce1e8;">'+rows+'</table>':''}</td></tr></table></td></tr>
${task&&note?'<tr><td class="email-pad email-copy" style="padding:0 28px 20px;font-size:14px;line-height:23px;"><strong>Mensagem do lembrete</strong><br>'+paragraph(note)+'</td></tr>':''}
<tr><td class="email-pad" style="padding:0 28px 26px;">${button(url,task?'Abrir tarefas':reminder.calendar?'Abrir calendário':'Abrir lembretes')}</td></tr>`,footer:'Você autorizou estes avisos. Para desativar, abra <strong>Meus lembretes e notificações</strong> no Calendário ou em Tarefas. Os detalhes refletem o momento do envio.'});
}
function reminderText(url,reminder){const {task,title,description,details}=reminderContent(reminder);return [task?'Lembrete da sua tarefa':'Seu lembrete',title,task?(description||'Sem descrição informada.'):clean(reminder.descricao),...details.map(([label,value])=>label+': '+value),task&&reminder.descricao?'Mensagem do lembrete: '+clean(reminder.descricao):'', 'Abrir no Arcádia: '+url.href,'Você autorizou estes avisos. Para desativar, abra Meus lembretes e notificações no Calendário ou em Tarefas.'].filter(Boolean).join('\n\n');}
module.exports={confirmationHTML:url=>linkHTML(url,true),resetPasswordHTML:url=>linkHTML(url,false),reminderHTML,reminderText};
