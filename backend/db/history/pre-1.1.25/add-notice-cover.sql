-- Execute no banco do site. Preserva publicações e permite repetir o arquivo.
-- ALTER TABLE confirma transações pendentes implicitamente.
SELECT DATABASE() AS banco_selecionado;
SET @cover_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'avisos' AND column_name = 'capa');
SET @cover_sql = IF(@cover_exists = 0, 'ALTER TABLE avisos ADD COLUMN capa MEDIUMTEXT NULL', 'SELECT 1 AS capa_disponivel');
PREPARE cover_statement FROM @cover_sql;
EXECUTE cover_statement;
DEALLOCATE PREPARE cover_statement;
