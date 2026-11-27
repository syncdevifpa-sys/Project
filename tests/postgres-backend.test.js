const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {citext}=require('@electric-sql/pglite/contrib/citext');
const {createBackend}=require('../backend/src/database/postgres-backend');
const {compile,dateValue}=require('../backend/src/database/postgres-dialect');
const catalog=require('../backend/src/database/postgres-catalog.json');
const {driver}=require('../backend/src/database/driver');

function fixture(engine) {
 const client={query:(...args)=>engine.query(...args),release(){}};
 return createBackend({...client,connect:async()=>client,end:()=>engine.close()});
}
test('seleção do driver mantém MySQL por padrão e exige autorização separada para produção',()=>{
 assert.equal(driver({}),'mysql');assert.equal(driver({DB_CLIENT:'postgres'}),'postgres');
 assert.throws(()=>driver({DB_CLIENT:'sqlite'}),/DB_CLIENT/);
 assert.throws(()=>driver({DB_CLIENT:'postgres',VERCEL_ENV:'production'}),/autorização/);
 assert.equal(driver({DB_CLIENT:'postgres',VERCEL_ENV:'preview',NODE_ENV:'production'}),'postgres');
 assert.equal(dateValue(new Date('2027-01-01T01:00:00.125Z')),'2026-12-31 22:00:00.125');
});
test('compilador preserva literais, parametrização e rejeita múltiplas instruções',()=>{
 const q=compile("SELECT 'ON DUPLICATE KEY UPDATE ? LIKE $1 IS NULL' AS value WHERE ? IS NULL",[null],catalog);
 assert.match(q.text,/'ON DUPLICATE KEY UPDATE \? LIKE \$1 IS NULL'/);
 assert.match(q.text,/CAST\(\$1 AS text\) IS NULL/);
 assert.throws(()=>compile('SELECT 1; SELECT 2',[],catalog),/uma instrução/);
 assert.throws(()=>compile('SELECT ?',[],catalog),/parâmetros/);
});
test('contrato completo execute/getConnection roda no PostgreSQL sem tradução dos valores',async t=>{
 const engine=new PGlite({extensions:{citext}});t.after(()=>engine.close());
 await engine.exec(fs.readFileSync('backend/db/postgres/schema.sql','utf8'));
 const db=fixture(engine);
 const [user]=await db.execute("INSERT INTO usuarios(nome,email,senha,tipo_usuario) VALUES(?,?,?,'docente')",['Teste','doc@example.test','AaBbHash']);
 assert.equal(user.insertId,1);assert.equal(user.affectedRows,1);
 const [columns]=await db.execute("SHOW COLUMNS FROM avisos LIKE 'publico_alvo'");assert.match(columns[0].Type,/^set\(/);
 const [authors]=await db.execute("SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documento_itens' AND COLUMN_NAME = 'autor_obra'");
 assert.equal(authors[0].COLUMN_TYPE,'varchar(500)');
 const [fk]=await db.execute('SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME=? AND REFERENCED_COLUMN_NAME=?',['usuarios','id_usuario']);assert.ok(fk.some(r=>r.TABLE_NAME==='tarefas'));
 const connection=await db.getConnection();await connection.beginTransaction();
 await assert.rejects(connection.execute("INSERT INTO usuarios(nome,email,senha,tipo_usuario) VALUES(?,?,?,'docente')",['Outro','doc@example.test','hash']),{code:'ER_DUP_ENTRY'});
 // Erro tratado pelo serviço não pode abortar as instruções seguintes da transação.
 await connection.execute('UPDATE usuarios SET nome=? WHERE id_usuario=?',["Nome ? '$1'",1]);await connection.commit();connection.release();
 assert.equal((await db.execute('SELECT nome FROM usuarios WHERE id_usuario=?',[1]))[0][0].nome,"Nome ? '$1'");
 await db.execute('INSERT INTO perfil_compartilhamento(id_usuario,mostrar_email) VALUES(?,?) ON DUPLICATE KEY UPDATE mostrar_email=?',[1,0,1]);
 await db.execute('INSERT INTO perfil_compartilhamento(id_usuario,mostrar_email) VALUES(?,?) ON DUPLICATE KEY UPDATE mostrar_email=?',[1,0,1]);
 assert.equal((await db.execute('SELECT mostrar_email FROM perfil_compartilhamento WHERE id_usuario=?',[1]))[0][0].mostrar_email,1);
 await db.execute("INSERT INTO publico_externo(nome,email,senha) VALUES('Externo','ext@example.test','hash')");
 await db.execute('INSERT INTO perfil_compartilhamento(id_externo,mostrar_email) VALUES(?,?) ON DUPLICATE KEY UPDATE mostrar_email=?',[1,0,1]);
 await db.execute('INSERT INTO perfil_compartilhamento(id_externo,mostrar_email) VALUES(?,?) ON DUPLICATE KEY UPDATE mostrar_email=?',[1,0,1]);
 const [time]=await db.execute("SELECT DATE_FORMAT(DATE_ADD(?,INTERVAL 1 DAY),'%Y-%m-%dT%H:%i:%s.000Z') AS instant",['2027-03-04 12:30:10']);
 assert.equal(time[0].instant,'2027-03-05T12:30:10.000Z');
 const [ignored]=await db.execute("INSERT IGNORE INTO google_export_destinos(titular_tipo,titular_id,google_sub) VALUES('users',1,'sub')");assert.equal(ignored.affectedRows,1);
 assert.equal((await db.execute("INSERT IGNORE INTO google_export_destinos(titular_tipo,titular_id,google_sub) VALUES('users',1,'sub')"))[0].affectedRows,0);
 await db.execute("UPDATE google_export_destinos SET reserva_ate=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 3 MINUTE) WHERE titular_id=?",[1]);
 await assert.rejects(db.execute('DROP TABLE usuarios'),/DML/);
 for(const status of ['concluida','em_andamento','aberta'])await db.execute('INSERT INTO tarefas(id_usuario,titulo,status) VALUES(?,?,?)',[1,status,status]);
 assert.deepEqual((await db.execute('SELECT status FROM tarefas ORDER BY status ASC'))[0].map(row=>row.status),['aberta','em_andamento','concluida']);
 assert.equal(await db.schemaReady(),true);
 await engine.exec('ALTER TABLE academico_pedidos_ingresso DROP CONSTRAINT uq_pedido_pendente');
 assert.equal(await db.schemaReady(),false);
});
module.exports={fixture};
