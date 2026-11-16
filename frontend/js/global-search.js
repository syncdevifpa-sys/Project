(function (root, factory) {
 const search=factory(typeof module==='object'&&module.exports?require('./notice-links'):root.Arcadia.noticeLinks);
 if(typeof module==='object'&&module.exports)module.exports=search;else(root.Arcadia=root.Arcadia||{}).globalSearch=search;
})(typeof window==='undefined'?globalThis:window,function(noticeLinks){
 'use strict';
 /* O índice recebe somente respostas autorizadas; não inclui contatos privados nem administração. */
 const plain=noticeLinks.plainText;
 const normalize=value=>plain(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const labels={discente:'aluno estudante',docente:'professor',servidor:'servidor',externo:'comunidade externa',pesquisa:'pesquisa',extensao:'extensão',inovacao:'inovação',evento:'evento eventos',calendario:'calendário calendario',edital:'edital editais',publicado:'publicado',calendario:'calendário',concluida:'concluída'};
 function match(items,query,scope='All'){
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  return items.filter(row=>(scope==='All'||row.type===scope)&&terms.every(term=>normalize([row.title,row.meta,row.desc,row.keywords].join(' ')).includes(term))).slice(0,80);
 }
 function mapRows(type,rows){
  if(!Array.isArray(rows))return[];
  return rows.flatMap(row=>{
   const id=type==='People'?(row.id_usuario??row.id_externo):type==='Projects'?row.id_projeto:type==='Calendar'?row.id_evento:type==='Tasks'?row.id_tarefa:type==='Documents'?(row.id_item??row.id_documento):row.id_aviso;
   const title=type==='People'?row.nome:row.titulo;if(id==null||!title)return[];
   const href=type==='People'?'people.html?busca='+encodeURIComponent(title):type==='Projects'?'project.html?id='+encodeURIComponent(id):type==='Calendar'?'calendar.html?busca='+encodeURIComponent(title):type==='Tasks'?'tasks.html':type==='Documents'?'documents.html'+(row.id_item?'?material='+encodeURIComponent(id):''):noticeLinks.path(row);
   const fields=[row.tipo_usuario,row.curso,row.categoria,row.eixo,row.situacao,row.status,row.tipo_publicacao,row.responsavel_nome,row.visibilidade,row.autor_obra];
   const rawDate=row.data_evento||row.data_inicio||row.data_publicacao||row.data_prazo||row.criado_em;
   const parsed=rawDate?new Date(rawDate):null;
   const date=parsed&&Number.isFinite(parsed.getTime())?parsed.toLocaleDateString('pt-BR'):'';
   return[{type,title:plain(title),href,meta:type==='People'?[labels[row.tipo_usuario]||row.tipo_usuario,row.curso].filter(Boolean).join(' · '):date,desc:type==='People'?'':plain(row.resumo||row.descricao),keywords:fields.map(value=>labels[value]||value||'').join(' ')+' '+(type==='People'?'':plain(row.descricao))+' '+(row.fixado?'fixado ':'')+(row.urgente?'urgente':''),icon:({People:'users',Projects:'folder-kanban',Calendar:'calendar',Tasks:'check',Documents:'file-text'})[type]||'bell'}];
  });
 }
 async function load(api,authenticated,external){
  const sources=authenticated?[['Notices','/api/notices'],['Projects','/api/projects'],['People','/api/users'],['Calendar','/api/calendar'],['Tasks','/api/tasks'],['Documents','/api/document-library/public'],...(!external?[['Documents','/api/document-library'],['Projects','/api/projects/my']]:[])]:[['Public','/api/public'],['Documents','/api/document-library/public']];
  const responses=await Promise.allSettled(sources.map(([,path])=>api.expect(api.get(path))));
  const items=[],failed=[];
  responses.forEach((r,i)=>{const type=sources[i][0];if(r.status==='rejected'){failed.push(type);return;}if(type==='Public')items.push(...mapRows('Notices',r.value.notices),...mapRows('Projects',r.value.projects));else items.push(...mapRows(type,type==='Documents'&&!Array.isArray(r.value)?[...(r.value.items||[]),...(r.value.saved||[])]:r.value));});
  return{items:[...new Map(items.map(item=>[item.type+':'+item.href,item])).values()],failed};
 }
 return{plain,normalize,match,mapRows,load};
});
