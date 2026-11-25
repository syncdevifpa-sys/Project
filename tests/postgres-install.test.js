const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {citext}=require('@electric-sql/pglite/contrib/citext');
const {hashText}=require('../tools/lib/postgres-manifest.cjs');
const sql=fs.readFileSync('backend/db/postgres/instalacao-completa.sql','utf8');
const manifest=JSON.parse(fs.readFileSync('backend/db/postgres/manifest.json','utf8'));
test('instalação PostgreSQL única inclui migrações, referências e catálogo sem dados pessoais',async()=>{
 const db=new PGlite({extensions:{citext}});
 try{
  await db.exec(sql);
  const counts=(await db.query(`SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public')::int AS tabelas,(SELECT count(*) FROM cursos)::int AS cursos,(SELECT count(*) FROM academico_catalogo_disciplinas)::int AS disciplinas,(SELECT count(*) FROM usuarios)::int AS contas,(SELECT count(*) FROM arcadia_schema_migrations)::int AS migracoes_mysql`)).rows[0];
  assert.deepEqual(counts,{tabelas:53,cursos:48,disciplinas:1450,contas:0,migracoes_mysql:0});
  const columns=(await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'")).rows;
  for(const file of fs.readdirSync('backend/db/migrations').filter(name=>name.endsWith('.json'))){const migration=JSON.parse(fs.readFileSync('backend/db/migrations/'+file));for(const column of migration.columns||[])assert.ok(columns.some(row=>row.table_name===column.table&&row.column_name===column.name),file+': '+column.name);}
  for(const [table,column] of [['cursos','total_etapas'],['docente_requisitos','etapa_atual'],['projetos','fixado'],['projetos','capa'],['documento_itens','autor_obra'],['academico_publicacoes','tipo_atividade'],['google_export_destinos','tasklist_id'],['tarefa_arquivos','arquivada_em']])assert.ok(columns.some(row=>row.table_name===table&&row.column_name===column),table+'.'+column);
  const longest=(await db.query('SELECT max(char_length(nome))::int AS tamanho FROM academico_catalogo_disciplinas')).rows[0].tamanho;assert.equal(longest,117);
  assert.equal(Number((await db.query("SELECT count(*) AS total FROM cursos WHERE total_etapas IS NOT NULL")).rows[0].total)>30,true);
  assert.equal((await db.query('SELECT checksum FROM arcadia_postgres_baselines')).rows[0].checksum,manifest.sha256);
  assert.equal(manifest.checksumAlgorithm,'sha256-utf8-lf');
  for(const source of manifest.sources)assert.equal(hashText(fs.readFileSync(source.file)),source.sha256,source.file);
  /* Exclusão de oferta mantém catálogo e turma; vínculo da oferta acompanha a FK. */
  await db.exec("INSERT INTO academico_catalogo_disciplinas(nome,nome_chave) VALUES('Disciplina de teste','teste-integridade');");
  await assert.rejects(db.exec(sql),/esquema vazio/);await db.exec('ROLLBACK');
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM academico_catalogo_disciplinas')).rows[0].n),1451);
 }finally{await db.close();}
});

test('manifesto PostgreSQL ignora CRLF mas detecta alteração de conteúdo',()=>{
 const expected=crypto.createHash('sha256').update('select 1;\nselect 2;\n').digest('hex');
 assert.equal(hashText(Buffer.from('select 1;\r\nselect 2;\r\n')),expected);
 assert.equal(hashText('select 1;\nselect 2;\n'),expected);
 assert.notEqual(hashText('select 1;\nselect 3;\n'),expected);
});
test('falha na carga inicial desfaz toda a instalação consolidada',async()=>{
 const db=new PGlite({extensions:{citext}});
 try{await assert.rejects(db.exec(sql.replace('INSERT INTO cursos','INSERT INTO tabela_inexistente')),/tabela_inexistente/);await db.exec('ROLLBACK');assert.equal(Number((await db.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n),0);}finally{await db.close();}
});
