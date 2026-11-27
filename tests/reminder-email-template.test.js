const {test}=require('node:test'),assert=require('node:assert/strict');
const {reminderHTML,reminderText}=require('../backend/src/services/email-templates.service');
const url=new URL('https://portal.example.test/tasks.html');
const task={titulo:'Trabalho de pesquisa',descricao:'**Pesquisar** o tema.\n\nPreparar a apresentação completa.',data_entrega:'2026-11-24',responsavel:'João & Luísa',prioridade:'alta',status:'em_andamento',categoria:'Acadêmico'};
test('lembrete inclui quadro completo da tarefa em HTML e texto, preservando parágrafos',()=>{
 const reminder={titulo:'Revisar trabalho',task};const html=reminderHTML(url,reminder),text=reminderText(url,reminder);
 for(const value of ['Trabalho de pesquisa','Pesquisar o tema.','Preparar a apresentação completa.','24/11/2026','Alta','Em andamento','Acadêmico']){assert.ok(html.includes(value),value);assert.ok(text.includes(value),value);}
 assert.match(html,/João &amp; Luísa/);assert.match(html,/<br><br>Preparar/);assert.match(html,/href="https:\/\/portal.example.test\/tasks.html"/);assert.match(html,/role="presentation"/);assert.match(html,/@media only screen/);assert.doesNotMatch(html,/\*\*Pesquisar\*\*/);
});
test('lembrete escapa conteúdo da tarefa e não insere imagens, scripts ou links externos',()=>{
 const html=reminderHTML(url,{titulo:'Aviso',task:{...task,titulo:'Título <img src=x onerror=alert(1)>',descricao:'Texto <script>alert(1)</script> [alinhar=justify]Seguro[/alinhar]',responsavel:'A < B & C'}});
 assert.doesNotMatch(html,/<script|<img|onerror=|\[\/?alinhar|javascript:/i);assert.match(html,/Seguro/);assert.equal((html.match(/href=/g)||[]).length,1);
});
test('campos opcionais vazios são apresentados sem datas inválidas ou undefined',()=>{
 const html=reminderHTML(url,{titulo:'Lembrete',task:{titulo:'Sem campos',status:'aberta'}});
 for(const label of ['Sem prazo definido','Sem descrição informada.','Não informado','Não informada','Aberta'])assert.ok(html.includes(label));assert.doesNotMatch(html,/undefined|Invalid Date/);
 const event=reminderHTML(new URL('https://portal.example.test/calendar.html'),{titulo:'Encontro',descricao:'Trazer os documentos.',calendar:true});assert.match(event,/Abrir calendário/);assert.match(event,/Trazer os documentos/);
});
test('envio de lembrete compõe HTML e alternativa de texto sem SMTP real',async t=>{
 const mail=require('../backend/src/services/email.service'),nodemailer=require(require.resolve('nodemailer',{paths:[require.resolve('../backend/src/services/email.service')]}));
 for(const [key,value]of Object.entries({SMTP_USER:'sender@example.test',SMTP_PASS:'somente-teste',APP_URL:'https://portal.example.test'})){const previous=process.env[key];process.env[key]=value;t.after(()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous;});}
 let message,closed=false;t.mock.method(nodemailer,'createTransport',()=>({sendMail:async data=>{message=data;return{accepted:['recipient@example.test']}},close:()=>closed=true}));
 await mail.sendReminder('recipient@example.test',{id:2,versao:1,titulo:'Revisar trabalho',task});
 assert.match(message.html,/Trabalho de pesquisa/);assert.match(message.text,/24\/11\/2026/);assert.equal(message.disableUrlAccess,true);assert.equal(message.disableFileAccess,true);assert.equal(closed,true);
});
