-- Gerado offline. MySQL 8.4. Backup, mesma conexao e parar no primeiro erro.
-- Nao promove nem vincula contas existentes em massa. Requer 1.1.28.
SET @arc129_failed=0;

DELIMITER $$
DROP PROCEDURE IF EXISTS _arc129_assert$$
CREATE PROCEDURE _arc129_assert(IN ok BOOLEAN, IN message_text_value VARCHAR(128))
BEGIN
 IF NOT COALESCE(ok,FALSE) THEN
  SET @arc129_failed=1;
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=message_text_value;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc129_column$$
CREATE PROCEDURE _arc129_column(IN tbl VARCHAR(64),IN col VARCHAR(64),IN def TEXT,
 IN expected_type VARCHAR(1000),IN nullable_value BOOLEAN,IN default_value TEXT,
 IN auto_value BOOLEAN,IN on_update_value BOOLEAN,IN collation_value VARCHAR(64),IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_null VARCHAR(3); DECLARE actual_default TEXT;
 DECLARE actual_extra TEXT; DECLARE actual_collation VARCHAR(64); DECLARE found_count INT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc129_failed=1; RESIGNAL; END;
 CALL _arc129_assert(@arc129_failed=0,'Uma verificacao falhou. Pare e revise antes de continuar.');
 SELECT COUNT(*) INTO found_count FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
 IF found_count=0 THEN
  IF apply_missing THEN
   SET @arc129_sql=CONCAT('ALTER TABLE ',tbl,' ADD COLUMN ',def);
   PREPARE arc129_stmt FROM @arc129_sql; EXECUTE arc129_stmt; DEALLOCATE PREPARE arc129_stmt;
  END IF;
 ELSE
  SELECT LOWER(COLUMN_TYPE),IS_NULLABLE,LOWER(COLUMN_DEFAULT),LOWER(EXTRA),COLLATION_NAME
   INTO actual_type,actual_null,actual_default,actual_extra,actual_collation
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
  -- Remover apenas larguras historicas de inteiros, preservando enum/varchar.
  IF actual_type REGEXP '^(tinyint|smallint|int|bigint)[(]' THEN
   SET actual_type=CONCAT(SUBSTRING_INDEX(actual_type,'(',1),SUBSTRING(actual_type,LOCATE(')',actual_type)+1));
  END IF;
  CALL _arc129_assert(actual_type=LOWER(expected_type) AND (actual_null='YES')=nullable_value
   AND (REPLACE(actual_default,'()','') <=> REPLACE(LOWER(default_value),'()',''))
   AND (LOCATE('auto_increment',actual_extra)>0)=auto_value
   AND (LOCATE('on update current_timestamp',actual_extra)>0)=on_update_value
   AND (collation_value IS NULL OR actual_collation=collation_value),
   CONCAT('Coluna divergente: ',tbl,'.',col,'. Nenhum MODIFY automatico.'));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc129_index$$
CREATE PROCEDURE _arc129_index(IN tbl VARCHAR(64),IN idx VARCHAR(64),IN cols TEXT,IN unique_value BOOLEAN,IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_cols TEXT; DECLARE actual_unique BOOLEAN; DECLARE actual_prefix INT; DECLARE actual_type TEXT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc129_failed=1; RESIGNAL; END;
 CALL _arc129_assert(@arc129_failed=0,'Uma verificacao anterior falhou.');
 SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX),MIN(NON_UNIQUE)=0,
  SUM(SUB_PART IS NOT NULL),MIN(INDEX_TYPE) INTO actual_cols,actual_unique,actual_prefix,actual_type
 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND INDEX_NAME=idx;
 IF actual_cols IS NULL THEN
  IF apply_missing THEN
   SET @arc129_sql=CONCAT('ALTER TABLE ',tbl,' ADD ',IF(unique_value AND idx<>'PRIMARY','UNIQUE ',''),
    IF(idx='PRIMARY','PRIMARY KEY',CONCAT('INDEX ',idx,'')),' (',cols,')');
   PREPARE arc129_stmt FROM @arc129_sql; EXECUTE arc129_stmt; DEALLOCATE PREPARE arc129_stmt;
  END IF;
 ELSE
  CALL _arc129_assert(actual_cols=cols AND actual_unique=unique_value AND actual_prefix=0 AND actual_type='BTREE',
   CONCAT('Indice divergente: ',tbl,'.',idx));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc129_fk$$
CREATE PROCEDURE _arc129_fk(IN tbl VARCHAR(64),IN cols TEXT,IN parent_tbl VARCHAR(64),IN parent_cols TEXT,IN delete_rule_value VARCHAR(16),IN apply_missing BOOLEAN)
BEGIN
 DECLARE conflicting INT DEFAULT 0; DECLARE matching INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc129_failed=1; RESIGNAL; END;
 CALL _arc129_assert(@arc129_failed=0,'Uma verificacao anterior falhou.');
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
 CALL _arc129_assert(conflicting=matching,CONCAT('FK divergente: ',tbl,' (',cols,')'));
 IF matching=0 AND apply_missing THEN
  SET @arc129_sql=CONCAT('ALTER TABLE ',tbl,' ADD FOREIGN KEY (',cols,') REFERENCES ',parent_tbl,' (',parent_cols,') ON DELETE ',delete_rule_value);
  PREPARE arc129_stmt FROM @arc129_sql; EXECUTE arc129_stmt; DEALLOCATE PREPARE arc129_stmt;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc129_names$$
CREATE PROCEDURE _arc129_names()
BEGIN
 DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
  SET SESSION sql_safe_updates=previous_safe; SET @arc129_failed=1; RESIGNAL;
 END;
 CALL _arc129_assert(@arc129_failed=0,'Uma verificacao anterior falhou.');
 IF EXISTS(SELECT 1 FROM academico_turmas WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')))) THEN
  CALL _arc129_assert(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND INDEX_NAME='uq_turma_nome_global'),
   'Chaves de nomes inconsistentes com indice existente. Revise manualmente.');
  SET SESSION sql_safe_updates=0;
  UPDATE academico_turmas SET nome_chave=LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '))
   WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')));
  SET SESSION sql_safe_updates=previous_safe;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc129_check$$
CREATE PROCEDURE _arc129_check(IN apply_missing BOOLEAN)
BEGIN
 DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc129_failed=1; RESIGNAL; END;
 CALL _arc129_assert(@arc129_failed=0,'Uma verificacao anterior falhou.');
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
  CALL _arc129_assert(enforced_value='YES','CHECK de semestre esta desativado.');
  -- CHECK_CLAUSE pode devolver delimitadores de strings como barra+aspas.
  -- Nesta regra, os tres literais ENUM nao contem aspas ou barras internas.
  -- Normalizar apenas esses literais conhecidos, sem mudar sql_mode nem a constraint.
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'semestral',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'semestral',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'legado',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'legado',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'anual',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'anual',CHAR(39)));
  -- Compara todo o dominio: tres valores ENUM x todos os 256 valores TINYINT UNSIGNED.
  SET @arc129_sql=CONCAT('SELECT SUM(COALESCE((',clause_value,'),1) <> ((regime_letivo=''semestral'' AND semestre IN (1,2)) OR (regime_letivo IN (''legado'',''anual'') AND semestre=0))) INTO @arc129_check_diff FROM (WITH RECURSIVE n AS (SELECT 0 AS semestre UNION ALL SELECT semestre+1 FROM n WHERE semestre<255) SELECT n.semestre,r.regime_letivo FROM n CROSS JOIN (SELECT ''legado'' AS regime_letivo UNION ALL SELECT ''anual'' UNION ALL SELECT ''semestral'') r) domain_values');
  PREPARE arc129_stmt FROM @arc129_sql; EXECUTE arc129_stmt; DEALLOCATE PREPARE arc129_stmt;
  CALL _arc129_assert(@arc129_check_diff=0,'CHECK de semestre tem regra divergente.');
 END IF;
END$$
DELIMITER ;

CALL _arc129_assert(VERSION() REGEXP '^8[.]4[.]' AND EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.28' AND checksum='9cdf3a5752095a953bdb79caf01a7774266d7588be89ae08d9fdff5a1634d70b'),'Requer MySQL 8.4 e base 1.1.28.');
CALL _arc129_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.29' AND checksum<>'45b86a2a1a6303a7356c9e7c251144fd1b7cbd2fef24f1439747485b23f27907'),'Checksum 1.1.29 divergente.');
CALL _arc129_column('usuarios','id_externo_origem','id_externo_origem INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc129_column('docente_requisitos','curso_informado','curso_informado VARCHAR(150) NULL','varchar(150)','1',NULL,'0','0',NULL,'0');
CALL _arc129_column('docente_requisitos','origem_solicitacao','origem_solicitacao ENUM(''cadastro'',''configuracoes'') NOT NULL DEFAULT ''cadastro''','enum(''cadastro'',''configuracoes'')','0','cadastro','0','0',NULL,'0');
CALL _arc129_column('usuarios','id_externo_origem','id_externo_origem INT NULL','int','1',NULL,'0','0',NULL,'1');
CALL _arc129_column('docente_requisitos','curso_informado','curso_informado VARCHAR(150) NULL','varchar(150)','1',NULL,'0','0',NULL,'1');
CALL _arc129_column('docente_requisitos','origem_solicitacao','origem_solicitacao ENUM(''cadastro'',''configuracoes'') NOT NULL DEFAULT ''cadastro''','enum(''cadastro'',''configuracoes'')','0','cadastro','0','0',NULL,'1');
CALL _arc129_index('usuarios','uq_usuario_origem_externa','id_externo_origem','1','1');
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc129_requested_role$$
CREATE PROCEDURE _arc129_requested_role()
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_default TEXT; DECLARE actual_null VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc129_failed=1; RESIGNAL; END;
 CALL _arc129_assert(@arc129_failed=0,'Verificacao anterior falhou.');
 SELECT COLUMN_TYPE,COLUMN_DEFAULT,IS_NULLABLE INTO actual_type,actual_default,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='docente_requisitos' AND COLUMN_NAME='tipo_solicitado';
 CALL _arc129_assert(actual_null='NO' AND actual_default='docente','Default ou nulidade do tipo de pedido divergente.');
 IF actual_type='enum(''docente'',''servidor'')' THEN
  ALTER TABLE docente_requisitos MODIFY COLUMN tipo_solicitado ENUM('docente','servidor','discente') NOT NULL DEFAULT 'docente';
 ELSE CALL _arc129_assert(actual_type='enum(''docente'',''servidor'',''discente'')','Tipo de pedido divergente.'); END IF;
END$$
DELIMITER ;
CALL _arc129_requested_role();
CALL _arc129_assert(@arc129_failed=0,'Verificacao anterior falhou.');
CREATE TABLE IF NOT EXISTS conta_vinculos (id_externo INT PRIMARY KEY,id_usuario INT NOT NULL UNIQUE,id_requisito INT NULL UNIQUE,criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE,FOREIGN KEY(id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,FOREIGN KEY(id_requisito) REFERENCES docente_requisitos(id_requisito) ON DELETE SET NULL) ENGINE=InnoDB;
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='conta_vinculos' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela precisa ser InnoDB: conta_vinculos');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='conta_vinculos' AND COLUMN_NAME='id_externo'),'Tabela parcial: conta_vinculos.id_externo');
CALL _arc129_column('conta_vinculos','id_externo','id_externo INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='conta_vinculos' AND COLUMN_NAME='id_usuario'),'Tabela parcial: conta_vinculos.id_usuario');
CALL _arc129_column('conta_vinculos','id_usuario','id_usuario INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='conta_vinculos' AND COLUMN_NAME='id_requisito'),'Tabela parcial: conta_vinculos.id_requisito');
CALL _arc129_column('conta_vinculos','id_requisito','id_requisito INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='conta_vinculos' AND COLUMN_NAME='criado_em'),'Tabela parcial: conta_vinculos.criado_em');
CALL _arc129_column('conta_vinculos','criado_em','criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP','datetime','0','current_timestamp()','0','0',NULL,'0');
CALL _arc129_index('conta_vinculos','PRIMARY','id_externo','1','1');
CALL _arc129_index('conta_vinculos','id_usuario','id_usuario','1','1');
CALL _arc129_index('conta_vinculos','id_requisito','id_requisito','1','1');
CALL _arc129_fk('conta_vinculos','id_externo','publico_externo','id_externo','CASCADE','1');
CALL _arc129_fk('conta_vinculos','id_usuario','usuarios','id_usuario','CASCADE','1');
CALL _arc129_fk('conta_vinculos','id_requisito','docente_requisitos','id_requisito','SET NULL','1');
CALL _arc129_assert(@arc129_failed=0,'Verificacao anterior falhou.');
CREATE TABLE IF NOT EXISTS agenda_vinculos (id_evento_externo INT PRIMARY KEY,id_evento INT NOT NULL UNIQUE,FOREIGN KEY(id_evento_externo) REFERENCES agenda_externa(id_evento) ON DELETE CASCADE,FOREIGN KEY(id_evento) REFERENCES calendario(id_evento) ON DELETE CASCADE) ENGINE=InnoDB;
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_vinculos' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela precisa ser InnoDB: agenda_vinculos');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_vinculos' AND COLUMN_NAME='id_evento_externo'),'Tabela parcial: agenda_vinculos.id_evento_externo');
CALL _arc129_column('agenda_vinculos','id_evento_externo','id_evento_externo INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_vinculos' AND COLUMN_NAME='id_evento'),'Tabela parcial: agenda_vinculos.id_evento');
CALL _arc129_column('agenda_vinculos','id_evento','id_evento INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc129_index('agenda_vinculos','PRIMARY','id_evento_externo','1','1');
CALL _arc129_index('agenda_vinculos','id_evento','id_evento','1','1');
CALL _arc129_fk('agenda_vinculos','id_evento_externo','agenda_externa','id_evento','CASCADE','1');
CALL _arc129_fk('agenda_vinculos','id_evento','calendario','id_evento','CASCADE','1');
CALL _arc129_assert(@arc129_failed=0,'Verificacao anterior falhou.');
CREATE TABLE IF NOT EXISTS vinculo_auditoria (id_auditoria INT AUTO_INCREMENT PRIMARY KEY,id_requisito INT NULL,id_externo INT NULL,id_admin INT NULL,acao VARCHAR(30) NOT NULL,motivo VARCHAR(1000) NOT NULL,criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(id_requisito) REFERENCES docente_requisitos(id_requisito) ON DELETE SET NULL,FOREIGN KEY(id_externo) REFERENCES publico_externo(id_externo) ON DELETE SET NULL,FOREIGN KEY(id_admin) REFERENCES usuarios(id_usuario) ON DELETE SET NULL) ENGINE=InnoDB;
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela precisa ser InnoDB: vinculo_auditoria');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='id_auditoria'),'Tabela parcial: vinculo_auditoria.id_auditoria');
CALL _arc129_column('vinculo_auditoria','id_auditoria','id_auditoria INT AUTO_INCREMENT PRIMARY KEY','int','0',NULL,'1','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='id_requisito'),'Tabela parcial: vinculo_auditoria.id_requisito');
CALL _arc129_column('vinculo_auditoria','id_requisito','id_requisito INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='id_externo'),'Tabela parcial: vinculo_auditoria.id_externo');
CALL _arc129_column('vinculo_auditoria','id_externo','id_externo INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='id_admin'),'Tabela parcial: vinculo_auditoria.id_admin');
CALL _arc129_column('vinculo_auditoria','id_admin','id_admin INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='acao'),'Tabela parcial: vinculo_auditoria.acao');
CALL _arc129_column('vinculo_auditoria','acao','acao VARCHAR(30) NOT NULL','varchar(30)','0',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='motivo'),'Tabela parcial: vinculo_auditoria.motivo');
CALL _arc129_column('vinculo_auditoria','motivo','motivo VARCHAR(1000) NOT NULL','varchar(1000)','0',NULL,'0','0',NULL,'0');
CALL _arc129_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vinculo_auditoria' AND COLUMN_NAME='criado_em'),'Tabela parcial: vinculo_auditoria.criado_em');
CALL _arc129_column('vinculo_auditoria','criado_em','criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP','datetime','0','current_timestamp()','0','0',NULL,'0');
CALL _arc129_index('vinculo_auditoria','PRIMARY','id_auditoria','1','1');
CALL _arc129_fk('vinculo_auditoria','id_requisito','docente_requisitos','id_requisito','SET NULL','1');
CALL _arc129_fk('vinculo_auditoria','id_externo','publico_externo','id_externo','SET NULL','1');
CALL _arc129_fk('vinculo_auditoria','id_admin','usuarios','id_usuario','SET NULL','1');
INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.29','45b86a2a1a6303a7356c9e7c251144fd1b7cbd2fef24f1439747485b23f27907' WHERE @arc129_failed=0;
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.29';
DROP PROCEDURE IF EXISTS _arc129_requested_role;
DROP PROCEDURE IF EXISTS _arc129_column;
DROP PROCEDURE IF EXISTS _arc129_index;
DROP PROCEDURE IF EXISTS _arc129_fk;
DROP PROCEDURE IF EXISTS _arc129_names;
DROP PROCEDURE IF EXISTS _arc129_check;
DROP PROCEDURE IF EXISTS _arc129_assert;
