// Geração offline de evolução explícita. Não altera a versão 1.1.25 já publicada.
const { helpers, column, index, fk, checksum, triggerCheck }=require('./migration-sql.cjs');
const q=(s)=>"'"+String(s).replace(/'/g,"''")+"'";
function generate(spec) {
    const hash=checksum(spec);
    const baselineHash=checksum(require('../../backend/db/migrations/1.1.25.json'));
    const sql=[`-- GERADO offline por tools/build-db-migration.cjs. MySQL 8.4.
-- Requer contrato 1.1.25 conferido/registrado, backup e manutencao sem envios/escritas.
-- Workbench: parar no primeiro erro e mesma conexao. DDL confirma implicitamente.
-- Nenhum usuario/dado e removido. Muda apenas nulabilidade do titular para permitir externo.
SET @arc125_failed=0;`,helpers,
    "CALL _arc125_assert(VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%','Esta migracao foi preparada para MySQL 8.4.');",
    `CALL _arc125_assert(EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.25' AND checksum=${q(baselineHash)}),'Confira e registre a consolidacao 1.1.25 primeiro.');`,
    `CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.26' AND checksum<>${q(hash)}),'Checksum divergente para 1.1.26.');`,
    ...spec.columns.map((c)=>column(c,false)),...spec.indexes.map((i)=>index(i,false)),...spec.foreignKeys.map((i)=>fk(i,false)),...spec.triggers.map((t)=>triggerCheck(t)),
    `DELIMITER $$
DROP PROCEDURE IF EXISTS _arc125_evolve$$
CREATE PROCEDURE _arc125_evolve()
BEGIN
 DECLARE kind_value TEXT; DECLARE nullable_value VARCHAR(3); DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET SESSION sql_safe_updates=previous_safe; SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao anterior falhou.');
 SELECT COLUMN_TYPE,IS_NULLABLE INTO kind_value,nullable_value FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembretes' AND COLUMN_NAME='id_usuario';
 CALL _arc125_assert(kind_value IN ('int','int(11)') AND nullable_value IN ('YES','NO'),'Tipo de titular divergente. Nao modificar automaticamente.');
 IF nullable_value='NO' THEN ALTER TABLE lembretes MODIFY COLUMN id_usuario INT NULL; END IF;
 SELECT COLUMN_TYPE INTO kind_value FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='estado';
 CALL _arc125_assert(kind_value IN ('enum(''reservado'',''enviado'',''falhou'',''cancelado'')','enum(''reservado'',''enviado'',''falhou'',''cancelado'',''aguardando'',''enviando'')'),'Estados de envio divergentes.');
 IF kind_value='enum(''reservado'',''enviado'',''falhou'',''cancelado'')' THEN
  ALTER TABLE lembrete_envios MODIFY COLUMN estado ENUM('reservado','enviado','falhou','cancelado','aguardando','enviando') NOT NULL DEFAULT 'reservado';
 END IF;
END$$
DELIMITER ;`,
    ...spec.columns.map((c)=>column(c,true)),
    "CALL _arc125_fk('lembretes','id_usuario','usuarios','id_usuario','CASCADE',0);",
    'CALL _arc125_evolve();',
    "CALL _arc125_fk('lembretes','id_usuario','usuarios','id_usuario','CASCADE',1);",
    "CALL _arc125_fk('lembretes','id_evento','calendario','id_evento','SET NULL',1);",
    ...spec.foreignKeys.map((i)=>fk(i,true)),...spec.indexes.map((i)=>index(i,true)),
    `DELIMITER $$
DROP PROCEDURE IF EXISTS _arc125_contexts$$
CREATE PROCEDURE _arc125_contexts()
BEGIN
 DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET SESSION sql_safe_updates=previous_safe; SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao anterior falhou.');
 CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM lembretes WHERE (id_usuario IS NULL)=(id_externo IS NULL)), 'Ha lembretes sem titular ou com dois titulares. Revise sem apagar dados.');
 CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM lembretes WHERE (id_tarefa IS NOT NULL)+(id_evento IS NOT NULL)+(id_evento_externo IS NOT NULL)>1),'Ha lembretes com vinculos ambiguos. Revise antes de continuar.');
 SELECT MAX(c.CHECK_CLAUSE),MAX(t.ENFORCED) INTO clause_value,enforced_value FROM information_schema.TABLE_CONSTRAINTS t
 JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
 WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='lembretes' AND t.CONSTRAINT_NAME='chk_lembrete_titular';
 IF clause_value IS NULL THEN ALTER TABLE lembretes ADD CONSTRAINT chk_lembrete_titular CHECK ((id_usuario IS NULL) <> (id_externo IS NULL));
 ELSE
  CALL _arc125_assert(enforced_value='YES' AND REGEXP_REPLACE(LOWER(REPLACE(clause_value,CHAR(96),'')),'[[:space:]()]','')='id_usuarioisnull<>id_externoisnull','CHECK do titular divergente.');
 END IF;
 SET SESSION sql_safe_updates=0;
 UPDATE lembretes SET contexto='tarefa' WHERE contexto='avulso' AND id_tarefa IS NOT NULL;
 -- Eventos legados sao desativados ate revisao explicita; nao presumir permissao/horario.
 UPDATE lembretes SET contexto='calendario',ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE contexto='avulso' AND id_evento IS NOT NULL;
 SET SESSION sql_safe_updates=previous_safe;
END$$
DELIMITER ;
CALL _arc125_contexts();
DELIMITER $$`,
    ...spec.triggers.map((t)=>`CREATE TRIGGER IF NOT EXISTS ${t.name} ${t.timing} ${t.event} ON ${t.table} FOR EACH ROW\n${t.body}$$`),
    'DELIMITER ;',...spec.triggers.map((t)=>triggerCheck(t,true)),...spec.columns.map((c)=>column(c,false)),
    `INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.26',${q(hash)} WHERE @arc125_failed=0;`,
    "SELECT * FROM arcadia_schema_migrations WHERE versao='1.1.26';",
    ...['assert','column','index','fk','names','check','evolve','contexts'].map((n)=>'DROP PROCEDURE IF EXISTS _arc125_'+n+';')];
    return sql.join('\n').replaceAll('arc125','arc126')+'\n';
}
module.exports={generate};
