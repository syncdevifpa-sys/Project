-- GERADO por node tools/build-db-migration.cjs. Nao editar este arquivo manualmente.
-- MySQL 8.4. Banco EXISTENTE com baseline documentado; backup e janela de manutencao.
-- Workbench: ativar parar ao ocorrer erro e executar o arquivo inteiro na mesma conexao.
-- DDL faz COMMIT implicito. Nao ha rollback global. Repetir apos corrigir a causa retoma objetos ausentes.
-- Nao executa schema.sql, nao exclui registros nem resolve duplicados automaticamente.
SELECT DATABASE() AS banco_selecionado,VERSION() AS versao;
SET @arc125_failed=0;


DELIMITER $$
DROP PROCEDURE IF EXISTS _arc125_assert$$
CREATE PROCEDURE _arc125_assert(IN ok BOOLEAN, IN message_text_value VARCHAR(128))
BEGIN
 IF NOT COALESCE(ok,FALSE) THEN
  SET @arc125_failed=1;
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=message_text_value;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc125_column$$
CREATE PROCEDURE _arc125_column(IN tbl VARCHAR(64),IN col VARCHAR(64),IN def TEXT,
 IN expected_type VARCHAR(1000),IN nullable_value BOOLEAN,IN default_value TEXT,
 IN auto_value BOOLEAN,IN on_update_value BOOLEAN,IN collation_value VARCHAR(64),IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_null VARCHAR(3); DECLARE actual_default TEXT;
 DECLARE actual_extra TEXT; DECLARE actual_collation VARCHAR(64); DECLARE found_count INT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao falhou. Pare e revise antes de continuar.');
 SELECT COUNT(*) INTO found_count FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
 IF found_count=0 THEN
  IF apply_missing THEN
   SET @arc125_sql=CONCAT('ALTER TABLE ',tbl,' ADD COLUMN ',def);
   PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
  END IF;
 ELSE
  SELECT LOWER(COLUMN_TYPE),IS_NULLABLE,LOWER(COLUMN_DEFAULT),LOWER(EXTRA),COLLATION_NAME
   INTO actual_type,actual_null,actual_default,actual_extra,actual_collation
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND COLUMN_NAME=col;
  -- Remover apenas larguras historicas de inteiros, preservando enum/varchar.
  IF actual_type REGEXP '^(tinyint|smallint|int|bigint)[(]' THEN
   SET actual_type=CONCAT(SUBSTRING_INDEX(actual_type,'(',1),SUBSTRING(actual_type,LOCATE(')',actual_type)+1));
  END IF;
  CALL _arc125_assert(actual_type=LOWER(expected_type) AND (actual_null='YES')=nullable_value
   AND (REPLACE(actual_default,'()','') <=> REPLACE(LOWER(default_value),'()',''))
   AND (LOCATE('auto_increment',actual_extra)>0)=auto_value
   AND (LOCATE('on update current_timestamp',actual_extra)>0)=on_update_value
   AND (collation_value IS NULL OR actual_collation=collation_value),
   CONCAT('Coluna divergente: ',tbl,'.',col,'. Nenhum MODIFY automatico.'));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc125_index$$
CREATE PROCEDURE _arc125_index(IN tbl VARCHAR(64),IN idx VARCHAR(64),IN cols TEXT,IN unique_value BOOLEAN,IN apply_missing BOOLEAN)
BEGIN
 DECLARE actual_cols TEXT; DECLARE actual_unique BOOLEAN; DECLARE actual_prefix INT; DECLARE actual_type TEXT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao anterior falhou.');
 SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX),MIN(NON_UNIQUE)=0,
  SUM(SUB_PART IS NOT NULL),MIN(INDEX_TYPE) INTO actual_cols,actual_unique,actual_prefix,actual_type
 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=tbl AND INDEX_NAME=idx;
 IF actual_cols IS NULL THEN
  IF apply_missing THEN
   SET @arc125_sql=CONCAT('ALTER TABLE ',tbl,' ADD ',IF(unique_value AND idx<>'PRIMARY','UNIQUE ',''),
    IF(idx='PRIMARY','PRIMARY KEY',CONCAT('INDEX ',idx,'')),' (',cols,')');
   PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
  END IF;
 ELSE
  CALL _arc125_assert(actual_cols=cols AND actual_unique=unique_value AND actual_prefix=0 AND actual_type='BTREE',
   CONCAT('Indice divergente: ',tbl,'.',idx));
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc125_fk$$
CREATE PROCEDURE _arc125_fk(IN tbl VARCHAR(64),IN cols TEXT,IN parent_tbl VARCHAR(64),IN parent_cols TEXT,IN delete_rule_value VARCHAR(16),IN apply_missing BOOLEAN)
BEGIN
 DECLARE conflicting INT DEFAULT 0; DECLARE matching INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao anterior falhou.');
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
 CALL _arc125_assert(conflicting=matching,CONCAT('FK divergente: ',tbl,' (',cols,')'));
 IF matching=0 AND apply_missing THEN
  SET @arc125_sql=CONCAT('ALTER TABLE ',tbl,' ADD FOREIGN KEY (',cols,') REFERENCES ',parent_tbl,' (',parent_cols,') ON DELETE ',delete_rule_value);
  PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc125_names$$
CREATE PROCEDURE _arc125_names()
BEGIN
 DECLARE previous_safe INT DEFAULT @@SESSION.sql_safe_updates;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
  SET SESSION sql_safe_updates=previous_safe; SET @arc125_failed=1; RESIGNAL;
 END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao anterior falhou.');
 IF EXISTS(SELECT 1 FROM academico_turmas WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')))) THEN
  CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND INDEX_NAME='uq_turma_nome_global'),
   'Chaves de nomes inconsistentes com indice existente. Revise manualmente.');
  SET SESSION sql_safe_updates=0;
  UPDATE academico_turmas SET nome_chave=LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '))
   WHERE NOT(nome_chave <=> LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')));
  SET SESSION sql_safe_updates=previous_safe;
 END IF;
END$$
DROP PROCEDURE IF EXISTS _arc125_check$$
CREATE PROCEDURE _arc125_check(IN apply_missing BOOLEAN)
BEGIN
 DECLARE clause_value TEXT; DECLARE enforced_value VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Uma verificacao anterior falhou.');
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
  CALL _arc125_assert(enforced_value='YES','CHECK de semestre esta desativado.');
  -- Compara todo o dominio: tres valores ENUM x todos os 256 valores TINYINT UNSIGNED.
  SET @arc125_sql=CONCAT('SELECT SUM(COALESCE((',clause_value,'),1) <> ((regime_letivo=''semestral'' AND semestre IN (1,2)) OR (regime_letivo IN (''legado'',''anual'') AND semestre=0))) INTO @arc125_check_diff FROM (WITH RECURSIVE n AS (SELECT 0 AS semestre UNION ALL SELECT semestre+1 FROM n WHERE semestre<255) SELECT n.semestre,r.regime_letivo FROM n CROSS JOIN (SELECT ''legado'' AS regime_letivo UNION ALL SELECT ''anual'' UNION ALL SELECT ''semestral'') r) domain_values');
  PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
  CALL _arc125_assert(@arc125_check_diff=0,'CHECK de semestre tem regra divergente.');
 END IF;
END$$
DELIMITER ;

CALL _arc125_assert(DATABASE() IS NOT NULL,'Selecione o banco existente antes de continuar.');
CALL _arc125_assert(VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%','Esta migracao foi preparada para MySQL 8.4.');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: usuarios');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='publico_externo' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: publico_externo');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projetos' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: projetos');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: projeto_inscricoes');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendario' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: calendario');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tarefas' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: tarefas');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembretes' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: lembretes');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_estado' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: email_estado');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documento_itens' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: documento_itens');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: academico_turmas');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: academico_disciplinas');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_matriculas' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: academico_matriculas');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_publicacoes' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: academico_publicacoes');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_convites' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Baseline ausente ou incompativel: academico_convites');
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM academico_turmas GROUP BY LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')) COLLATE utf8mb4_bin HAVING COUNT(*)>1),'Ha turmas duplicadas. Revise nomes; nao apague nem funda registros.');
-- Validar todos os objetos existentes antes de modificar a estrutura.
CALL _arc125_column('projetos','permite_externos','permite_externos TINYINT(1) NOT NULL DEFAULT 0','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_column('calendario','origem_calendario','origem_calendario ENUM(''agenda'',''ifpa'') NOT NULL DEFAULT ''ifpa''','enum(''agenda'',''ifpa'')','0','ifpa','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','regime_letivo','regime_letivo ENUM(''legado'',''anual'',''semestral'') NOT NULL DEFAULT ''legado''','enum(''legado'',''anual'',''semestral'')','0','legado','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','semestre','semestre TINYINT UNSIGNED NOT NULL DEFAULT 0','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','atribuicao_ativa','atribuicao_ativa TINYINT(1) NOT NULL DEFAULT 1','tinyint','0','1','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','arquivada_em','arquivada_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('academico_matriculas','ativa','ativa TINYINT(1) NOT NULL DEFAULT 1','tinyint','0','1','0','0',NULL,'0');
CALL _arc125_column('academico_matriculas','encerrado_em','encerrado_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('academico_publicacoes','id_autor','id_autor INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('academico_turmas','nome_chave','nome_chave VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT ''''','varchar(100)','0','','0','0','utf8mb4_bin','0');
CALL _arc125_column('academico_turmas','arquivada_em','arquivada_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('lembretes','id_tarefa','id_tarefa INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('lembretes','agendado_utc','agendado_utc DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('lembretes','fuso_horario','fuso_horario VARCHAR(64) NOT NULL DEFAULT ''America/Fortaleza''','varchar(64)','0','America/Fortaleza','0','0',NULL,'0');
CALL _arc125_column('lembretes','enviar_email','enviar_email BOOLEAN NOT NULL DEFAULT FALSE','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_column('lembretes','versao','versao INT UNSIGNED NOT NULL DEFAULT 1','int','0','1','0','0',NULL,'0');
CALL _arc125_index('academico_disciplinas','uq_oferta_turma','id_turma,nome,ano_letivo,regime_letivo,semestre','1','0');
CALL _arc125_index('academico_turmas','uq_turma_nome_global','nome_chave','1','0');
CALL _arc125_index('lembretes','idx_lembrete_envio','enviar_email,ativo,agendado_utc','0','0');
CALL _arc125_fk('academico_publicacoes','id_autor','usuarios','id_usuario','SET NULL','0');
CALL _arc125_fk('lembretes','id_tarefa','tarefas','id_tarefa','CASCADE','0');
CALL _arc125_index('academico_disciplinas','uq_disciplina_turma','id_turma,nome,ano_letivo',1,0);
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_turma_nome_insert' AND NOT (
 EVENT_OBJECT_TABLE='academico_turmas' AND ACTION_TIMING='BEFORE' AND EVENT_MANIPULATION='INSERT' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','')='beginsetnew.nome=regexp_replace(trim(new.nome),''[[:space:]]+'','''');setnew.nome_chave=lower(new.nome);end')),'Trigger ausente ou divergente: trg_turma_nome_insert');
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_turma_nome_update' AND NOT (
 EVENT_OBJECT_TABLE='academico_turmas' AND ACTION_TIMING='BEFORE' AND EVENT_MANIPULATION='UPDATE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','')='beginsetnew.nome=regexp_replace(trim(new.nome),''[[:space:]]+'','''');setnew.nome_chave=lower(new.nome);end')),'Trigger ausente ou divergente: trg_turma_nome_update');
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='tarefa_invalida_lembretes' AND NOT (
 EVENT_OBJECT_TABLE='tarefas' AND ACTION_TIMING='AFTER' AND EVENT_MANIPULATION='UPDATE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','')='beginif(new.status=''concluida''andold.status<>''concluida'')ornot(new.data_entrega<=>old.data_entrega)thenupdatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_tarefa=new.id_tarefa;endif;end')),'Trigger ausente ou divergente: tarefa_invalida_lembretes');
-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: projeto_inscricoes_externas.
SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes_externas');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes_externas' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes_externas' AND COLUMN_NAME='id_projeto'),'Tabela parcial: projeto_inscricoes_externas.id_projeto');
CALL _arc125_column('projeto_inscricoes_externas','id_projeto','id_projeto INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes_externas' AND COLUMN_NAME='id_externo'),'Tabela parcial: projeto_inscricoes_externas.id_externo');
CALL _arc125_column('projeto_inscricoes_externas','id_externo','id_externo INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes_externas' AND COLUMN_NAME='status'),'Tabela parcial: projeto_inscricoes_externas.status');
CALL _arc125_column('projeto_inscricoes_externas','status','status ENUM(''inscrito'',''aprovado'',''recusado'',''cancelado'') NOT NULL DEFAULT ''inscrito''','enum(''inscrito'',''aprovado'',''recusado'',''cancelado'')','0','inscrito','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projeto_inscricoes_externas' AND COLUMN_NAME='criado_em'),'Tabela parcial: projeto_inscricoes_externas.criado_em');
CALL _arc125_column('projeto_inscricoes_externas','criado_em','criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP','datetime','0','CURRENT_TIMESTAMP','0','0',NULL,'0');
CALL _arc125_index('projeto_inscricoes_externas','PRIMARY','id_projeto,id_externo','1','0');
CALL _arc125_fk('projeto_inscricoes_externas','id_projeto','projetos','id_projeto','CASCADE','0');
CALL _arc125_fk('projeto_inscricoes_externas','id_externo','publico_externo','id_externo','CASCADE','0');
-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: agenda_externa.
SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='id_evento'),'Tabela parcial: agenda_externa.id_evento');
CALL _arc125_column('agenda_externa','id_evento','id_evento INT AUTO_INCREMENT PRIMARY KEY','int','0',NULL,'1','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='id_externo'),'Tabela parcial: agenda_externa.id_externo');
CALL _arc125_column('agenda_externa','id_externo','id_externo INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='titulo'),'Tabela parcial: agenda_externa.titulo');
CALL _arc125_column('agenda_externa','titulo','titulo VARCHAR(150) NOT NULL','varchar(150)','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='descricao'),'Tabela parcial: agenda_externa.descricao');
CALL _arc125_column('agenda_externa','descricao','descricao TEXT NULL','text','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='categoria'),'Tabela parcial: agenda_externa.categoria');
CALL _arc125_column('agenda_externa','categoria','categoria VARCHAR(40) NOT NULL DEFAULT ''evento''','varchar(40)','0','evento','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='data_evento'),'Tabela parcial: agenda_externa.data_evento');
CALL _arc125_column('agenda_externa','data_evento','data_evento DATE NOT NULL','date','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='data_fim'),'Tabela parcial: agenda_externa.data_fim');
CALL _arc125_column('agenda_externa','data_fim','data_fim DATE NULL','date','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='hora_inicio'),'Tabela parcial: agenda_externa.hora_inicio');
CALL _arc125_column('agenda_externa','hora_inicio','hora_inicio TIME NULL','time','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='hora_fim'),'Tabela parcial: agenda_externa.hora_fim');
CALL _arc125_column('agenda_externa','hora_fim','hora_fim TIME NULL','time','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='local'),'Tabela parcial: agenda_externa.local');
CALL _arc125_column('agenda_externa','local','local VARCHAR(150) NULL','varchar(150)','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='criado_em'),'Tabela parcial: agenda_externa.criado_em');
CALL _arc125_column('agenda_externa','criado_em','criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP','datetime','0','CURRENT_TIMESTAMP','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='agenda_externa' AND COLUMN_NAME='atualizado_em'),'Tabela parcial: agenda_externa.atualizado_em');
CALL _arc125_column('agenda_externa','atualizado_em','atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP','datetime','0','CURRENT_TIMESTAMP','0','1',NULL,'0');
CALL _arc125_index('agenda_externa','PRIMARY','id_evento','1','0');
CALL _arc125_fk('agenda_externa','id_externo','publico_externo','id_externo','CASCADE','0');
-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: academico_saidas_professor.
SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_saidas_professor');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_saidas_professor' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_saidas_professor' AND COLUMN_NAME='id_saida'),'Tabela parcial: academico_saidas_professor.id_saida');
CALL _arc125_column('academico_saidas_professor','id_saida','id_saida INT AUTO_INCREMENT PRIMARY KEY','int','0',NULL,'1','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_saidas_professor' AND COLUMN_NAME='id_disciplina'),'Tabela parcial: academico_saidas_professor.id_disciplina');
CALL _arc125_column('academico_saidas_professor','id_disciplina','id_disciplina INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_saidas_professor' AND COLUMN_NAME='id_professor'),'Tabela parcial: academico_saidas_professor.id_professor');
CALL _arc125_column('academico_saidas_professor','id_professor','id_professor INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_saidas_professor' AND COLUMN_NAME='encerrado_em'),'Tabela parcial: academico_saidas_professor.encerrado_em');
CALL _arc125_column('academico_saidas_professor','encerrado_em','encerrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP','datetime','0','CURRENT_TIMESTAMP','0','0',NULL,'0');
CALL _arc125_index('academico_saidas_professor','PRIMARY','id_saida','1','0');
CALL _arc125_fk('academico_saidas_professor','id_disciplina','academico_disciplinas','id_disciplina','CASCADE','0');
CALL _arc125_fk('academico_saidas_professor','id_professor','usuarios','id_usuario','SET NULL','0');
-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: preferencias_notificacao.
SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='preferencias_notificacao');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='preferencias_notificacao' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='preferencias_notificacao' AND COLUMN_NAME='id_usuario'),'Tabela parcial: preferencias_notificacao.id_usuario');
CALL _arc125_column('preferencias_notificacao','id_usuario','id_usuario INT PRIMARY KEY','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='preferencias_notificacao' AND COLUMN_NAME='email_lembretes'),'Tabela parcial: preferencias_notificacao.email_lembretes');
CALL _arc125_column('preferencias_notificacao','email_lembretes','email_lembretes BOOLEAN NOT NULL DEFAULT FALSE','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='preferencias_notificacao' AND COLUMN_NAME='consentido_em'),'Tabela parcial: preferencias_notificacao.consentido_em');
CALL _arc125_column('preferencias_notificacao','consentido_em','consentido_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_index('preferencias_notificacao','PRIMARY','id_usuario','1','0');
CALL _arc125_fk('preferencias_notificacao','id_usuario','usuarios','id_usuario','CASCADE','0');
-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: lembrete_envios.
SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='id_lembrete'),'Tabela parcial: lembrete_envios.id_lembrete');
CALL _arc125_column('lembrete_envios','id_lembrete','id_lembrete INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='versao'),'Tabela parcial: lembrete_envios.versao');
CALL _arc125_column('lembrete_envios','versao','versao INT UNSIGNED NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='estado'),'Tabela parcial: lembrete_envios.estado');
CALL _arc125_column('lembrete_envios','estado','estado ENUM(''reservado'',''enviado'',''falhou'',''cancelado'') NOT NULL DEFAULT ''reservado''','enum(''reservado'',''enviado'',''falhou'',''cancelado'')','0','reservado','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='reservado_em'),'Tabela parcial: lembrete_envios.reservado_em');
CALL _arc125_column('lembrete_envios','reservado_em','reservado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP','datetime','0','CURRENT_TIMESTAMP','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lembrete_envios' AND COLUMN_NAME='finalizado_em'),'Tabela parcial: lembrete_envios.finalizado_em');
CALL _arc125_column('lembrete_envios','finalizado_em','finalizado_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_index('lembrete_envios','PRIMARY','id_lembrete,versao','1','0');
CALL _arc125_fk('lembrete_envios','id_lembrete','lembretes','id_lembrete','CASCADE','0');
-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: inscricoes_editais.
SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='id_inscricao'),'Tabela parcial: inscricoes_editais.id_inscricao');
CALL _arc125_column('inscricoes_editais','id_inscricao','id_inscricao INT AUTO_INCREMENT PRIMARY KEY','int','0',NULL,'1','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='id_aviso'),'Tabela parcial: inscricoes_editais.id_aviso');
CALL _arc125_column('inscricoes_editais','id_aviso','id_aviso INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='id_usuario'),'Tabela parcial: inscricoes_editais.id_usuario');
CALL _arc125_column('inscricoes_editais','id_usuario','id_usuario INT NOT NULL','int','0',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='status'),'Tabela parcial: inscricoes_editais.status');
CALL _arc125_column('inscricoes_editais','status','status ENUM(''inscrito'', ''em_analise'', ''deferido'', ''indeferido'', ''aprovado'') DEFAULT ''inscrito''','enum(''inscrito'',''em_analise'',''deferido'',''indeferido'',''aprovado'')','1','inscrito','0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='motivo'),'Tabela parcial: inscricoes_editais.motivo');
CALL _arc125_column('inscricoes_editais','motivo','motivo TEXT NULL','text','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='anexo_url'),'Tabela parcial: inscricoes_editais.anexo_url');
CALL _arc125_column('inscricoes_editais','anexo_url','anexo_url VARCHAR(500) NULL','varchar(500)','1',NULL,'0','0',NULL,'0');
CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inscricoes_editais' AND COLUMN_NAME='criado_em'),'Tabela parcial: inscricoes_editais.criado_em');
CALL _arc125_column('inscricoes_editais','criado_em','criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP','timestamp','1','CURRENT_TIMESTAMP','0','0',NULL,'0');
CALL _arc125_index('inscricoes_editais','PRIMARY','id_inscricao','1','0');
CALL _arc125_index('inscricoes_editais','uq_aviso_usuario','id_aviso,id_usuario','1','0');
-- CHECK ausente sera criado apos adicionar suas colunas. Se existe, validar regra antes.
CALL _arc125_check(0);
CREATE TABLE IF NOT EXISTS arcadia_schema_migrations (
 versao VARCHAR(32) PRIMARY KEY,checksum CHAR(64) NOT NULL,verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.25' AND checksum<>'f0402abf4488dcc69f32855bd22dfd6ddb85fcdca802ca9c2a7e974205c6a8b1'),'Checksum divergente no registro da migracao.');
CREATE TABLE IF NOT EXISTS projeto_inscricoes_externas (
 id_projeto INT NOT NULL,
 id_externo INT NOT NULL,
 status ENUM('inscrito','aprovado','recusado','cancelado') NOT NULL DEFAULT 'inscrito',
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id_projeto,id_externo),
 FOREIGN KEY(id_projeto) REFERENCES projetos(id_projeto) ON DELETE CASCADE,
 FOREIGN KEY(id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS agenda_externa (
 id_evento INT AUTO_INCREMENT PRIMARY KEY,
 id_externo INT NOT NULL,
 titulo VARCHAR(150) NOT NULL,
 descricao TEXT NULL,
 categoria VARCHAR(40) NOT NULL DEFAULT 'evento',
 data_evento DATE NOT NULL,
 data_fim DATE NULL,
 hora_inicio TIME NULL,
 hora_fim TIME NULL,
 local VARCHAR(150) NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS academico_saidas_professor (
 id_saida INT AUTO_INCREMENT PRIMARY KEY,
 id_disciplina INT NOT NULL,
 id_professor INT NULL,
 encerrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(id_disciplina) REFERENCES academico_disciplinas(id_disciplina) ON DELETE CASCADE,
 FOREIGN KEY(id_professor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS preferencias_notificacao (
  id_usuario INT PRIMARY KEY,
  email_lembretes BOOLEAN NOT NULL DEFAULT FALSE,
  consentido_em DATETIME NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lembrete_envios (
  id_lembrete INT NOT NULL,
  versao INT UNSIGNED NOT NULL,
  estado ENUM('reservado','enviado','falhou','cancelado') NOT NULL DEFAULT 'reservado',
  reservado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_em DATETIME NULL,
  PRIMARY KEY (id_lembrete, versao),
  FOREIGN KEY (id_lembrete) REFERENCES lembretes(id_lembrete) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inscricoes_editais (
    id_inscricao INT AUTO_INCREMENT PRIMARY KEY,
    id_aviso INT NOT NULL,
    id_usuario INT NOT NULL,
    status ENUM('inscrito', 'em_analise', 'deferido', 'indeferido', 'aprovado') DEFAULT 'inscrito',
    motivo TEXT NULL,
    anexo_url VARCHAR(500) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_aviso_usuario (id_aviso, id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CALL _arc125_column('projetos','permite_externos','permite_externos TINYINT(1) NOT NULL DEFAULT 0','tinyint','0','0','0','0',NULL,'1');
CALL _arc125_column('calendario','origem_calendario','origem_calendario ENUM(''agenda'',''ifpa'') NOT NULL DEFAULT ''ifpa''','enum(''agenda'',''ifpa'')','0','ifpa','0','0',NULL,'1');
CALL _arc125_column('academico_disciplinas','regime_letivo','regime_letivo ENUM(''legado'',''anual'',''semestral'') NOT NULL DEFAULT ''legado''','enum(''legado'',''anual'',''semestral'')','0','legado','0','0',NULL,'1');
CALL _arc125_column('academico_disciplinas','semestre','semestre TINYINT UNSIGNED NOT NULL DEFAULT 0','tinyint','0','0','0','0',NULL,'1');
CALL _arc125_column('academico_disciplinas','atribuicao_ativa','atribuicao_ativa TINYINT(1) NOT NULL DEFAULT 1','tinyint','0','1','0','0',NULL,'1');
CALL _arc125_column('academico_disciplinas','arquivada_em','arquivada_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'1');
CALL _arc125_column('academico_matriculas','ativa','ativa TINYINT(1) NOT NULL DEFAULT 1','tinyint','0','1','0','0',NULL,'1');
CALL _arc125_column('academico_matriculas','encerrado_em','encerrado_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'1');
CALL _arc125_column('academico_publicacoes','id_autor','id_autor INT NULL','int','1',NULL,'0','0',NULL,'1');
CALL _arc125_column('academico_turmas','nome_chave','nome_chave VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT ''''','varchar(100)','0','','0','0','utf8mb4_bin','1');
CALL _arc125_column('academico_turmas','arquivada_em','arquivada_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'1');
CALL _arc125_column('lembretes','id_tarefa','id_tarefa INT NULL','int','1',NULL,'0','0',NULL,'1');
CALL _arc125_column('lembretes','agendado_utc','agendado_utc DATETIME NULL','datetime','1',NULL,'0','0',NULL,'1');
CALL _arc125_column('lembretes','fuso_horario','fuso_horario VARCHAR(64) NOT NULL DEFAULT ''America/Fortaleza''','varchar(64)','0','America/Fortaleza','0','0',NULL,'1');
CALL _arc125_column('lembretes','enviar_email','enviar_email BOOLEAN NOT NULL DEFAULT FALSE','tinyint','0','0','0','0',NULL,'1');
CALL _arc125_column('lembretes','versao','versao INT UNSIGNED NOT NULL DEFAULT 1','int','0','1','0','0',NULL,'1');
-- Preencher somente chave derivada ausente/inconsistente, preservando nomes visiveis e IDs.
CALL _arc125_names();
CALL _arc125_index('academico_disciplinas','uq_oferta_turma','id_turma,nome,ano_letivo,regime_letivo,semestre','1','1');
CALL _arc125_index('academico_turmas','uq_turma_nome_global','nome_chave','1','1');
CALL _arc125_index('lembretes','idx_lembrete_envio','enviar_email,ativo,agendado_utc','0','1');
CALL _arc125_fk('academico_publicacoes','id_autor','usuarios','id_usuario','SET NULL','1');
CALL _arc125_fk('lembretes','id_tarefa','tarefas','id_tarefa','CASCADE','1');
CALL _arc125_index('projeto_inscricoes_externas','PRIMARY','id_projeto,id_externo','1','1');
CALL _arc125_fk('projeto_inscricoes_externas','id_projeto','projetos','id_projeto','CASCADE','1');
CALL _arc125_fk('projeto_inscricoes_externas','id_externo','publico_externo','id_externo','CASCADE','1');
CALL _arc125_index('agenda_externa','PRIMARY','id_evento','1','1');
CALL _arc125_fk('agenda_externa','id_externo','publico_externo','id_externo','CASCADE','1');
CALL _arc125_index('academico_saidas_professor','PRIMARY','id_saida','1','1');
CALL _arc125_fk('academico_saidas_professor','id_disciplina','academico_disciplinas','id_disciplina','CASCADE','1');
CALL _arc125_fk('academico_saidas_professor','id_professor','usuarios','id_usuario','SET NULL','1');
CALL _arc125_index('preferencias_notificacao','PRIMARY','id_usuario','1','1');
CALL _arc125_fk('preferencias_notificacao','id_usuario','usuarios','id_usuario','CASCADE','1');
CALL _arc125_index('lembrete_envios','PRIMARY','id_lembrete,versao','1','1');
CALL _arc125_fk('lembrete_envios','id_lembrete','lembretes','id_lembrete','CASCADE','1');
CALL _arc125_index('inscricoes_editais','PRIMARY','id_inscricao','1','1');
CALL _arc125_index('inscricoes_editais','uq_aviso_usuario','id_aviso,id_usuario','1','1');
CALL _arc125_check(1);
-- O indice substituto ja foi criado e verificado; so agora remover o antigo.
SET @arc125_sql=IF(@arc125_failed=0 AND EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND INDEX_NAME='uq_disciplina_turma'),
 'ALTER TABLE academico_disciplinas DROP INDEX uq_disciplina_turma','SELECT ''Indice antigo ausente ou verificacao interrompida'' AS resultado');
PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS trg_turma_nome_insert BEFORE INSERT ON academico_turmas FOR EACH ROW
BEGIN
 SET NEW.nome=REGEXP_REPLACE(TRIM(NEW.nome),'[[:space:]]+',' ');
 SET NEW.nome_chave=LOWER(NEW.nome);
END$$
CREATE TRIGGER IF NOT EXISTS trg_turma_nome_update BEFORE UPDATE ON academico_turmas FOR EACH ROW
BEGIN
 SET NEW.nome=REGEXP_REPLACE(TRIM(NEW.nome),'[[:space:]]+',' ');
 SET NEW.nome_chave=LOWER(NEW.nome);
END$$
CREATE TRIGGER IF NOT EXISTS tarefa_invalida_lembretes AFTER UPDATE ON tarefas FOR EACH ROW
BEGIN
  IF (NEW.status='concluida' AND OLD.status<>'concluida') OR NOT (NEW.data_entrega <=> OLD.data_entrega) THEN
    UPDATE lembretes SET ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_tarefa=NEW.id_tarefa;
  END IF;
END$$
DELIMITER ;
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_turma_nome_insert' AND (
 EVENT_OBJECT_TABLE='academico_turmas' AND ACTION_TIMING='BEFORE' AND EVENT_MANIPULATION='INSERT' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','')='beginsetnew.nome=regexp_replace(trim(new.nome),''[[:space:]]+'','''');setnew.nome_chave=lower(new.nome);end')),'Trigger ausente ou divergente: trg_turma_nome_insert');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='trg_turma_nome_update' AND (
 EVENT_OBJECT_TABLE='academico_turmas' AND ACTION_TIMING='BEFORE' AND EVENT_MANIPULATION='UPDATE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','')='beginsetnew.nome=regexp_replace(trim(new.nome),''[[:space:]]+'','''');setnew.nome_chave=lower(new.nome);end')),'Trigger ausente ou divergente: trg_turma_nome_update');
CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='tarefa_invalida_lembretes' AND (
 EVENT_OBJECT_TABLE='tarefas' AND ACTION_TIMING='AFTER' AND EVENT_MANIPULATION='UPDATE' AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','')='beginif(new.status=''concluida''andold.status<>''concluida'')ornot(new.data_entrega<=>old.data_entrega)thenupdatelembretessetativo=false,enviar_email=false,versao=versao+1whereid_tarefa=new.id_tarefa;endif;end')),'Trigger ausente ou divergente: tarefa_invalida_lembretes');
CALL _arc125_column('projetos','permite_externos','permite_externos TINYINT(1) NOT NULL DEFAULT 0','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_column('calendario','origem_calendario','origem_calendario ENUM(''agenda'',''ifpa'') NOT NULL DEFAULT ''ifpa''','enum(''agenda'',''ifpa'')','0','ifpa','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','regime_letivo','regime_letivo ENUM(''legado'',''anual'',''semestral'') NOT NULL DEFAULT ''legado''','enum(''legado'',''anual'',''semestral'')','0','legado','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','semestre','semestre TINYINT UNSIGNED NOT NULL DEFAULT 0','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','atribuicao_ativa','atribuicao_ativa TINYINT(1) NOT NULL DEFAULT 1','tinyint','0','1','0','0',NULL,'0');
CALL _arc125_column('academico_disciplinas','arquivada_em','arquivada_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('academico_matriculas','ativa','ativa TINYINT(1) NOT NULL DEFAULT 1','tinyint','0','1','0','0',NULL,'0');
CALL _arc125_column('academico_matriculas','encerrado_em','encerrado_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('academico_publicacoes','id_autor','id_autor INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('academico_turmas','nome_chave','nome_chave VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT ''''','varchar(100)','0','','0','0','utf8mb4_bin','0');
CALL _arc125_column('academico_turmas','arquivada_em','arquivada_em DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('lembretes','id_tarefa','id_tarefa INT NULL','int','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('lembretes','agendado_utc','agendado_utc DATETIME NULL','datetime','1',NULL,'0','0',NULL,'0');
CALL _arc125_column('lembretes','fuso_horario','fuso_horario VARCHAR(64) NOT NULL DEFAULT ''America/Fortaleza''','varchar(64)','0','America/Fortaleza','0','0',NULL,'0');
CALL _arc125_column('lembretes','enviar_email','enviar_email BOOLEAN NOT NULL DEFAULT FALSE','tinyint','0','0','0','0',NULL,'0');
CALL _arc125_column('lembretes','versao','versao INT UNSIGNED NOT NULL DEFAULT 1','int','0','1','0','0',NULL,'0');
CALL _arc125_index('academico_disciplinas','uq_oferta_turma','id_turma,nome,ano_letivo,regime_letivo,semestre','1','0');
CALL _arc125_index('academico_turmas','uq_turma_nome_global','nome_chave','1','0');
CALL _arc125_index('lembretes','idx_lembrete_envio','enviar_email,ativo,agendado_utc','0','0');
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND INDEX_NAME='uq_disciplina_turma'),'Indice antigo ainda existe.');
INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.25','f0402abf4488dcc69f32855bd22dfd6ddb85fcdca802ca9c2a7e974205c6a8b1' WHERE @arc125_failed=0;
SELECT * FROM arcadia_schema_migrations WHERE versao='1.1.25';
DROP PROCEDURE IF EXISTS _arc125_assert;
DROP PROCEDURE IF EXISTS _arc125_column;
DROP PROCEDURE IF EXISTS _arc125_index;
DROP PROCEDURE IF EXISTS _arc125_fk;
DROP PROCEDURE IF EXISTS _arc125_names;
DROP PROCEDURE IF EXISTS _arc125_check;
