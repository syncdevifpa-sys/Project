-- 1.1.33: etapas atuais do aluno; revisar e executar manualmente após backup.
-- Nenhum regime ou duração é presumido. Configure cada curso na administração.
SET @arc_stage_exists=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cursos' AND COLUMN_NAME='regime_etapas');
SET @arc_stage_sql=IF(@arc_stage_exists=0,'ALTER TABLE cursos ADD COLUMN regime_etapas ENUM(''semestral'',''anual'') NULL','SELECT 1');
PREPARE arc_stage_statement FROM @arc_stage_sql;
EXECUTE arc_stage_statement;
DEALLOCATE PREPARE arc_stage_statement;
SET @arc_stage_exists=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cursos' AND COLUMN_NAME='total_etapas');
SET @arc_stage_sql=IF(@arc_stage_exists=0,'ALTER TABLE cursos ADD COLUMN total_etapas TINYINT UNSIGNED NULL','SELECT 1');
PREPARE arc_stage_statement FROM @arc_stage_sql;
EXECUTE arc_stage_statement;
DEALLOCATE PREPARE arc_stage_statement;
SET @arc_stage_exists=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='docente_requisitos' AND COLUMN_NAME='id_curso');
SET @arc_stage_sql=IF(@arc_stage_exists=0,'ALTER TABLE docente_requisitos ADD COLUMN id_curso INT NULL','SELECT 1');
PREPARE arc_stage_statement FROM @arc_stage_sql;
EXECUTE arc_stage_statement;
DEALLOCATE PREPARE arc_stage_statement;
SET @arc_stage_exists=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='docente_requisitos' AND COLUMN_NAME='etapa_atual');
SET @arc_stage_sql=IF(@arc_stage_exists=0,'ALTER TABLE docente_requisitos ADD COLUMN etapa_atual TINYINT UNSIGNED NULL','SELECT 1');
PREPARE arc_stage_statement FROM @arc_stage_sql;
EXECUTE arc_stage_statement;
DEALLOCATE PREPARE arc_stage_statement;
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='cursos' AND COLUMN_NAME IN ('regime_etapas','total_etapas')) OR (TABLE_NAME='docente_requisitos' AND COLUMN_NAME IN ('id_curso','etapa_atual')));
