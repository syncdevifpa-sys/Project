const db=require('../config/database');
const jwt=require('jsonwebtoken');
const {validateContent}=require('./content-edit.service');
const {extractCalendarPdf,normalize}=require('./calendar-pdf.service');
const LEVELS={basica:'Educação básica',graduacao:'Graduação',pos:'Pós-graduação'};
function fail(status,message){throw Object.assign(new Error(message),{status});}
function metadata(input){
    const year=Number(input.year),level=input.level,label=String(input.label||'').trim(),source=String(input.source||'').trim();
    if(!Number.isInteger(year)||year<2000||year>2100||!Object.hasOwn(LEVELS,level)||!label||label.length>120||source.length>1000)fail(400,'Confirme ano, modalidade e identificação do calendário.');
    if(source){let url;try{url=new URL(source);}catch{}if(!url||!['http:','https:'].includes(url.protocol))fail(400,'Fonte deve ser um link HTTP/HTTPS.');}
    return {year,level,label,source};
}
function allowed(actor){return actor&&(actor.is_admin===true||actor.is_admin===1||['docente','servidor'].includes(actor.tipo_usuario));}
async function actorForImport(id,connection=db){const [rows]=await connection.execute("SELECT id_usuario, tipo_usuario, is_admin FROM usuarios WHERE id_usuario = ? AND situacao = 'ativo'",[id]);if(!allowed(rows[0]))fail(403,'Importação disponível para docentes, servidores e administradores ativos.');return rows[0];}
async function preview(buffer,input,actorId){
    await actorForImport(actorId);const meta=metadata(input),result=await extractCalendarPdf(buffer,meta);
    const token=jwt.sign({scope:'calendar-pdf-preview',actor:actorId,...meta,hash:result.hash,reference:result.detected.reference},process.env.JWT_SECRET,{expiresIn:'2h',audience:'calendar-import'});
    return {...result,metadata:meta,previewToken:token,notice:'Revise cada evento. Nenhum evento foi gravado. O calendário é público.'};
}
function key(event){const iso=value=>value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10);return [normalize(event.titulo).replace(/\s+/g,' '),iso(event.data_evento),iso(event.data_fim),normalize(event.periodo_letivo)].join('|');}
async function commit(body,actorId){
    if(body.confirmed!==true||body.publicCalendarConfirmed!==true||!Array.isArray(body.events)||!body.events.length||body.events.length>250)fail(400,'Selecione até 250 eventos revisados e confirme a publicação no calendário público.');
    let claims;try{claims=jwt.verify(body.previewToken,process.env.JWT_SECRET,{audience:'calendar-import'});}catch{fail(400,'Prévia inválida ou expirada. Envie o PDF novamente.');}
    if(claims.scope!=='calendar-pdf-preview'||Number(claims.actor)!==Number(actorId))fail(403,'A prévia pertence a outra sessão.');
    const meta=metadata(claims),period=`Belém · ${meta.year} · ${LEVELS[meta.level]}`;
    const events=body.events.map((event,index)=>{
        if(event.reviewed!==true)fail(400,'Confirme a revisão do evento '+(index+1)+'.');
        if(event.requiresEnd===true&&!event.data_fim)fail(400,'Preencha o fim do período revisado.');
        const values=validateContent('calendar',{titulo:event.titulo,data_evento:event.data_evento,data_fim:event.data_fim||null,categoria:event.categoria||'evento'},true);
        for(const date of [values.data_evento,values.data_fim].filter(Boolean))if(Math.abs(Number(date.slice(0,4))-meta.year)>1)fail(400,'Data distante do ano confirmado no calendário.');
        const quote=typeof event.sourceText==='string'?event.sourceText.slice(0,2000):'';
        return {...values,periodo_letivo:period,descricao:`${quote}\nFonte: ${meta.label}${claims.reference?' — '+claims.reference:''}${meta.source?' — '+meta.source:''}\nPDF SHA-256: ${claims.hash}`.trim()};
    });
    const connection=await db.getConnection();
    try{
        await connection.beginTransaction();
        // Imports serialize across authorized actors, including an initially empty calendar.
        await connection.execute("SELECT id_usuario FROM usuarios WHERE situacao = 'ativo' AND (tipo_usuario IN ('docente','servidor') OR is_admin = 1) ORDER BY id_usuario FOR UPDATE");
        await actorForImport(actorId,connection);
        const [existing]=await connection.execute('SELECT titulo, data_evento, data_fim, periodo_letivo FROM calendario FOR UPDATE');const seen=new Set(existing.map(key)),pending=[];let skipped=0;
        for(const event of events){const fingerprint=key(event);if(seen.has(fingerprint)){skipped++;continue;}seen.add(fingerprint);pending.push(event);}
        if(pending.length){const columns=['id_usuario','titulo','descricao','categoria','periodo_letivo','data_evento','data_fim'];await connection.execute('INSERT INTO calendario ('+columns.join(', ')+') VALUES '+pending.map(()=>'('+columns.map(()=>'?').join(', ')+')').join(', '),pending.flatMap(event=>columns.map(name=>name==='id_usuario'?actorId:event[name])));}
        await connection.commit();return {imported:pending.length,skipped,message:`${pending.length} eventos importados; ${skipped} duplicados ignorados.`};
    }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
module.exports={preview,commit,metadata,key,actorForImport};
