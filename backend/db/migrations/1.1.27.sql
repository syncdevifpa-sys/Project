-- GERADO offline por tools/db/build-migrations.cjs. MySQL 8.4, backup e manutencao sem escritas.
-- Requer 1.1.26 registrada. Nao reaplicar versoes antigas nem schema.sql em banco existente.
-- Legado: projetos ficam privados; contas comuns permanecem externas. Pedido antigo comprova somente sua propria intencao.
SET @arc127_failed=0;

DELIMITER $$
DROP PROCEDURE IF EXISTS _arc127_assert$$
CREATE PROCEDURE _arc127_assert(IN ok BOOLEAN, IN message_text_value VARCHAR(128))
BEGIN
 IF NOT COALESCE(ok,FALSE) THEN
  SET @arc127_failed=1;
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=message_text_value;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc127_column$$
CREATE PROCEDURE _arc127_column(IN tbl VARCHAR(64),IN col VARCHAR(64),IN def TEXT,
 IN expected_type VARCHAR(1000),IN nullable_value BOOLEAN,IN default_value TEXT,
 IN auto_value BOOLEAN,IN on_update_value BOOLEAN,IN collation_value VARCHAR(64),IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_null VARCHAR(3); DECLARE actual_default TEXT;
 DECLARE actual_extra TEXT; DECLARE actual_collation VARCHAR(64); DECLARE found_count INT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc127_failed=1; RESIGNAL; END;
 CALL _arc127_assert(@arc127_failed=0,'Uma verificacao falhou. Pare e revise antes de continuar.');
 SELECT COUNT(*) INTO found_count FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
 IF found_count=0 THEN
  IF apply_missing THEN
   SET @arc127_sql=CONCAT('ALTER TABLE ',tbl,' ADD COLUMN ',def);
   PREPARE arc127_stmt FROM @arc127_sql; EXECUTE arc127_stmt; DEALLOCATE PREPARE arc127_stmt;
  END IF;
 ELSE
  SELECT LOWER(COLUMN_TYPE),IS_NULLABLE,LOWER(COLUMN_DEFAULT),LOWER(EXTRA),COLLATION_NAME
   INTO actual_type,actual_null,actual_default,actual_extra,actual_collation
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
  -- Remover apenas larguras historicas de inteiros, preservando enum/varchar.
  IF actual_type REGEXP '^(tinyint|smallint|int|bigint)[(]' THEN
   SET actual_type=CONCAT(SUBSTRING_INDEX(actual_type,'(',1),SUBSTRING(actual_type,LOCATE(')',actual_type)+1));
  END IF;
  CALL _arc127_assert(actual_type=LOWER(expected_type) AND (actual_null='YES')=nullable_value
   AND (REPLACE(actual_default,'()','') <=> REPLACE(LOWER(default_value),'()',''))
   AND (LOCATE('auto_increment',actual_extra)>0)=auto_value
   AND (LOCATE('on update current_timestamp',actual_extra)>0)=on_update_value
   AND (collation_value IS NULL OR actual_collation=collation_value),
   CONCAT('Coluna divergente: ',tbl,'.',col,'. Nenhum MODIFY automatico.'));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc127_index$$
CREATE PROCEDURE _arc127_index(IN tbl VARCHAR(64),IN idx VARCHAR(64),IN cols TEXT,IN unique_value BOOLEAN,IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_cols TEXT; DECLARE actual_unique BOOLEAN; DECLARE actual_prefix INT; DECLARE actual_type TEXT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc127_failed=1; RESIGNAL; END;
 CALL _arc127_assert(@arc127_failed=0,'Uma verificacao anterior falhou.');
 SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX),MIN(NON_UNIQUE)=0,
  SUM(SUB_PART IS NOT NULL),MIN(INDEX_TYPE) INTO actual_cols,actual_unique,actual_prefix,actual_type
 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND INDEX_NAME=idx;
 IF actual_cols IS NULL THEN
  IF apply_missing THEN
   SET @arc127_sql=CONCAT('ALTER TABLE ',tbl,' ADD ',IF(unique_value AND idx<>'PRIMARY','UNIQUE ',''),
    IF(idx='PRIMARY','PRIMARY KEY',CONCAT('INDEX ',idx,'')),' (',cols,')');
   PREPARE arc127_stmt FROM @arc127_sql; EXECUTE arc127_stmt; DEALLOCATE PREPARE arc127_stmt;
  END IF;
 ELSE
  CALL _arc127_assert(actual_cols=cols AND actual_unique=unique_value AND actual_prefix=0 AND actual_type='BTREE',
   CONCAT('Indice divergente: ',tbl,'.',idx));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc127_fk$$
CREATE PROCEDURE _arc127_fk(IN tbl VARCHAR(64),IN cols TEXT,IN parent_tbl VARCHAR(64),IN parent_cols TEXT,IN delete_rule_value VARCHAR(16),IN apply_missing BOOLEAN)
BEGIN
 DECLARE conflicting INT DEFAULT 0; DECLARE matching INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc127_failed=1; RESIGNAL; END;
 CALL _arc127_assert(@arc127_failed=0,'Uma verificacao anterior falhou.');
 SELECT COUNT(*),COALESCE(SUM(parent_name=parent_tbl AND ref_cols=parent_cols AND rule_value=delete_rule_value AND update_value IN ('RESTRICT','NO ACTION')),0)
 INTO conflicting,matching FROM (
  SELECT k.CONSTRAINT_NAME,MAX(k.REFERENCED_TABLE_NAME) AS parent_name,
   GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS local_cols,
   GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS ref_cols,
   MAX(r.DELETE_RULE) AS rule_value,MAX(r.UPDATE_RULE) AS update_value
  FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r
   ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
  WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.TABLE_NAME=tbl AND k.REFERENCED_TABLE_NAME IS NOT NULL
  GROUP BY k.CONSTRAINT_NAME
 ) relationships WHERE local_cols=cols;
 CALL _arc127_assert(conflicting=matching,CONCAT('FK divergente: ',tbl,' (',cols,')'));
 IF matching=0 AND apply_missing THEN
  SET @arc127_sql=CONCAT('ALTER TABLE ',tbl,' ADD FOREIGN KEY (',cols,') REFERENCES ',parent_tbl,' (',parent_cols,') ON DELETE ',delete_rule_value);
  PREPARE arc127_stmt FROM @arc127_sql; EXECUTE arc127_stmt; DEALLOCATE PREPARE arc127_stmt;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc127_names$$
CREATE PROCEDURE _arc127_names()
BEGIN
 DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
  SET SESSION sql_safe_updates=previous_safe; SET @arc127_failed=1; RESIGNAL;
 END;
 CALL _arc127_assert(@arc127_failed=0,'Uma verificacao anterior falhou.');
 IF EXISTS(SELECT 1 FROM academico_turmas WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')))) THEN
  CALL _arc127_assert(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND INDEX_NAME='uq_turma_nome_global'),
   'Chaves de nomes inconsistentes com indice existente. Revise manualmente.');
  SET SESSION sql_safe_updates=0;
  UPDATE academico_turmas SET nome_chave=LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '))
   WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')));
  SET SESSION sql_safe_updates=previous_safe;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc127_check$$
CREATE PROCEDURE _arc127_check(IN apply_missing BOOLEAN)
BEGIN
 DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc127_failed=1; RESIGNAL; END;
 CALL _arc127_assert(@arc127_failed=0,'Uma verificacao anterior falhou.');
 SELECT MAX(c.CHECK_CLAUSE),MAX(t.ENFORCED) INTO clause_value,enforced_value
 FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c
 ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
 WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='academico_disciplinas' AND t.CONSTRAINT_NAME='chk_oferta_semestre';
 IF clause_value IS NULL THEN
  IF apply_missing THEN
   ALTER TABLE academico_disciplinas ADD CONSTRAINT chk_oferta_semestre CHECK
    ((regime_letivo='semestral' AND semestre IN (1,2)) OR (regime_letivo IN ('legado','anual') AND semestre=0));
  END IF;
 ELSE
  CALL _arc127_assert(enforced_value='YES','CHECK de semestre esta desativado.');
  -- CHECK_CLAUSE pode devolver delimitadores de strings como barra+aspas.
  -- Nesta regra, os tres literais ENUM nao contem aspas ou barras internas.
  -- Normalizar apenas esses literais conhecidos, sem mudar sql_mode nem a constraint.
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'semestral',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'semestral',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'legado',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'legado',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'anual',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'anual',CHAR(39)));
  -- Compara todo o dominio: tres valores ENUM x todos os 256 valores TINYINT UNSIGNED.
  SET @arc127_sql=CONCAT('SELECT SUM(COALESCE((',clause_value,'),1) <> ((regime_letivo=''semestral'' AND semestre IN (1,2)) OR (regime_letivo IN (''legado'',''anual'') AND semestre=0))) INTO @arc127_check_diff FROM (WITH RECURSIVE n AS (SELECT 0 AS semestre UNION ALL SELECT semestre+1 FROM n WHERE semestre<255) SELECT n.semestre,r.regime_letivo FROM n CROSS JOIN (SELECT ''legado'' AS regime_letivo UNION ALL SELECT ''anual'' UNION ALL SELECT ''semestral'') r) domain_values');
  PREPARE arc127_stmt FROM @arc127_sql; EXECUTE arc127_stmt; DEALLOCATE PREPARE arc127_stmt;
  CALL _arc127_assert(@arc127_check_diff=0,'CHECK de semestre tem regra divergente.');
 END IF;
END$$
DELIMITER ;

CALL _arc127_assert(VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%','Requer MySQL 8.4.');
CALL _arc127_assert(EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.26' AND checksum='775c0b671b7384d5a1474c34a23d412d3a7a73b5f6a7a58da85b634ad79d25c6'),'Confira o registro 1.1.26 antes.');
CALL _arc127_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.27' AND checksum<>'d9fd23826f42a137bc3ccc4df312df48c6efd2e21d8d324aa62cf068a18135ad'),'Checksum 1.1.27 divergente.');
CALL _arc127_column('tarefas','id_externo','id_externo INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc127_column('publico_externo','intencao_cadastro','intencao_cadastro ENUM(''externo'',''docente'',''servidor'') NOT NULL DEFAULT ''externo''','enum(''externo'',''docente'',''servidor'')','0','externo','0','0',NULL,'0');
CALL _arc127_column('docente_requisitos','tipo_solicitado','tipo_solicitado ENUM(''docente'',''servidor'') NOT NULL DEFAULT ''docente''','enum(''docente'',''servidor'')','0','docente','0','0',NULL,'0');
CALL _arc127_column('projetos','visibilidade','visibilidade ENUM(''privado'',''publico'') NOT NULL DEFAULT ''privado''','enum(''privado'',''publico'')','0','privado','0','0',NULL,'0');
CALL _arc127_index('tarefas','idx_tarefas_externo','id_externo,data_entrega','0','0');
CALL _arc127_fk('tarefas','id_externo','publico_externo','id_externo','CASCADE','0');
CALL _arc127_column('tarefas','id_externo','id_externo INT NULL','int','1',NULL,'0','0',NULL,'1');
CALL _arc127_column('publico_externo','intencao_cadastro','intencao_cadastro ENUM(''externo'',''docente'',''servidor'') NOT NULL DEFAULT ''externo''','enum(''externo'',''docente'',''servidor'')','0','externo','0','0',NULL,'1');
CALL _arc127_column('docente_requisitos','tipo_solicitado','tipo_solicitado ENUM(''docente'',''servidor'') NOT NULL DEFAULT ''docente''','enum(''docente'',''servidor'')','0','docente','0','0',NULL,'1');
CALL _arc127_column('projetos','visibilidade','visibilidade ENUM(''privado'',''publico'') NOT NULL DEFAULT ''privado''','enum(''privado'',''publico'')','0','privado','0','0',NULL,'1');
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc127_external_tasks$$
CREATE PROCEDURE _arc127_external_tasks()
BEGIN
 DECLARE kind_value TEXT; DECLARE nullable_value VARCHAR(3); DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc127_failed=1; RESIGNAL; END;
 CALL _arc127_assert(@arc127_failed=0,'Verificacao anterior falhou.');
 SELECT COLUMN_TYPE,IS_NULLABLE INTO kind_value,nullable_value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tarefas' AND COLUMN_NAME='id_usuario';
 CALL _arc127_assert(kind_value IN ('int','int(11)') AND nullable_value IN ('YES','NO'),'Titular de tarefas divergente.');
 CALL _arc127_assert(NOT EXISTS(SELECT 1 FROM tarefas WHERE (id_usuario IS NULL)=(id_externo IS NULL)),'Ha tarefas sem titular ou com dois titulares. Revise sem apagar.');
 IF nullable_value='NO' THEN ALTER TABLE tarefas MODIFY COLUMN id_usuario INT NULL; END IF;
 SELECT MAX(c.CHECK_CLAUSE),MAX(t.ENFORCED) INTO clause_value,enforced_value FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='tarefas' AND t.CONSTRAINT_NAME='chk_tarefa_titular';
 IF clause_value IS NULL THEN ALTER TABLE tarefas ADD CONSTRAINT chk_tarefa_titular CHECK ((id_usuario IS NULL) <> (id_externo IS NULL));
 ELSE CALL _arc127_assert(enforced_value='YES' AND REGEXP_REPLACE(LOWER(REPLACE(clause_value,CHAR(96),'')),'[[:space:]()]','')='id_usuarioisnull<>id_externoisnull','CHECK de tarefas divergente.'); END IF;
END$$
DELIMITER ;
CALL _arc127_external_tasks();
CALL _arc127_fk('tarefas','id_externo','publico_externo','id_externo','CASCADE','1');
CALL _arc127_index('tarefas','idx_tarefas_externo','id_externo,data_entrega','0','1');
CALL _arc127_fk('tarefas','id_usuario','usuarios','id_usuario','CASCADE',0);
CALL _arc127_assert(EXISTS(SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='tarefas' AND COLUMN_NAME='id_usuario' AND REFERENCED_TABLE_NAME='usuarios' AND REFERENCED_COLUMN_NAME='id_usuario'),'FK institucional de tarefas ausente.');
CALL _arc127_column('tarefas','id_externo','id_externo INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc127_column('publico_externo','intencao_cadastro','intencao_cadastro ENUM(''externo'',''docente'',''servidor'') NOT NULL DEFAULT ''externo''','enum(''externo'',''docente'',''servidor'')','0','externo','0','0',NULL,'0');
CALL _arc127_column('docente_requisitos','tipo_solicitado','tipo_solicitado ENUM(''docente'',''servidor'') NOT NULL DEFAULT ''docente''','enum(''docente'',''servidor'')','0','docente','0','0',NULL,'0');
CALL _arc127_column('projetos','visibilidade','visibilidade ENUM(''privado'',''publico'') NOT NULL DEFAULT ''privado''','enum(''privado'',''publico'')','0','privado','0','0',NULL,'0');
INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.27','d9fd23826f42a137bc3ccc4df312df48c6efd2e21d8d324aa62cf068a18135ad' WHERE @arc127_failed=0;
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.27';
DROP PROCEDURE IF EXISTS _arc127_column;
DROP PROCEDURE IF EXISTS _arc127_index;
DROP PROCEDURE IF EXISTS _arc127_fk;
DROP PROCEDURE IF EXISTS _arc127_names;
DROP PROCEDURE IF EXISTS _arc127_check;
DROP PROCEDURE IF EXISTS _arc127_external_tasks;
DROP PROCEDURE IF EXISTS _arc127_assert;
