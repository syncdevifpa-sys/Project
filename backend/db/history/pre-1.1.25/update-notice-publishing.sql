-- No banco da aplicação, habilita Notícias e múltiplos públicos sem excluir conteúdo.
-- DDL faz COMMIT implícito. Não execute schema.sql em banco existente.
SELECT DATABASE() AS banco_selecionado;
SET @arcadia_publication_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'avisos' AND COLUMN_NAME = 'tipo_publicacao'),
    'SELECT ''Tipo de publicação já disponível'' AS resultado',
    'ALTER TABLE avisos ADD COLUMN tipo_publicacao ENUM(''aviso'', ''noticia'') NOT NULL DEFAULT ''aviso'' AFTER id_usuario'
);
PREPARE arcadia_publication FROM @arcadia_publication_sql;
EXECUTE arcadia_publication;
DEALLOCATE PREPARE arcadia_publication;
ALTER TABLE avisos MODIFY COLUMN publico_alvo SET('todos','discente','docente','servidor','externo') NOT NULL DEFAULT 'todos';
SHOW COLUMNS FROM avisos WHERE Field IN ('tipo_publicacao', 'publico_alvo');
