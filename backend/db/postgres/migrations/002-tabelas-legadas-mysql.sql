-- Tabelas extras encontradas na origem MySQL do Arcádia. Aplicar uma vez na branch Neon de teste.
BEGIN;
CREATE TABLE public.conta_nomes (
  tipo text NOT NULL CHECK (tipo IN ('users','external')),
  id_conta integer NOT NULL,
  nome_exibicao citext NULL CHECK (nome_exibicao IS NULL OR char_length(nome_exibicao) <= 100),
  PRIMARY KEY (tipo, id_conta)
);
CREATE TABLE public.de_para (
  id_apagar integer NOT NULL PRIMARY KEY,
  id_manter integer NOT NULL
);
COMMIT;
