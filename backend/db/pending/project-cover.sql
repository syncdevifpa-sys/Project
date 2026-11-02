-- Revisar e executar manualmente na base correta após backup. Nenhum dado é removido.
SET @arcadia_project_cover = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projetos' AND COLUMN_NAME='capa');
SET @arcadia_project_sql = IF(@arcadia_project_cover=0,
 'ALTER TABLE projetos ADD COLUMN capa MEDIUMTEXT NULL AFTER descricao',
 'SELECT ''Coluna capa já existe; confira o diagnóstico abaixo.'' AS resultado');
PREPARE arcadia_project_statement FROM @arcadia_project_sql;
EXECUTE arcadia_project_statement;
DEALLOCATE PREPARE arcadia_project_statement;
SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projetos' AND COLUMN_NAME='capa';
