-- Diagnóstico somente leitura. Selecione no Workbench o banco correto antes de executar.
-- Não lista nomes, e-mails, senhas ou tokens e não aplica a migração.
SELECT DATABASE() AS banco_selecionado, VERSION() AS versao_mysql;

SELECT esperado.tabela, esperado.coluna,
       CASE WHEN c.COLUMN_NAME IS NULL THEN 'AUSENTE' ELSE 'PRESENTE' END AS estado,
       c.COLUMN_TYPE AS tipo, c.IS_NULLABLE AS aceita_nulo
FROM (
    SELECT 'conta_nomes' AS tabela, 'tipo' AS coluna UNION ALL
    SELECT 'conta_nomes', 'id_conta' UNION ALL
    SELECT 'conta_nomes', 'nome_exibicao' UNION ALL
    SELECT 'conta_nome_pedidos', 'id_pedido' UNION ALL
    SELECT 'conta_nome_pedidos', 'tipo' UNION ALL
    SELECT 'conta_nome_pedidos', 'id_conta' UNION ALL
    SELECT 'conta_nome_pedidos', 'nome_anterior' UNION ALL
    SELECT 'conta_nome_pedidos', 'nome_solicitado' UNION ALL
    SELECT 'conta_nome_pedidos', 'estado' UNION ALL
    SELECT 'conta_nome_pedidos', 'motivo' UNION ALL
    SELECT 'conta_nome_pedidos', 'criado_em' UNION ALL
    SELECT 'conta_nome_pedidos', 'revisado_por' UNION ALL
    SELECT 'conta_nome_pedidos', 'revisado_em'
) AS esperado
LEFT JOIN information_schema.COLUMNS AS c
  ON c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=esperado.tabela AND c.COLUMN_NAME=esperado.coluna
ORDER BY esperado.tabela, esperado.coluna;

SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('conta_nomes','conta_nome_pedidos');
-- Esperado: 13 colunas presentes e duas tabelas InnoDB. Isto verifica estrutura,
-- não comprova sozinho o conteúdo nem executa operações de cadastro/aprovação.
