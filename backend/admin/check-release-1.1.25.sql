-- SOMENTE LEITURA. Execute primeiro no banco de produção selecionado no Workbench.
-- Não contém credenciais nem altera dados ou tabelas.
SELECT DATABASE() AS banco_selecionado, VERSION() AS versao_mysql;

-- Pré-requisitos já informados como aplicados. Todas as linhas precisam estar OK.
WITH esperadas AS (
 SELECT 'usuarios' AS tabela UNION ALL SELECT 'publico_externo'
 UNION ALL SELECT 'projetos' UNION ALL SELECT 'projeto_inscricoes'
 UNION ALL SELECT 'calendario' UNION ALL SELECT 'tarefas' UNION ALL SELECT 'lembretes'
 UNION ALL SELECT 'email_estado' UNION ALL SELECT 'documento_itens'
 UNION ALL SELECT 'academico_turmas' UNION ALL SELECT 'academico_disciplinas'
 UNION ALL SELECT 'academico_matriculas' UNION ALL SELECT 'academico_publicacoes'
 UNION ALL SELECT 'academico_convites'
)
SELECT e.tabela, IF(t.TABLE_NAME IS NULL,'AUSENTE: PARE','OK') AS situacao
FROM esperadas e LEFT JOIN information_schema.TABLES t
 ON t.TABLE_SCHEMA=DATABASE() AND t.TABLE_NAME=e.tabela ORDER BY e.tabela;

-- Antes da atualização: PENDENTE é esperado para os novos campos.
-- Depois: todas as linhas precisam estar OK. Não repetir ALTER em campo já existente.
WITH esperadas AS (
 SELECT 'projetos' AS tabela, 'permite_externos' AS coluna
 UNION ALL SELECT 'calendario','origem_calendario'
 UNION ALL SELECT 'academico_disciplinas','regime_letivo'
 UNION ALL SELECT 'academico_disciplinas','semestre'
 UNION ALL SELECT 'academico_disciplinas','atribuicao_ativa'
 UNION ALL SELECT 'academico_disciplinas','arquivada_em'
 UNION ALL SELECT 'academico_matriculas','ativa'
 UNION ALL SELECT 'academico_matriculas','encerrado_em'
 UNION ALL SELECT 'academico_publicacoes','id_autor'
 UNION ALL SELECT 'academico_turmas','nome_chave'
 UNION ALL SELECT 'academico_turmas','arquivada_em'
 UNION ALL SELECT 'lembretes','id_tarefa'
 UNION ALL SELECT 'lembretes','agendado_utc'
 UNION ALL SELECT 'lembretes','fuso_horario'
 UNION ALL SELECT 'lembretes','enviar_email'
 UNION ALL SELECT 'lembretes','versao'
)
SELECT e.tabela,e.coluna,IF(c.COLUMN_NAME IS NULL,'PENDENTE','OK') AS situacao,
 c.COLUMN_TYPE,c.IS_NULLABLE,c.COLUMN_DEFAULT
FROM esperadas e LEFT JOIN information_schema.COLUMNS c
 ON c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=e.tabela AND c.COLUMN_NAME=e.coluna
ORDER BY e.tabela,e.coluna;

WITH esperadas AS (
 SELECT 'projeto_inscricoes_externas' AS tabela UNION ALL SELECT 'agenda_externa'
 UNION ALL SELECT 'academico_saidas_professor' UNION ALL SELECT 'preferencias_notificacao'
 UNION ALL SELECT 'lembrete_envios'
)
SELECT e.tabela,IF(t.TABLE_NAME IS NULL,'PENDENTE','OK') AS situacao
FROM esperadas e LEFT JOIN information_schema.TABLES t
 ON t.TABLE_SCHEMA=DATABASE() AND t.TABLE_NAME=e.tabela ORDER BY e.tabela;

-- Diagnóstico de nomes: precisa retornar ZERO LINHAS antes da migração de unicidade.
-- Execute esta consulta só se academico_turmas existe nos pré-requisitos acima.
SELECT LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')) COLLATE utf8mb4_bin AS nome_normalizado,
 COUNT(*) AS quantidade,GROUP_CONCAT(id_turma ORDER BY id_turma) AS ids
FROM academico_turmas GROUP BY nome_normalizado HAVING COUNT(*)>1;

-- Depois: três triggers, uq_oferta_turma e uq_turma_nome_global devem existir;
-- uq_disciplina_turma deve estar ausente. Confira também os FKs e o CHECK.
SELECT TRIGGER_NAME,EVENT_OBJECT_TABLE FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME IN
 ('trg_turma_nome_insert','trg_turma_nome_update','tarefa_invalida_lembretes');
SELECT TABLE_NAME,INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS colunas
FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
 AND INDEX_NAME IN ('uq_oferta_turma','uq_disciplina_turma','uq_turma_nome_global','idx_lembrete_envio')
GROUP BY TABLE_NAME,INDEX_NAME;
SELECT TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN
 ('academico_disciplinas','academico_publicacoes','lembretes','preferencias_notificacao','lembrete_envios');
