# Revisão dos arquivos próprios

A revisão abrange o código-fonte próprio, scripts embutidos em HTML, estilos, testes, ferramentas, documentação, configuração e SQL. Arquivos curtos de responsabilidade única mantêm os nomes e contratos existentes. Comentários de bloco explicam as regras de importação, autorização, transações, privacidade e apresentações.

## Cobertura desta revisão

| Grupo                                 | Arquivos inventariados |
| ------------------------------------- | ---------------------: |
| Raiz e configuração                   |                     13 |
| Backend                               |                     80 |
| Frontend                              |                     70 |
| Testes                                |                     35 |
| Ativos e arquivos gerados preservados |                     34 |
| Ferramentas                           |                      6 |

JavaScript, HTML (inclusive scripts embutidos), CSS, JSON e Markdown foram analisados pelo formatador. A comparação estrutural antes/depois da formatação verifica que o trabalho de indentação não altera operações, literais ou estrutura. As mudanças funcionais de calendário, imagens, apresentações e configurações são deliberadas e têm validação separada.

## Arquivos preservados após inspeção

Os nove arquivos SQL e quatro arquivos de exclusão foram conferidos manualmente. O SQL já separa etapas e conserva literais, transações, gatilhos e regras de autorização; linhas de catálogo representam registros. As migrações são entregues para execução consciente no banco correto, sem execução nesta revisão.

Dependências, imagens, fontes, arquivos binários, metadados locais, segredos, arquivos temporários e dependências travadas ficam fora da reformatação. O diretório público de distribuição é gerado novamente pelo build.

## Convenções

A configuração na raiz define indentação, aspas e limites de linha; contratos públicos existentes permanecem estáveis. Comentários e textos de interface usam português. Código não deve expor detalhes internos no fluxo de uso. Novas regras devem ficar junto da responsabilidade correspondente, evitando comentários repetitivos em cada linha.

Validação final: 165 testes aprovados, nenhum ignorado ou com falha, com os dois PDFs de referência. A geração de distribuição e os onze testes focados finais também passaram. No navegador foram conferidos calendário público, ausência de ações de edição para visitante, tabelas, quadros, cores, enquadramento e configuração em tela móvel. As verificações visuais usam dados fictícios e não gravam no banco real.
