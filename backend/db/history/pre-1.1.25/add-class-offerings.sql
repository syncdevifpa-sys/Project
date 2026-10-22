-- Executar após add-classes.sql, com backup, somente no banco correto.
-- Legado permanece sem semestre presumido. A turma/coorte e IDs de ofertas não mudam.
ALTER TABLE academico_disciplinas
 ADD COLUMN regime_letivo ENUM('legado','anual','semestral') NOT NULL DEFAULT 'legado',
 ADD COLUMN semestre TINYINT UNSIGNED NOT NULL DEFAULT 0,
 ADD CONSTRAINT chk_oferta_semestre CHECK ((regime_letivo='semestral' AND semestre IN (1,2)) OR (regime_letivo IN ('legado','anual') AND semestre=0));
ALTER TABLE academico_disciplinas
 ADD UNIQUE KEY uq_oferta_turma (id_turma,nome,ano_letivo,regime_letivo,semestre);
ALTER TABLE academico_disciplinas DROP INDEX uq_disciplina_turma;
