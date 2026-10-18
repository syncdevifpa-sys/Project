# Revisão de IHC do calendário — 18/10/2026

## Alterações

A prévia de importação passou a consultar a mesma definição de categorias usada pelo cadastro manual e pela validação do backend. São 17 categorias, incluindo ponto facultativo, avaliações e exames, férias docentes e interrupção de aulas presenciais.

A faixa acima dos campos mostra a categoria que será importada. Texto, faixa, borda do seletor e borda do cartão mudam imediatamente com a seleção, usando a cor personalizada da conta. A cor e a legenda originais do PDF permanecem em “Ver trecho extraído”, identificadas como informação da fonte. Alterar categoria, título ou datas desmarca a revisão da linha, para impedir publicação com uma confirmação anterior à alteração.

A consulta abre no modo mensal. Cabeçalho e barra de visualização ficaram menores. Filtros de categorias, abrangência dos feriados, legenda e ferramentas de exclusão ficam em um painel expansível. O ano para a lista aparece apenas nesse modo; no mensal, o campo “Mês exibido” controla mês e ano. Um filtro de categoria ativo continua indicado no resumo do painel.

As configurações oferecem nome curto, explicação do alcance e seletor de cor para cada categoria. As descrições distinguem feriado de ponto facultativo, férias acadêmicas de férias docentes e interrupção presencial de suspensão geral. As descrições também são associadas aos controles para tecnologias assistivas.

## Referências utilizadas

- Uso de cor com identificação textual, WCAG 1.4.1: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- Retorno imediato das mudanças de estado: https://www.nngroup.com/articles/visibility-system-status/
- Opções secundárias sob demanda: https://www.nngroup.com/articles/progressive-disclosure/

Essas referências orientaram as decisões de interface; esta revisão não foi uma auditoria completa de todos os critérios WCAG.

## Validação

238 testes passaram, sem falhas nem testes ignorados, usando também os três PDFs locais nos testes existentes. O build estático foi executado.

Conferência em navegador local isolado, com dados fictícios e sem gravação no banco:

- 1440 × 960, tema escuro: início da grade em y=427.
- 390 × 844, tema claro: início da grade em y=553.
- 320 × 800, tema escuro: início da grade em y=601.
- Nenhuma rolagem horizontal nessas três larguras; a grade já fica visível na tela inicial.
- Importação do PDF real do IFPA Belém: 17 opções no seletor; mudança de Feriado para Registros acadêmicos altera o retorno de vermelho para roxo sem mudar a evidência do documento. A importação não foi confirmada.
- Configurações: 17 descrições e 17 seletores; uma cor de teste foi personalizada, a página foi recarregada e a amostra no cadastro manual usou a cor persistida. A preferência do navegador isolado foi restaurada ao final.

Evidência local: tmp/security-audit/calendar-ihc-browser.json e tmp/security-audit/calendar-ihc-tests-final.txt. Capturas foram salvas na pasta de visualizações do chat.

## Publicação e banco

Nenhum deploy, push ou alteração no banco externo foi realizado. A migração de categorias está preparada em backend/admin/add-calendar-categories.sql e continua necessária nos bancos ainda não atualizados. Ela preserva os valores anteriores do enum. A alteração local do usuário em backend/admin/import-belem-courses.sql e o protótipo tools/pdf-prototype/ foram preservados.

## Atualização posterior: edição e redução para oito grupos

A pedido do usuário, a interface foi sintetizada em oito grupos: Atividades do Campus, Matrículas, Prazos e registros acadêmicos, Avaliações, Feriados, Pontos facultativos, Férias e recessos, Alterações e cancelamentos. Filtros, criação manual, importação, legenda e configurações usam o catálogo compartilhado front/js/calendar-categories.js.

Os tipos antigos continuam aceitos pelo backend. A apresentação os agrupa sem regravar os dados existentes. Ao editar apenas título ou outros dados de um evento antigo, seu tipo específico é preservado se o grupo não mudou. Descrições mantêm a orientação de conferir o alcance de férias e interrupções no evento.

O botão “Editar eventos” permite buscar registros de qualquer mês por título, data, local ou período. O formulário abre o registro atual e reutiliza a edição autorizada existente, limitada a autor/admin. Feriados automáticos calculados não são tratados como registros editáveis. Campos opcionais vazios deixam de produzir linhas, separadores ou textos de preenchimento na exibição; permanecem disponíveis no formulário.

O detalhe gráfico original do banner foi restaurado sem aumentar sua altura: 80 pixels na largura desktop testada. A grade começa em y=427 no desktop, y=553 em 390 pixels e y=619 em 320 pixels, sem rolagem horizontal.

A prévia local passou a aceitar edição dos eventos fictícios somente em memória. Foi validada a busca, o carregamento dos valores atuais, o salvamento de um evento e a ausência de descrição/local/período/horário vazios na exibição. O registro fictício foi restaurado ao final. Nenhum dado externo foi alterado.

As capturas e o arquivo tmp/security-audit/calendar-ihc-browser.json foram atualizados para oito opções e oito cores. A suíte final desta atualização está em tmp/security-audit/calendar-eight-groups-tests-final.txt.

## Atualização: ocultação, calendário pessoal e banner padrão

O banner voltou ao padrão de Avisos e notícias, incluindo descrição e detalhe gráfico. Na comparação em navegador desktop, ambos mediram 152 pixels de altura, com padding de 24px 24px 32px e título de 48px.

A edição permite ocultar e reexibir registros sem excluí-los. A consulta pública e a rota pública de detalhe não retornam os registros ocultos. Uma rota autenticada de gerenciamento recupera os registros editáveis, incluindo os ocultos, identificados na lista de edição.

Os modos Público e Pessoal possuem listas separadas. Eventos pessoais são acessíveis apenas ao autor, inclusive quando outra conta é administradora. A criação pessoal fica disponível às contas institucionais; a publicação pública continua restrita a docente/servidor/admin. A autoria vem da sessão. Contas discentes não podem converter eventos pessoais em públicos. Eventos pessoais não interferem na deduplicação das importações públicas.

A visibilidade fica no formulário. Ao salvar, a consulta acompanha o modo escolhido. As ferramentas de feriados automáticos não são usadas no modo pessoal. Os feriados automáticos são referências calculadas separadamente dos registros cadastrados.

Compatibilidade: bancos antigos continuam permitindo a consulta pública e edições que mantenham os valores padrão. Ocultação e eventos pessoais retornam uma orientação de atualização quando as colunas ainda não existem. Em migrações parciais, os campos que já existem continuam sendo considerados; não se descartam as informações de ocultação ou de visibilidade.

Migração preparada: backend/admin/add-calendar-visibility.sql. Ela adiciona oculto e visibilidade, mantendo os registros anteriores públicos/visíveis, e atualiza as duas views de consulta para excluir ocultos e pessoais. Nenhuma alteração foi aplicada ao banco externo.

## Atualização: data real de publicação

A demonstração usava a data fixa 15/10/2026 para a notícia. Agora registra o instante de inicialização da demonstração, preservado nas consultas seguintes. No backend, novas publicações usam o relógio do banco; rascunhos recebem a data quando publicados. Editar uma publicação preserva sua data original. A data de realização do evento continua independente da publicação, e o cliente não define o horário de publicação.

Validação final: 250 testes passaram, sem falhas ou testes ignorados, incluindo criação, publicação de rascunho e preservação da data nas edições. Build concluído. A consulta local retornou 18/10/2026 e manteve o mesmo instante em consultas consecutivas. Essa correção não exige mudança no esquema do banco.

Validação: 248 testes passaram, sem falhas ou testes ignorados; os testes focados do editor foram repetidos após o último ajuste de interface. Build concluído. No navegador isolado, foi criado um evento pessoal fictício, confirmada sua ausência na consulta pública, ocultado, localizado no gerenciamento e reexibido. A largura de 390px não apresentou rolagem horizontal. Evidências: tmp/security-audit/calendar-visibility-browser.json e tmp/security-audit/calendar-personal-tests-final.txt.
