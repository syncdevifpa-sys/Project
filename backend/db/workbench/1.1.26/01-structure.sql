-- GERADO offline por tools/db/build-migrations.cjs. MySQL 8.4.
-- Requer contrato 1.1.25 conferido/registrado, backup e manutencao sem envios/escritas.
-- Workbench: parar no primeiro erro e mesma conexao. DDL confirma implicitamente.
-- Nenhum usuario/dado e removido. Muda apenas nulabilidade do titular para permitir externo.
SET @arc126_failed=0;

DELIMITER $$
DROP PROCEDURE IF EXISTS _arc126_assert$$
CREATE PROCEDURE _arc126_assert(IN ok BOOLEAN, IN message_text_value VARCHAR(128))
BEGIN
 IF NOT COALESCE(ok,FALSE) THEN
  SET @arc126_failed=1;
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=message_text_value;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc126_column$$
CREATE PROCEDURE _arc126_column(IN tbl VARCHAR(64),IN col VARCHAR(64),IN def TEXT,
 IN expected_type VARCHAR(1000),IN nullable_value BOOLEAN,IN default_value TEXT,
 IN auto_value BOOLEAN,IN on_update_value BOOLEAN,IN collation_value VARCHAR(64),IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_null VARCHAR(3); DECLARE actual_default TEXT;
 DECLARE actual_extra TEXT; DECLARE actual_collation VARCHAR(64); DECLARE found_count INT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc126_failed=1; RESIGNAL; END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao falhou. Pare e revise antes de continuar.');
 SELECT COUNT(*) INTO found_count FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
 IF found_count=0 THEN
  IF apply_missing THEN
   SET @arc126_sql=CONCAT('ALTER TABLE ',tbl,' ADD COLUMN ',def);
   PREPARE arc126_stmt FROM @arc126_sql; EXECUTE arc126_stmt; DEALLOCATE PREPARE arc126_stmt;
  END IF;
 ELSE
  SELECT LOWER(COLUMN_TYPE),IS_NULLABLE,LOWER(COLUMN_DEFAULT),LOWER(EXTRA),COLLATION_NAME
   INTO actual_type,actual_null,actual_default,actual_extra,actual_collation
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
  -- Remover apenas larguras historicas de inteiros, preservando enum/varchar.
  IF actual_type REGEXP '^(tinyint|smallint|int|bigint)[(]' THEN
   SET actual_type=CONCAT(SUBSTRING_INDEX(actual_type,'(',1),SUBSTRING(actual_type,LOCATE(')',actual_type)+1));
  END IF;
  CALL _arc126_assert(actual_type=LOWER(expected_type) AND (actual_null='YES')=nullable_value
   AND (REPLACE(actual_default,'()','') <=> REPLACE(LOWER(default_value),'()',''))
   AND (LOCATE('auto_increment',actual_extra)>0)=auto_value
   AND (LOCATE('on update current_timestamp',actual_extra)>0)=on_update_value
   AND (collation_value IS NULL OR actual_collation=collation_value),
   CONCAT('Coluna divergente: ',tbl,'.',col,'. Nenhum MODIFY automatico.'));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc126_index$$
CREATE PROCEDURE _arc126_index(IN tbl VARCHAR(64),IN idx VARCHAR(64),IN cols TEXT,IN unique_value BOOLEAN,IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_cols TEXT; DECLARE actual_unique BOOLEAN; DECLARE actual_prefix INT; DECLARE actual_type TEXT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc126_failed=1; RESIGNAL; END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao anterior falhou.');
 SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX),MIN(NON_UNIQUE)=0,
  SUM(SUB_PART IS NOT NULL),MIN(INDEX_TYPE) INTO actual_cols,actual_unique,actual_prefix,actual_type
 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND INDEX_NAME=idx;
 IF actual_cols IS NULL THEN
  IF apply_missing THEN
   SET @arc126_sql=CONCAT('ALTER TABLE ',tbl,' ADD ',IF(unique_value AND idx<>'PRIMARY','UNIQUE ',''),
    IF(idx='PRIMARY','PRIMARY KEY',CONCAT('INDEX ',idx,'')),' (',cols,')');
   PREPARE arc126_stmt FROM @arc126_sql; EXECUTE arc126_stmt; DEALLOCATE PREPARE arc126_stmt;
  END IF;
 ELSE
  CALL _arc126_assert(actual_cols=cols AND actual_unique=unique_value AND actual_prefix=0 AND actual_type='BTREE',
   CONCAT('Indice divergente: ',tbl,'.',idx));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc126_fk$$
CREATE PROCEDURE _arc126_fk(IN tbl VARCHAR(64),IN cols TEXT,IN parent_tbl VARCHAR(64),IN parent_cols TEXT,IN delete_rule_value VARCHAR(16),IN apply_missing BOOLEAN)
BEGIN
 DECLARE conflicting INT DEFAULT 0; DECLARE matching INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc126_failed=1; RESIGNAL; END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao anterior falhou.');
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
 CALL _arc126_assert(conflicting=matching,CONCAT('FK divergente: ',tbl,' (',cols,')'));
 IF matching=0 AND apply_missing THEN
  SET @arc126_sql=CONCAT('ALTER TABLE ',tbl,' ADD FOREIGN KEY (',cols,') REFERENCES ',parent_tbl,' (',parent_cols,') ON DELETE ',delete_rule_value);
  PREPARE arc126_stmt FROM @arc126_sql; EXECUTE arc126_stmt; DEALLOCATE PREPARE arc126_stmt;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc126_names$$
CREATE PROCEDURE _arc126_names()
BEGIN
 DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
  SET SESSION sql_safe_updates=previous_safe; SET @arc126_failed=1; RESIGNAL;
 END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao anterior falhou.');
 IF EXISTS(SELECT 1 FROM academico_turmas WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')))) THEN
  CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND INDEX_NAME='uq_turma_nome_global'),
   'Chaves de nomes inconsistentes com indice existente. Revise manualmente.');
  SET SESSION sql_safe_updates=0;
  UPDATE academico_turmas SET nome_chave=LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '))
   WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')));
  SET SESSION sql_safe_updates=previous_safe;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc126_check$$
CREATE PROCEDURE _arc126_check(IN apply_missing BOOLEAN)
BEGIN
 DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc126_failed=1; RESIGNAL; END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao anterior falhou.');
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
  CALL _arc126_assert(enforced_value='YES','CHECK de semestre esta desativado.');
  -- CHECK_CLAUSE pode devolver delimitadores de strings como barra+aspas.
  -- Nesta regra, os tres literais ENUM nao contem aspas ou barras internas.
  -- Normalizar apenas esses literais conhecidos, sem mudar sql_mode nem a constraint.
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'semestral',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'semestral',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'legado',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'legado',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'anual',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'anual',CHAR(39)));
  -- Compara todo o dominio: tres valores ENUM x todos os 256 valores TINYINT UNSIGNED.
  SET @arc126_sql=CONCAT('SELECT SUM(COALESCE((',clause_value,'),1) <> ((regime_letivo=''semestral'' AND semestre IN (1,2)) OR (regime_letivo IN (''legado'',''anual'') AND semestre=0))) INTO @arc126_check_diff FROM (WITH RECURSIVE n AS (SELECT 0 AS semestre UNION ALL SELECT semestre+1 FROM n WHERE semestre<255) SELECT n.semestre,r.regime_letivo FROM n CROSS JOIN (SELECT ''legado'' AS regime_letivo UNION ALL SELECT ''anual'' UNION ALL SELECT ''semestral'') r) domain_values');
  PREPARE arc126_stmt FROM @arc126_sql; EXECUTE arc126_stmt; DEALLOCATE PREPARE arc126_stmt;
  CALL _arc126_assert(@arc126_check_diff=0,'CHECK de semestre tem regra divergente.');
 END IF;
END$$
DELIMITER ;

CALL _arc126_assert(VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%','Esta migracao foi preparada para MySQL 8.4.');
CALL _arc126_assert(EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.25' AND checksum='f0402abf4488dcc69f32855bd22dfd6ddb85fcdca802ca9c2a7e974205c6a8b1'),'Confira e registre a consolidacao 1.1.25 primeiro.');
CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.26' AND checksum<>'775c0b671b7384d5a1474c34a23d412d3a7a73b5f6a7a58da85b634ad79d25c6'),'Checksum divergente para 1.1.26.');
CALL _arc126_column('lembretes','id_externo','id_externo INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc126_column('lembretes','id_evento_externo','id_evento_externo INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc126_column('lembretes','contexto','contexto ENUM(''avulso'',''tarefa'',''calendario'',''agenda_externa'') NOT NULL DEFAULT ''avulso''','enum(''avulso'',''tarefa'',''calendario'',''agenda_externa'')','0','avulso','0','0',NULL,'0');
CALL _arc126_column('publico_externo','email_lembretes','email_lembretes BOOLEAN NOT NULL DEFAULT FALSE','tinyint','0','0','0','0',NULL,'0');
CALL _arc126_column('publico_externo','consentimento_lembretes_em','consentimento_lembretes_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc126_column('lembrete_envios','tentativas','tentativas TINYINT UNSIGNED NOT NULL DEFAULT 1','tinyint unsigned','0','1','0','0',NULL,'0');
CALL _arc126_column('lembrete_envios','proxima_tentativa_utc','proxima_tentativa_utc DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc126_index('lembretes','idx_lembrete_externo','id_externo,agendado_utc','0','0');
CALL _arc126_index('lembrete_envios','idx_lembrete_retry','estado,proxima_tentativa_utc','0','0');
CALL _arc126_fk('lembretes','id_externo','publico_externo','id_externo','CASCADE','0');
CALL _arc126_fk('lembretes','id_evento_externo','agenda_externa','id_evento','SET NULL','0');
CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_calendario_lembrete_update' AND NOT (
 EVENT_OBJECT_TABLE='calendario' AND ACTION_TIMING='AFTER' AND EVENT_MANIPULATION='UPDATE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','') IN ('beginupdatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento=new.id_evento;end','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento=new.id_evento','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento=new.id_evento;'))),'Trigger ausente ou divergente: trg_calendario_lembrete_update');
CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_calendario_lembrete_delete' AND NOT (
 EVENT_OBJECT_TABLE='calendario' AND ACTION_TIMING='BEFORE' AND EVENT_MANIPULATION='DELETE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','') IN ('beginupdatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento=old.id_evento;end','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento=old.id_evento','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento=old.id_evento;'))),'Trigger ausente ou divergente: trg_calendario_lembrete_delete');
CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_agenda_externa_lembrete_update' AND NOT (
 EVENT_OBJECT_TABLE='agenda_externa' AND ACTION_TIMING='AFTER' AND EVENT_MANIPULATION='UPDATE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','') IN ('beginupdatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento_externo=new.id_evento;end','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento_externo=new.id_evento','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento_externo=new.id_evento;'))),'Trigger ausente ou divergente: trg_agenda_externa_lembrete_update');
CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_agenda_externa_lembrete_delete' AND NOT (
 EVENT_OBJECT_TABLE='agenda_externa' AND ACTION_TIMING='BEFORE' AND EVENT_MANIPULATION='DELETE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','') IN ('beginupdatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento_externo=old.id_evento;end','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento_externo=old.id_evento','updatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_evento_externo=old.id_evento;'))),'Trigger ausente ou divergente: trg_agenda_externa_lembrete_delete');
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc126_evolve$$
CREATE PROCEDURE _arc126_evolve()
BEGIN
 DECLARE kind_value TEXT; DECLARE nullable_value VARCHAR(3); DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET SESSION sql_safe_updates=previous_safe; SET @arc126_failed=1; RESIGNAL; END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao anterior falhou.');
 SELECT COLUMN_TYPE,IS_NULLABLE INTO kind_value,nullable_value FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembretes' AND COLUMN_NAME='id_usuario';
 CALL _arc126_assert(kind_value IN ('int','int(11)') AND nullable_value IN ('YES','NO'),'Tipo de titular divergente. Nao modificar automaticamente.');
 IF nullable_value='NO' THEN ALTER TABLE lembretes MODIFY COLUMN id_usuario INT NULL; END IF;
 SELECT COLUMN_TYPE INTO kind_value FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='estado';
 CALL _arc126_assert(kind_value IN ('enum(''reservado'',''enviado'',''falhou'',''cancelado'')','enum(''reservado'',''enviado'',''falhou'',''cancelado'',''aguardando'',''enviando'')'),'Estados de envio divergentes.');
 IF kind_value='enum(''reservado'',''enviado'',''falhou'',''cancelado'')' THEN
  ALTER TABLE lembrete_envios MODIFY COLUMN estado ENUM('reservado','enviado','falhou','cancelado','aguardando','enviando') NOT NULL DEFAULT 'reservado';
 END IF;
END$$
DELIMITER ;
CALL _arc126_column('lembretes','id_externo','id_externo INT NULL','int','1',NULL,'0','0',NULL,'1');
CALL _arc126_column('lembretes','id_evento_externo','id_evento_externo INT NULL','int','1',NULL,'0','0',NULL,'1');
CALL _arc126_column('lembretes','contexto','contexto ENUM(''avulso'',''tarefa'',''calendario'',''agenda_externa'') NOT NULL DEFAULT ''avulso''','enum(''avulso'',''tarefa'',''calendario'',''agenda_externa'')','0','avulso','0','0',NULL,'1');
CALL _arc126_column('publico_externo','email_lembretes','email_lembretes BOOLEAN NOT NULL DEFAULT FALSE','tinyint','0','0','0','0',NULL,'1');
CALL _arc126_column('publico_externo','consentimento_lembretes_em','consentimento_lembretes_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'1');
CALL _arc126_column('lembrete_envios','tentativas','tentativas TINYINT UNSIGNED NOT NULL DEFAULT 1','tinyint unsigned','0','1','0','0',NULL,'1');
CALL _arc126_column('lembrete_envios','proxima_tentativa_utc','proxima_tentativa_utc DATETIME NULL','datetime','1',NULL,'0','0',NULL,'1');
CALL _arc126_fk('lembretes','id_usuario','usuarios','id_usuario','CASCADE',0);
CALL _arc126_evolve();
CALL _arc126_fk('lembretes','id_usuario','usuarios','id_usuario','CASCADE',1);
CALL _arc126_fk('lembretes','id_evento','calendario','id_evento','SET NULL',1);
CALL _arc126_fk('lembretes','id_externo','publico_externo','id_externo','CASCADE','1');
CALL _arc126_fk('lembretes','id_evento_externo','agenda_externa','id_evento','SET NULL','1');
CALL _arc126_index('lembretes','idx_lembrete_externo','id_externo,agendado_utc','0','1');
CALL _arc126_index('lembrete_envios','idx_lembrete_retry','estado,proxima_tentativa_utc','0','1');
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc126_contexts$$
CREATE PROCEDURE _arc126_contexts()
BEGIN
 DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET SESSION sql_safe_updates=previous_safe; SET @arc126_failed=1; RESIGNAL; END;
 CALL _arc126_assert(@arc126_failed=0,'Uma verificacao anterior falhou.');
 CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM lembretes WHERE (id_usuario IS NULL)=(id_externo IS NULL)), 'Ha lembretes sem titular ou com dois titulares. Revise sem apagar dados.');
 CALL _arc126_assert(NOT EXISTS(SELECT 1 FROM lembretes WHERE (id_tarefa IS NOT NULL)+(id_evento IS NOT NULL)+(id_evento_externo IS NOT NULL)>1),'Ha lembretes com vinculos ambiguos. Revise antes de continuar.');
 SELECT MAX(c.CHECK_CLAUSE),MAX(t.ENFORCED) INTO clause_value,enforced_value FROM information_schema.TABLE_CONSTRAINTS t
 JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
 WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='lembretes' AND t.CONSTRAINT_NAME='chk_lembrete_titular';
 IF clause_value IS NULL THEN ALTER TABLE lembretes ADD CONSTRAINT chk_lembrete_titular CHECK ((id_usuario IS NULL) <> (id_externo IS NULL));
 ELSE
  CALL _arc126_assert(enforced_value='YES' AND REGEXP_REPLACE(LOWER(REPLACE(clause_value,CHAR(96),'')),'[[:space:]()]','')='id_usuarioisnull<>id_externoisnull','CHECK do titular divergente.');
 END IF;
 SET SESSION sql_safe_updates=0;
 UPDATE lembretes SET contexto='tarefa' WHERE contexto='avulso' AND id_tarefa IS NOT NULL;
 -- Eventos legados sao desativados ate revisao explicita; nao presumir permissao/horario.
 UPDATE lembretes SET contexto='calendario',ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE contexto='avulso' AND id_evento IS NOT NULL;
 SET SESSION sql_safe_updates=previous_safe;
END$$
DELIMITER ;
CALL _arc126_contexts();
-- Estrutura preparada. Gatilhos e registro 1.1.26 ainda pendentes.
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='lembretes' AND COLUMN_NAME IN ('id_usuario','id_externo','id_evento_externo','contexto')) OR (TABLE_NAME='lembrete_envios' AND COLUMN_NAME IN ('estado','tentativas','proxima_tentativa_utc')) OR (TABLE_NAME='publico_externo' AND COLUMN_NAME IN ('email_lembretes','consentimento_lembretes_em'))) ORDER BY TABLE_NAME,COLUMN_NAME;
