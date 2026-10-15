-- Migração incremental opcional. Execute no banco correto após revisão.
-- DDL no MySQL faz COMMIT implícito: este ALTER não é uma prévia com ROLLBACK.
-- Não execute schema.sql em banco existente. Não modifica IDs/autores/conteúdo.
-- Registros existentes recebem tipo aviso; repetir este arquivo não recria a coluna.
SELECT DATABASE() AS banco_selecionado;
SET @arcadia_notice_type_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'avisos' AND COLUMN_NAME = 'tipo_publicacao'),
    'SELECT ''Coluna tipo_publicacao já existe'' AS resultado',
    'ALTER TABLE avisos ADD COLUMN tipo_publicacao ENUM(''aviso'', ''noticia'') NOT NULL DEFAULT ''aviso'' AFTER id_usuario'
);
PREPARE arcadia_notice_type FROM @arcadia_notice_type_sql;
EXECUTE arcadia_notice_type;
DEALLOCATE PREPARE arcadia_notice_type;
SHOW COLUMNS FROM avisos LIKE 'tipo_publicacao';
SELECT tipo_publicacao, COUNT(*) AS total FROM avisos GROUP BY tipo_publicacao;
