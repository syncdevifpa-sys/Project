-- SOMENTE LEITURA. Não reaplicar a migração após registro confirmado.
SELECT DATABASE() AS banco,VERSION() AS versao;
SELECT COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendario' AND COLUMN_NAME='visibilidade';
SELECT visibilidade,COUNT(*) AS eventos FROM calendario GROUP BY visibilidade;
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao IN ('1.1.27','1.1.28');
