// Somente geracao offline. Nao altera dados de contas, papeis ou projetos legados.
const {helpers,column,index,fk,checksum}=require('./migration-sql.cjs');
const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
function generate(spec){
 const base=checksum(require('../../backend/db/migrations/1.1.26.json'));
 const out=[
  '-- GERADO offline por tools/db/build-migrations.cjs. MySQL 8.4, backup e manutencao sem escritas.',
  '-- Requer 1.1.26 registrada. Nao reaplicar versoes antigas nem schema.sql em banco existente.',
  '-- Legado: projetos ficam privados; contas comuns permanecem externas. Pedido antigo comprova somente sua propria intencao.',
  'SET @arc125_failed=0;',helpers,
  "CALL _arc125_assert(VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%','Requer MySQL 8.4.');",
  `CALL _arc125_assert(EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.26' AND checksum=${q(base)}),'Confira o registro 1.1.26 antes.');`,
  `CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.27' AND checksum<>${q(checksum(spec))}),'Checksum 1.1.27 divergente.');`,
  ...spec.columns.map(c=>column(c,false)),...spec.indexes.map(i=>index(i,false)),...spec.foreignKeys.map(f=>fk(f,false)),
  ...spec.columns.map(c=>column(c,true)),
  `DELIMITER $$
DROP PROCEDURE IF EXISTS _arc125_external_tasks$$
CREATE PROCEDURE _arc125_external_tasks()
BEGIN
 DECLARE kind_value TEXT; DECLARE nullable_value VARCHAR(3); DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Verificacao anterior falhou.');
 SELECT COLUMN_TYPE,IS_NULLABLE INTO kind_value,nullable_value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tarefas' AND COLUMN_NAME='id_usuario';
 CALL _arc125_assert(kind_value IN ('int','int(11)') AND nullable_value IN ('YES','NO'),'Titular de tarefas divergente.');
 CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM tarefas WHERE (id_usuario IS NULL)=(id_externo IS NULL)),'Ha tarefas sem titular ou com dois titulares. Revise sem apagar.');
 IF nullable_value='NO' THEN ALTER TABLE tarefas MODIFY COLUMN id_usuario INT NULL; END IF;
 SELECT MAX(c.CHECK_CLAUSE),MAX(t.ENFORCED) INTO clause_value,enforced_value FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='tarefas' AND t.CONSTRAINT_NAME='chk_tarefa_titular';
 IF clause_value IS NULL THEN ALTER TABLE tarefas ADD CONSTRAINT chk_tarefa_titular CHECK ((id_usuario IS NULL) <> (id_externo IS NULL));
 ELSE CALL _arc125_assert(enforced_value='YES' AND REGEXP_REPLACE(LOWER(REPLACE(clause_value,CHAR(96),'')),'[[:space:]()]','')='id_usuarioisnull<>id_externoisnull','CHECK de tarefas divergente.'); END IF;
END$$
DELIMITER ;
CALL _arc125_external_tasks();`,
  ...spec.foreignKeys.map(f=>fk(f,true)),...spec.indexes.map(i=>index(i,true)),
  "CALL _arc125_fk('tarefas','id_usuario','usuarios','id_usuario','CASCADE',0);",
  "CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='tarefas' AND COLUMN_NAME='id_usuario' AND REFERENCED_TABLE_NAME='usuarios' AND REFERENCED_COLUMN_NAME='id_usuario'),'FK institucional de tarefas ausente.');",
  ...spec.columns.map(c=>column(c,false)),
  `INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.27',${q(checksum(spec))} WHERE @arc125_failed=0;`,
  "SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.27';",
  ...['column','index','fk','names','check','external_tasks','assert'].map(name=>'DROP PROCEDURE IF EXISTS _arc125_'+name+';')];
 return out.join('\n').replaceAll('arc125','arc127')+'\n';
}
module.exports={generate};
