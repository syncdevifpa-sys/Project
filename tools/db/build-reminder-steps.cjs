// Offline: divisao para Workbench; nao conecta a banco nem executa SQL.
const fs=require('node:fs');
const path=require('node:path');
const {helpers,column,index,fk,triggerCheck,checksum}=require('../lib/migration-sql.cjs');
const spec=require('../../backend/db/migrations/1.1.26.json');
const baseline=require('../../backend/db/migrations/1.1.25.json');
const dir=path.join(__dirname,'../../backend/db/workbench/1.1.26');
fs.mkdirSync(dir,{recursive:true});
const q=value=>"'"+String(value).replace(/'/g,"''")+"'";
const check=(expression,message)=>`CALL _arc125_assert(${expression},${q(message)});`;
const full=require('../lib/calendar-reminder-migration.cjs').generate(spec);
const start=full.indexOf('CREATE TRIGGER IF NOT EXISTS trg_calendario_lembrete_update');
if(start<0)throw Error('Gatilhos ausentes no gerador.');
const cutoff=full.lastIndexOf('DELIMITER $$',start);
fs.writeFileSync(path.join(dir,'01-structure.sql'),full.slice(0,cutoff)+
    "-- Estrutura preparada. Gatilhos e registro 1.1.26 ainda pendentes.\n"+
    "SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='lembretes' AND COLUMN_NAME IN ('id_usuario','id_externo','id_evento_externo','contexto')) OR (TABLE_NAME='lembrete_envios' AND COLUMN_NAME IN ('estado','tentativas','proxima_tentativa_utc')) OR (TABLE_NAME='publico_externo' AND COLUMN_NAME IN ('email_lembretes','consentimento_lembretes_em'))) ORDER BY TABLE_NAME,COLUMN_NAME;\n");
const plainTriggers=spec.triggers.map(trigger=>{
    const match=/^BEGIN\s*(UPDATE [\s\S]+;)\s*END$/.exec(trigger.body);
    if(!match || match[1].split(';').length!==2)throw Error('Gatilho nao e um UPDATE unico.');
    return `CREATE TRIGGER ${trigger.name} ${trigger.timing} ${trigger.event} ON ${trigger.table} FOR EACH ROW\n${match[1]}`;
});
fs.writeFileSync(path.join(dir,'02-triggers.sql'),
    '-- GERADO offline. Apenas para quatro gatilhos previamente confirmados AUSENTES.\n'+
    '-- Parar no primeiro erro. Nao reaplicar em banco que ja concluiu 1.1.26.\n'+plainTriggers.join('\n\n')+'\n');
const evolved=[...spec.columns,
    {table:'lembretes',name:'id_usuario',definition:'id_usuario INT NULL',type:'int',nullable:true,default:null,auto:false,onUpdate:false,collation:null},
    {table:'lembrete_envios',name:'estado',definition:"estado ENUM('reservado','enviado','falhou','cancelado','aguardando','enviando') NOT NULL DEFAULT 'reservado'",type:"enum('reservado','enviado','falhou','cancelado','aguardando','enviando')",nullable:false,default:'reservado',auto:false,onUpdate:false,collation:null}];
const keys=[...spec.foreignKeys,
    {table:'lembretes',columns:'id_usuario',ref:'usuarios',refColumns:'id_usuario',delete:'CASCADE'},
    {table:'lembretes',columns:'id_evento',ref:'calendario',refColumns:'id_evento',delete:'SET NULL'}];
const output=[
    '-- GERADO offline por tools/db/build-reminder-steps.cjs. Nenhum SQL executado pelo gerador.',
    '-- ETAPA FINAL: defaultdb/MySQL 8.4, apos estrutura e quatro gatilhos. Parar no primeiro erro.',
    '-- Nao altera dados/tabelas do aplicativo nem cria gatilhos. Cria e remove rotinas auxiliares.',
    '-- Registra 1.1.26 somente apos todas as validacoes. Execucao real ainda precisa ser confirmada.',
    'SET @arc125_failed=0;',helpers,
    check("DATABASE()='defaultdb' AND VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%'",'Selecione defaultdb em MySQL 8.4.'),
    check(`EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.25' AND checksum=${q(checksum(baseline))})`,'Registro 1.1.25 ausente/divergente.'),
    check(`NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.26' AND checksum<>${q(checksum(spec))})`,'Checksum 1.1.26 divergente.'),
    ...evolved.flatMap(col=>[
        check(`EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${q(col.table)} AND COLUMN_NAME=${q(col.name)})`,'Coluna ausente: '+col.table+'.'+col.name),column(col,false)]),
    ...spec.indexes.flatMap(idx=>[
        check(`EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${q(idx.table)} AND INDEX_NAME=${q(idx.name)})`,'Indice ausente: '+idx.name),index(idx,false)]),
    ...keys.flatMap(key=>[
        check(`EXISTS(SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=${q(key.table)} AND COLUMN_NAME=${q(key.columns)} AND REFERENCED_TABLE_NAME=${q(key.ref)} AND REFERENCED_COLUMN_NAME=${q(key.refColumns)})`,'FK ausente: '+key.columns),fk(key,false)]),
    check("EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='lembretes' AND t.CONSTRAINT_NAME='chk_lembrete_titular' AND t.ENFORCED='YES' AND REGEXP_REPLACE(LOWER(REPLACE(c.CHECK_CLAUSE,CHAR(96),'')),'[[:space:]()]','')='id_usuarioisnull<>id_externoisnull')",'CHECK de titular ausente/divergente.'),
    check("NOT EXISTS(SELECT 1 FROM lembretes WHERE (id_usuario IS NULL)=(id_externo IS NULL) OR (id_tarefa IS NOT NULL)+(id_evento IS NOT NULL)+(id_evento_externo IS NOT NULL)>1)",'Ha titulares/vinculos inconsistentes.'),
    check("NOT EXISTS(SELECT 1 FROM lembretes WHERE (id_tarefa IS NOT NULL AND contexto<>'tarefa') OR (id_evento IS NOT NULL AND contexto<>'calendario') OR (id_evento_externo IS NOT NULL AND contexto<>'agenda_externa'))",'Contexto dos vinculos divergente.'),
    ...spec.triggers.map(trigger=>triggerCheck(trigger,true)),
    `INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.26',${q(checksum(spec))} WHERE @arc125_failed=0;`,
    "SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao IN ('1.1.25','1.1.26') ORDER BY versao;",
    ...['column','index','fk','names','check','assert','evolve','contexts'].map(name=>'DROP PROCEDURE IF EXISTS _arc125_'+name+';')];
fs.writeFileSync(path.join(dir,'03-finalize.sql'),output.join('\n').replaceAll('arc125','arc126')+'\n');
console.log('Etapas de estrutura e validacao final geradas offline. Nenhum SQL executado.');
