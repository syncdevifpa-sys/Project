-- Execute uma vez. Preserva os eventos existentes como públicos e visíveis.
ALTER TABLE calendario
    ADD COLUMN oculto TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN visibilidade ENUM('publico','pessoal') NOT NULL DEFAULT 'publico';

CREATE OR REPLACE VIEW vw_proximas_datas AS
    SELECT 'calendario' AS origem, id_evento AS id_origem, titulo,
           data_evento AS data, categoria AS rotulo, NULL AS id_usuario
      FROM calendario WHERE oculto = 0 AND visibilidade = 'publico'
    UNION ALL
    SELECT 'aviso', id_aviso, titulo,
           COALESCE(data_evento, data_prazo), categoria, NULL
      FROM avisos
     WHERE situacao = 'publicado' AND COALESCE(data_evento, data_prazo) IS NOT NULL
    UNION ALL
    SELECT 'tarefa', id_tarefa, titulo, data_entrega, status, id_usuario
      FROM tarefas
     WHERE status <> 'concluida' AND data_entrega IS NOT NULL
    UNION ALL
    SELECT 'documento', id_documento, titulo, COALESCE(previsao, data_emissao), status, id_usuario
      FROM documentos
     WHERE COALESCE(previsao, data_emissao) IS NOT NULL;

-- Painel > "Criados recentemente". Filtre: (id_usuario IS NULL OR id_usuario = ?)
--   ORDER BY criado_em DESC LIMIT 4
CREATE OR REPLACE VIEW vw_criados_recentemente AS
    SELECT 'projeto' AS origem, id_projeto AS id_origem, titulo, criado_em, NULL AS id_usuario
      FROM projetos WHERE aprovacao = 'aprovado'
    UNION ALL
    SELECT 'aviso', id_aviso, titulo, criado_em, NULL
      FROM avisos WHERE situacao = 'publicado'
    UNION ALL
    SELECT 'calendario', id_evento, titulo, criado_em, NULL
      FROM calendario WHERE oculto = 0 AND visibilidade = 'publico'
    UNION ALL
    SELECT 'documento', id_documento, titulo, criado_em, id_usuario
      FROM documentos;

