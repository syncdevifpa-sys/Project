// Geração offline: este módulo não abre conexão nem executa SQL.
const { checksum } = require('../generated/migration-checksum.js');
const quote = (v) => v === null || v === undefined ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'";
const helpers = `
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
  -- CHECK_CLAUSE pode devolver delimitadores de strings como barra+aspas.
  -- Nesta regra, os tres literais ENUM nao contem aspas ou barras internas.
  -- Normalizar apenas esses literais conhecidos, sem mudar sql_mode nem a constraint.
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'semestral',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'semestral',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'legado',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'legado',CHAR(39)));
  SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'anual',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'anual',CHAR(39)));
  -- Compara todo o dominio: tres valores ENUM x todos os 256 valores TINYINT UNSIGNED.
  SET @arc125_sql=CONCAT('SELECT SUM(COALESCE((',clause_value,'),1) <> ((regime_letivo=''semestral'' AND semestre IN (1,2)) OR (regime_letivo IN (''legado'',''anual'') AND semestre=0))) INTO @arc125_check_diff FROM (WITH RECURSIVE n AS (SELECT 0 AS semestre UNION ALL SELECT semestre+1 FROM n WHERE semestre<255) SELECT n.semestre,r.regime_letivo FROM n CROSS JOIN (SELECT ''legado'' AS regime_letivo UNION ALL SELECT ''anual'' UNION ALL SELECT ''semestral'') r) domain_values');
  PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
  CALL _arc125_assert(@arc125_check_diff=0,'CHECK de semestre tem regra divergente.');
 END IF;
END$$
DELIMITER ;
`;
function column(c, apply) {
    return `CALL _arc125_column(${[c.table,c.name,c.definition,c.type,c.nullable?1:0,c.default,c.auto?1:0,c.onUpdate?1:0,c.collation,apply?1:0].map(quote).join(',')});`;
}
function index(i, apply) {
    return `CALL _arc125_index(${[i.table,i.name,i.columns,i.unique?1:0,apply?1:0].map(quote).join(',')});`;
}
function fk(i, apply) {
    return `CALL _arc125_fk(${[i.table,i.columns,i.ref,i.refColumns,i.delete,apply?1:0].map(quote).join(',')});`;
}
function triggerCheck(t, required = false) {
    const body = t.body.toLowerCase().replace(/[`\s]/g,'');
    // BEGIN/END opcional somente quando o corpo contem um unico UPDATE.
    const singleUpdate = /^begin(update[^;]+);end$/.exec(body);
    const bodies = singleUpdate ? [body, singleUpdate[1], singleUpdate[1]+';'] : [body];
    return `CALL _arc125_assert(${required?'EXISTS':'NOT EXISTS'}(SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=${quote(t.name)} AND ${required?'':'NOT '}(
 EVENT_OBJECT_TABLE=${quote(t.table)} AND ACTION_TIMING=${quote(t.timing)} AND EVENT_MANIPULATION=${quote(t.event)} AND
 REGEXP_REPLACE(LOWER(REPLACE(ACTION_STATEMENT,CHAR(96),'')),'[[:space:]]+','') IN (${bodies.map(quote).join(',')}))),${quote('Trigger ausente ou divergente: '+t.name)});`;
}
function generate(spec) {
    const hash = checksum(spec);
    const out = [`-- GERADO por node tools/db/build-migrations.cjs. Nao editar este arquivo manualmente.
-- MySQL 8.4. Banco EXISTENTE com baseline documentado; backup e janela de manutencao.
-- Workbench: ativar parar ao ocorrer erro e executar o arquivo inteiro na mesma conexao.
-- DDL faz COMMIT implicito. Nao ha rollback global. Repetir apos corrigir a causa retoma objetos ausentes.
-- Nao executa schema.sql, nao exclui registros nem resolve duplicados automaticamente.
SELECT DATABASE() AS banco_selecionado,VERSION() AS versao;
SET @arc125_failed=0;
`, helpers,
    "CALL _arc125_assert(DATABASE() IS NOT NULL,'Selecione o banco existente antes de continuar.');",
    "CALL _arc125_assert(VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%','Esta migracao foi preparada para MySQL 8.4.');",
    ...spec.baseline.map((t)=>`CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(t)} AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),${quote('Baseline ausente ou incompativel: '+t)});`),
    `CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM academico_turmas GROUP BY LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')) COLLATE utf8mb4_bin HAVING COUNT(*)>1),'Ha turmas duplicadas. Revise nomes; nao apague nem funda registros.');`,
    '-- Validar todos os objetos existentes antes de modificar a estrutura.',
    ...spec.columns.map((c)=>column(c,false)),
    ...spec.indexes.map((i)=>index(i,false)),
    ...spec.foreignKeys.map((i)=>fk(i,false)),
    `CALL _arc125_index('academico_disciplinas','uq_disciplina_turma','id_turma,nome,ano_letivo',1,0);`,
    ...spec.triggers.map((t)=>triggerCheck(t))];
    for (const table of spec.tables) {
        out.push(`-- Tabela existente deve estar completa. IF NOT EXISTS sozinho nao comprova equivalencia: ${table.name}.`);
        out.push(`SET @arc125_table_exists=EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(table.name)});`);
        out.push(`CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(table.name)} AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela existente precisa ser InnoDB.');`);
        for (const c of table.columns) {
            out.push(`CALL _arc125_assert(NOT @arc125_table_exists OR EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(table.name)} AND COLUMN_NAME=${quote(c.name)}),${quote('Tabela parcial: '+table.name+'.'+c.name)});`,column(c,false));
        }
        out.push(...table.indexes.map((i)=>index(i,false)),...table.foreignKeys.map((i)=>fk(i,false)));
    }
    out.push(`-- CHECK ausente sera criado apos adicionar suas colunas. Se existe, validar regra antes.
CALL _arc125_check(0);
CREATE TABLE IF NOT EXISTS arcadia_schema_migrations (
 versao VARCHAR(32) PRIMARY KEY,checksum CHAR(64) NOT NULL,verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao=${quote(spec.version)} AND checksum<>${quote(hash)}),'Checksum divergente no registro da migracao.');`,
    ...spec.tables.map((t)=>t.sql), ...spec.columns.map((c)=>column(c,true)),
    '-- Preencher somente chave derivada ausente/inconsistente, preservando nomes visiveis e IDs.',
    'CALL _arc125_names();',
    ...spec.indexes.map((i)=>index(i,true)),
    ...spec.foreignKeys.map((i)=>fk(i,true)),
    ...spec.tables.flatMap((t)=>[...t.indexes.map((i)=>index(i,true)),...t.foreignKeys.map((i)=>fk(i,true))]),
    'CALL _arc125_check(1);',
    `-- O indice substituto ja foi criado e verificado; so agora remover o antigo.
SET @arc125_sql=IF(@arc125_failed=0 AND EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND INDEX_NAME='uq_disciplina_turma'),
 'ALTER TABLE academico_disciplinas DROP INDEX uq_disciplina_turma','SELECT ''Indice antigo ausente ou verificacao interrompida'' AS resultado');
PREPARE arc125_stmt FROM @arc125_sql; EXECUTE arc125_stmt; DEALLOCATE PREPARE arc125_stmt;
DELIMITER $$`,
    ...spec.triggers.map((t)=>`CREATE TRIGGER IF NOT EXISTS ${t.name} ${t.timing} ${t.event} ON ${t.table} FOR EACH ROW\n${t.body}$$`),
    'DELIMITER ;',
    ...spec.triggers.map((t)=>triggerCheck(t,true)),
    ...spec.columns.map((c)=>column(c,false)),
    ...spec.indexes.map((i)=>index(i,false)),
    `CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND INDEX_NAME='uq_disciplina_turma'),'Indice antigo ainda existe.');`,
    `INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT ${quote(spec.version)},${quote(hash)} WHERE @arc125_failed=0;`,
    'SELECT * FROM arcadia_schema_migrations WHERE versao='+quote(spec.version)+';',
    ...['assert','column','index','fk','names','check'].map((n)=>'DROP PROCEDURE IF EXISTS _arc125_'+n+';'));
    return out.join('\n')+'\n';
}
module.exports = { generate, checksum, column, index, fk, helpers, triggerCheck };
