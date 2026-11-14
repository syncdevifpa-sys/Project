-- Executar manualmente após backup. Não altera nem apaga publicações existentes.
CREATE TABLE IF NOT EXISTS tarefa_arquivos (
    id_tarefa INT NOT NULL PRIMARY KEY,
    arquivada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tarefa_arquivos_tarefa FOREIGN KEY (id_tarefa)
        REFERENCES tarefas(id_tarefa) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Identificação das atividades sem substituir os tipos históricos da publicação.
SET @arc_activity_exists=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_publicacoes' AND COLUMN_NAME='tipo_atividade');
SET @arc_activity_sql=IF(@arc_activity_exists=0,'ALTER TABLE academico_publicacoes ADD COLUMN tipo_atividade VARCHAR(30) NULL','SELECT 1');
PREPARE arc_activity_statement FROM @arc_activity_sql;
EXECUTE arc_activity_statement;
DEALLOCATE PREPARE arc_activity_statement;

SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='tarefa_arquivos') OR (TABLE_NAME='academico_publicacoes' AND COLUMN_NAME='tipo_atividade'));
