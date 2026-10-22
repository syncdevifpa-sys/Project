-- Aplicar somente após backup e migrações anteriores de Turmas. Não apaga histórico.
ALTER TABLE academico_turmas ADD COLUMN arquivada_em DATETIME NULL;
ALTER TABLE academico_disciplinas ADD COLUMN arquivada_em DATETIME NULL;
