# Nomes e Notícias — alterações locais

Alterações destinadas à branch codex/desenvolvimento. Nenhuma alteração foi aplicada no banco.

## Nomes

- Nome de exibição opcional nas Configurações, usado na barra e em Pessoas.
- O nome completo continua sempre disponível em Pessoas, abaixo do nome de exibição quando forem diferentes.
- Nome completo protegido também nas rotas antigas de atualização e na edição administrativa comum.
- Pedido de alteração separado; decisão administrativa com resposta, registro do responsável e transação. Aprovação recusa cadastro divergente ou pedido já decidido.
- Contas externas usam rotas próprias, sem compartilhar identificadores com contas institucionais.
- A exclusão da conta remove as novas preferências e solicitações correspondentes.

Para habilitar a persistência, revisar e executar **somente** `backend/db/pending/account-names.sql`, após backup. O arquivo está preparado e não foi executado. Sem ele, o site informa a indisponibilidade e preserva o nome atual. O esquema de instalação nova também foi atualizado; migrações históricas não foram alteradas.

## Notícias

- Filtros reunidos e recolhidos por padrão, com indicador de filtros ativos; busca continua visível.
- Quadro de cartões, tabela, lista compacta com resumo expansível e agrupamento por Situação.
- As chaves antigas dos painéis conservam seu significado interno.
- Ordenação por publicação recente/antiga, título crescente/decrescente e prazo; itens fixados permanecem primeiro. Ordena a coleção completa devolvida pela API, que não pagina essa listagem.
- Público “Todos”, regras de leitura e edição continuam usando os contratos existentes.

## Prévias isoladas

`http://127.0.0.1:61121/ajustes/settings.html` e `http://127.0.0.1:61121/ajustes/notices.html` usam código e CSS locais com dados fictícios. Operações são simuladas, sem banco ou alteração em contas reais.

## Próximos blocos

- Organização dos filtros de Tarefas e revisão dos outros seletores.
- Novo Início apenas em prévia, antes de aplicação.
- Avaliação do limite de arquivos diante das restrições da hospedagem.
- Auditoria do restante do backlog: ajuda por tela/campo, navegação, modais, calendário/lembretes, Turmas, horários e mapa.

