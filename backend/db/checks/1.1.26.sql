-- SOMENTE LEITURA. Conferencia da evolucao de lembretes.
SELECT DATABASE() AS banco,VERSION() AS versao;
WITH esperadas AS (
 SELECT 'lembretes' AS tabela,'id_externo' AS coluna
 UNION ALL SELECT 'lembretes' AS tabela,'id_evento_externo' AS coluna
 UNION ALL SELECT 'lembretes' AS tabela,'contexto' AS coluna
 UNION ALL SELECT 'publico_externo' AS tabela,'email_lembretes' AS coluna
 UNION ALL SELECT 'publico_externo' AS tabela,'consentimento_lembretes_em' AS coluna
 UNION ALL SELECT 'lembrete_envios' AS tabela,'tentativas' AS coluna
 UNION ALL SELECT 'lembrete_envios' AS tabela,'proxima_tentativa_utc' AS coluna
)
SELECT e.tabela,e.coluna,IF(c.COLUMN_NAME IS NULL,'PENDENTE','OK') AS situacao,c.COLUMN_TYPE,c.IS_NULLABLE,c.COLUMN_DEFAULT
FROM esperadas e LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=e.tabela AND c.COLUMN_NAME=e.coluna;
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='lembretes' AND COLUMN_NAME='id_usuario') OR (TABLE_NAME='lembrete_envios' AND COLUMN_NAME='estado'));
SELECT TRIGGER_NAME,EVENT_OBJECT_TABLE,ACTION_TIMING,EVENT_MANIPULATION,ACTION_STATEMENT
FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME IN
('trg_calendario_lembrete_update','trg_calendario_lembrete_delete','trg_agenda_externa_lembrete_update','trg_agenda_externa_lembrete_delete');
SELECT t.CONSTRAINT_NAME,t.ENFORCED,c.CHECK_CLAUSE FROM information_schema.TABLE_CONSTRAINTS t
JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME='lembretes' AND t.CONSTRAINT_NAME='chk_lembrete_titular';
SELECT k.TABLE_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r
ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.TABLE_NAME='lembretes';
-- Depois de registrar as versoes: esta consulta deve conter 1.1.25 e 1.1.26.
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations ORDER BY versao;
