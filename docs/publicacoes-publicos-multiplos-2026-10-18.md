# Notícias e públicos múltiplos

Base: branch `codex/fix-auth-calendar`, atualizada a partir da main 1.1.19.

## Causa confirmada

Na consulta inicial, o banco configurado tinha apenas `publico_alvo ENUM('todos','discente','docente','servidor','externo')`, sem a coluna `tipo_publicacao`. Isso impedia a criação e a edição de Notícia. A conferência posterior identificou `avisos` como BASE TABLE, sem gatilho de UPDATE; o gatilho existente verifica apenas a autoria no INSERT. O nome da tabela não fixa o tipo da publicação.

## Atualização do banco

Após o pedido explícito de ajustar o banco, foi confirmada a correspondência entre as duas publicações da tabela `arcadia.avisos` e o backend da porta 3001. A atualização incremental foi aplicada: `tipo_publicacao ENUM('aviso','noticia')` e `publico_alvo SET('todos','discente','docente','servidor','externo')`. Foi feita cópia local ignorada pelo Git e conferido o hash dos campos anteriores: as duas publicações foram preservadas. Uma transação de teste validou Notícia e públicos múltiplos e foi revertida; o conteúdo não foi alterado por esse teste.

O arquivo `backend/admin/update-notice-publishing.sql` permanece disponível para outros ambientes que ainda não receberam a atualização. Não é necessário recriar a tabela ou executar o schema completo. DDL MySQL tem commit implícito.

## Comportamento

- Criar e editar usa caixas de seleção para um ou mais públicos. Todos exclui escolhas específicas; marcar uma escolha específica desmarca Todos. Sem seleção, o formulário informa o erro antes de enviar.
- API aceita os valores antigos, uma lista JSON ou uma string separada por vírgulas. Valida e normaliza as opções; valores desconhecidos ou listas vazias são rejeitados. Todos é persistido sozinho.
- MySQL mantém as opções em `publico_alvo` como SET; professores e servidores podem compartilhar uma publicação sem duplicá-la.
- Todos aparece em qualquer filtro de público, incluindo a contagem. Selecionar mais de um público não duplica os cartões.
- As permissões do servidor continuam sendo verificadas antes dos filtros. Uma publicação só para docentes e servidores não é entregue a discentes ou visitantes. Públicos com externo são incluídos no início público; rascunhos continuam restritos ao autor ou administrador.
- Lista de lidos e contagem de não lidos reconhecem múltiplos públicos. Cartões, tabela e detalhe mostram os nomes completos dos públicos escolhidos.
- Bancos antigos continuam aceitando um único público. Múltiplos públicos ou Notícia em banco sem suporte retornam um aviso de atualização e preservam o formulário.

Entrega autorizada para a main como versão 1.1.20. O backend local foi reiniciado para carregar as alterações. A API real passou a retornar os tipos distintos Aviso e Notícia. A migração já foi aplicada ao banco configurado localmente; ambientes com outro banco precisam receber a mesma atualização.

## Correção da prévia local

O endereço 127.0.0.1:61119 usa `tools/final-ui-preview.cjs`, com dados fictícios e conexão real substituída por simulação. A lista de publicações era fixa e não havia POST/PUT específicos para salvar Notícia. Aplicar SQL ao banco externo não alterava essa prévia. Agora criação, edição e leitura de detalhe de publicações funcionam em memória, com o mesmo validador do backend; nenhuma gravação ocorre no banco. Reiniciar a demonstração restaura os dados fictícios.

O seletor Tipo de publicação recebeu fundo, texto e borda do tema, seta, foco visível e altura mínima de 44px. A conferência em navegador isolado confirmou edição de Aviso para Notícia, professores e servidores, criação de Notícia e filtro de tipos. Em 390px não houve rolagem horizontal. Capturas locais: avisos-seletor-tipo-desktop.png e avisos-seletor-tipo-celular.png.

## Confirmação de exclusão

As exclusões de publicações e de eventos usam um diálogo do Arcádia com estilos do tema, lista de títulos, botão destrutivo identificado e foco inicial em Cancelar. Texto é inserido com textContent, sem interpretar HTML. Cancelar, Escape ou fechar o diálogo não enviam exclusão; o foco retorna ao controle anterior. A conferência em navegador isolado cobriu desktop escuro e celular claro de 390px, sem exclusões nem rolagem horizontal.

Validação final: 263 testes passaram, sem falhas ou testes ignorados, incluindo PDFs reais, permissões, edição de notícias e comportamento do diálogo. Build concluído. Evidências: tmp/security-audit/notices-dialog-final.txt e capturas confirmacao-exclusao-dark.png / confirmacao-exclusao-light.png.
