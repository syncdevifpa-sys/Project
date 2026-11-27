const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite'),{citext}=require('@electric-sql/pglite/contrib/citext');
const transfer=require('../tools/lib/mysql-transfer.cjs');
const {exportDatabase}=require('../tools/db/export-mysql.cjs');
const {importDatabase,inspectTarget,validateConnectionTarget}=require('../tools/db/import-mysql.cjs');
const {tableNames,catalog}=transfer;
const schema=fs.readFileSync('backend/db/postgres/schema.sql','utf8');
const engineOptions={extensions:{citext},parsers:{1082:value=>value,1114:value=>value}};
test('ferramenta só aceita o endpoint remoto da branch de desenvolvimento conferida',()=>{
 const config=require('../backend/db/postgres/neon/development-target.json');
 const env={POSTGRES_IMPORT_BRANCH_ID:config.branchId,POSTGRES_IMPORT_EXPECTED_HOST:config.directHost};
 const url=new URL('postgresql://fixture@'+config.directHost+'/'+config.database);
 assert.equal(validateConnectionTarget(url,env).local,false);
 assert.throws(()=>validateConnectionTarget(new URL('postgresql://fixture@production.neon.tech/arcadiabd'),{...env,POSTGRES_IMPORT_EXPECTED_HOST:'production.neon.tech'}),/não corresponde/);
 assert.throws(()=>validateConnectionTarget(url,{...env,POSTGRES_IMPORT_BRANCH_ID:'production'}),/não corresponde/);
 assert.throws(()=>validateConnectionTarget(new URL('postgresql://fixture@'+config.directHost+'/other'),env),/não corresponde/);
 assert.throws(()=>validateConnectionTarget(new URL('postgresql://fixture@ep-fixture-pooler.neon.tech/arcadiabd'),env),/sem pooler/);
});
function mysqlFixture(source){
 const queries=[];
 return {queries,async execute(sql,args=[]){queries.push(sql);
  if(sql.startsWith('SELECT @@session.time_zone'))return [[{session_time_zone:'SYSTEM',system_time_zone:'UTC'}]];
  if(sql.includes('information_schema.TABLES'))return [tableNames.map(TABLE_NAME=>({TABLE_NAME,ENGINE:'InnoDB'}))];
  if(sql.includes('information_schema.COLUMNS'))return [tableNames.flatMap(TABLE_NAME=>catalog[TABLE_NAME].columns.map(c=>({TABLE_NAME,COLUMN_NAME:c.name})))];
  const translated=sql.replaceAll('`','"').replaceAll(' AS CHAR)',' AS text)').replace('LIMIT ? OFFSET ?','LIMIT $1 OFFSET $2');
  return [(await source.query(translated,args)).rows];
 },async query(sql){queries.push(sql);if(sql.startsWith('START'))await source.exec('BEGIN');else if(sql==='ROLLBACK')await source.exec('ROLLBACK');return [[]];}};
}
test('pacote de transferência preserva IDs, hashes, JSON, datas e binários e não sobrescreve o destino',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'arcadia-mysql-transfer-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const source=new PGlite(engineOptions),target=new PGlite(engineOptions);
 t.after(()=>source.close());t.after(()=>target.close());
 await source.exec(schema);await target.exec(schema);
 await source.exec(`INSERT INTO usuarios(id_usuario,nome,email,senha,tipo_usuario,preferencias)
  VALUES(77,'Ação 😀','source@example.test','AaBb-HASH-Sensivel','discente','{"z":2,"a":{"b":1},"preciso":9007199254740993}');
  INSERT INTO cursos(id_curso,nome) VALUES(99,'Curso fixture');
  INSERT INTO tarefas(id_tarefa,id_usuario,titulo,data_entrega,observacao) VALUES(44,77,'Tarefa original','2027-04-05','Texto\ncom duas linhas');
  INSERT INTO projetos(id_projeto,id_usuario,titulo,descricao) VALUES(88,77,'Histórico','Aprovação preservada');
  UPDATE projetos SET aprovacao='aprovado' WHERE id_projeto=88;
  INSERT INTO documento_armazenamento(id) VALUES(1);
  INSERT INTO seguranca_email_lock(chave) VALUES(1);`);
 const bytes=Buffer.from([0,255,1,2,13,10]);
 await source.query("INSERT INTO documento_itens(id_usuario,titulo,tipo,conteudo,tamanho) VALUES(77,'Binário','arquivo',$1,6)",[bytes]);
 // Ciclo real: usuário aponta à origem externa e a origem está vinculada ao usuário.
 await source.exec("INSERT INTO publico_externo(id_externo,nome,email,senha) VALUES(12,'Origem','origin@example.test','ExactHash'); UPDATE usuarios SET id_externo_origem=12 WHERE id_usuario=77; INSERT INTO conta_vinculos(id_externo,id_usuario) VALUES(12,77);");
 const origin=mysqlFixture(source),folder=path.join(temp,'snapshot');
 const manifest=await exportDatabase(origin,folder,{pageSize:1});
 assert.equal(manifest.tables.length,tableNames.length);
 assert.ok(origin.queries.includes('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY'));
 assert.ok(!origin.queries.some(sql=>/^INSERT|^UPDATE|^DELETE|^ALTER|^DROP/.test(sql)));
 await assert.rejects(exportDatabase(origin,folder),/já existe/);
 await transfer.inspectPackage(folder);
 await inspectTarget(target);
 const imported=await importDatabase(target,folder,{batchSize:1});assert.equal(imported.verified,true);
 const user=(await target.query('SELECT * FROM usuarios WHERE id_usuario=77')).rows[0];
 assert.equal(user.senha,'AaBb-HASH-Sensivel');assert.equal(user.nome,'Ação 😀');assert.deepEqual(user.preferencias.a,{b:1});
 assert.equal((await target.query("SELECT preferencias->>'preciso' AS number FROM usuarios WHERE id_usuario=77")).rows[0].number,'9007199254740993');
 assert.equal((await target.query('SELECT aprovacao FROM projetos WHERE id_projeto=88')).rows[0].aprovacao,'aprovado');
 assert.deepEqual(Buffer.from((await target.query('SELECT conteudo FROM documento_itens')).rows[0].conteudo),bytes);
 const generated=(await target.query("INSERT INTO usuarios(nome,email,senha,tipo_usuario) VALUES('Novo','new@example.test','hash','discente') RETURNING id_usuario")).rows[0].id_usuario;
 assert.equal(generated,78);
 await assert.rejects(importDatabase(target,folder),/Destino não vazio/);
 assert.equal((await target.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,2);
 const taskFile=path.join(folder,'tarefas.jsonl'),saved=fs.readFileSync(taskFile);
 fs.appendFileSync(taskFile,'[]\n');await assert.rejects(transfer.inspectPackage(folder),/Checksum/);fs.writeFileSync(taskFile,saved);
});
test('formato distingue JSON null de SQL NULL e não perde precisão nem altera datas',()=>{
 const column={name:'preferencias',pgType:'jsonb'};
 const value=transfer.encode('{"n":9007199254740993,"a":1.00}',column);
 assert.equal(transfer.decode(value,column),'{"a":1e0,"n":9007199254740993e0}');
 assert.deepEqual(transfer.encode('null',column),{json:'null'});
 assert.equal(transfer.encode(null,column),null);
 assert.throws(()=>transfer.encode(new Date(),{name:'criado_em',pgType:'timestamp without time zone'}),/sem conversão/);
});
test('falha de integridade reverte carga, restaura gatilhos e mantém destino vazio',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'arcadia-transfer-rollback-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const source=new PGlite(engineOptions),target=new PGlite(engineOptions);t.after(()=>source.close());t.after(()=>target.close());
 await source.exec(schema);await target.exec(schema);
 await source.exec("INSERT INTO usuarios(id_usuario,nome,email,senha,tipo_usuario) VALUES(23,'Teste','rollback@example.test','hash','discente')");
 const folder=path.join(temp,'snapshot');await exportDatabase(mysqlFixture(source),folder);
 await target.exec("ALTER TABLE usuarios ADD CONSTRAINT fixture_reject_import CHECK (id_usuario<>23)");
 await assert.rejects(importDatabase(target,folder));
 assert.equal((await target.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,0);
 assert.equal((await target.query("SELECT count(*)::int AS n FROM pg_trigger WHERE NOT tgisinternal AND tgenabled<>'O'")).rows[0].n,0);
 assert.equal((await target.query("SELECT count(*)::int AS n FROM pg_constraint WHERE contype='f' AND condeferrable")).rows[0].n,0);
});
