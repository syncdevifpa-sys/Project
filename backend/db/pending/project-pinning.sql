-- Execute uma vez no banco existente antes de fixar projetos.
ALTER TABLE projetos ADD COLUMN fixado BOOLEAN NOT NULL DEFAULT FALSE;
