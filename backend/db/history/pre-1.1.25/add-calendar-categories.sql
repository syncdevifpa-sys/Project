-- Execute uma vez no banco usado pela aplicação antes de publicar as novas categorias.
-- Preserva registros e categorias existentes; não exclui eventos.
ALTER TABLE calendario
    MODIFY COLUMN categoria ENUM(
        'matricula', 'cancelamento', 'evento', 'edital', 'feriado', 'ferias', 'aniversario', 'atividades_campus', 'sabado_letivo', 'periodo_academico', 'culminancia_bimestral', 'recesso', 'registro_academico', 'ponto_facultativo', 'avaliacao', 'interrupcao_presencial', 'ferias_docentes'
    ) NOT NULL DEFAULT 'evento';
