-- Opcional e aditivo: revisar e executar manualmente na base correta após backup.
-- Não preenche autoria a partir da conta publicadora e não modifica registros existentes.
SET @arcadia_author_type = (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documento_itens' AND COLUMN_NAME = 'autor_obra'
);
SET @arcadia_author_sql = IF(
  @arcadia_author_type IS NULL,
  'ALTER TABLE documento_itens ADD COLUMN autor_obra VARCHAR(500) NULL AFTER descricao',
  'SELECT ''Coluna já existe; confira o diagnóstico abaixo antes de continuar.'' AS resultado'
);
PREPARE arcadia_author_statement FROM @arcadia_author_sql;
EXECUTE arcadia_author_statement;
DEALLOCATE PREPARE arcadia_author_statement;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
  IF(COLUMN_TYPE = 'varchar(500)' AND IS_NULLABLE = 'YES', 'AUTORIA DISPONIVEL', 'REVISAR TIPO DA COLUNA') AS resultado
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documento_itens' AND COLUMN_NAME = 'autor_obra';
