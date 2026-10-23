-- Workbench: rode primeiro o diagnóstico abaixo. Se retornar linhas, PARE.
-- Não apague/funda turmas. Revise nomes e vínculos com a administração e repita o diagnóstico.
SELECT LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')) COLLATE utf8mb4_bin AS nome_normalizado,
 COUNT(*) AS quantidade, GROUP_CONCAT(id_turma ORDER BY id_turma) AS ids
FROM academico_turmas GROUP BY nome_normalizado HAVING COUNT(*) > 1;
-- Continue somente sem duplicados, após backup e em janela sem criação/renomeação de turmas.
-- Se a restrição UNIQUE falhar, preserve os dados e resolva o diagnóstico; não force a migração.
ALTER TABLE academico_turmas ADD COLUMN nome_chave VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '';
UPDATE academico_turmas SET nome_chave=LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '));
ALTER TABLE academico_turmas ADD UNIQUE KEY uq_turma_nome_global(nome_chave);
DELIMITER $$
CREATE TRIGGER trg_turma_nome_insert BEFORE INSERT ON academico_turmas FOR EACH ROW
BEGIN
 SET NEW.nome=REGEXP_REPLACE(TRIM(NEW.nome),'[[:space:]]+',' ');
 SET NEW.nome_chave=LOWER(NEW.nome);
END$$
CREATE TRIGGER trg_turma_nome_update BEFORE UPDATE ON academico_turmas FOR EACH ROW
BEGIN
 SET NEW.nome=REGEXP_REPLACE(TRIM(NEW.nome),'[[:space:]]+',' ');
 SET NEW.nome_chave=LOWER(NEW.nome);
END$$
DELIMITER ;
