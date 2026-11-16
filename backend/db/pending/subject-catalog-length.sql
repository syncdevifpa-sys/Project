-- Amplia nomes oficiais sem cortar descrições nem alterar vínculos ou IDs.
-- Revisar e aplicar no MySQL antes de importar o catálogo oficial completo.
ALTER TABLE academico_catalogo_disciplinas MODIFY COLUMN nome VARCHAR(150) NOT NULL;
ALTER TABLE academico_disciplinas MODIFY COLUMN nome VARCHAR(150) NOT NULL;
