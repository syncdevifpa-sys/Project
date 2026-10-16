-- Execute uma vez no banco usado pela aplicação antes de publicar as novas categorias.
-- Preserva registros e categorias existentes; não exclui eventos.
ALTER TABLE calendario
    MODIFY COLUMN categoria ENUM(
        'matricula', 'cancelamento', 'evento', 'edital', 'feriado', 'ferias', 'aniversario'
    ) NOT NULL DEFAULT 'evento';
