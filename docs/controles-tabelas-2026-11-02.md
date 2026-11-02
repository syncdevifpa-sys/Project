# Controles de coleções e tabelas

Avisos e Tarefas compartilham o espaçamento dos controles: busca próxima de Filtros, ordenação alinhada às visualizações e contagem junto aos resultados. Os filtros ficam recolhidos inicialmente. Tarefas usa a mesma coleção para busca, ordenação e os modos Quadro, Tabela, Lista e Situação.

A tabela compartilhada, usada em Projetos, separa título, situação, revisão quando aplicável, detalhes e ações. Descrições completas continuam disponíveis em um disclosure nativo. A rolagem horizontal fica na região da tabela; os botões originais são restaurados ao retornar ao quadro, preservando seus eventos. A preferência de visualização é guardada localmente, com tolerância a armazenamento indisponível.

## Verificação

- Suíte completa: 535 testes aprovados antes dos ajustes finais de espaçamento e estrutura do contêiner de Tarefas.
- Após esses ajustes: seis testes específicos aprovados, incluindo alternância e restauração de ações, busca, ordenação e atualização conjunta dos modos de Tarefas.
- Prévias estáticas com dados fictícios responderam HTTP 200. Não acessam banco de produção nem enviam e-mail.
- A ferramenta de navegador falhou na inicialização, inclusive após reiniciar a sessão. Não foi possível confirmar visualmente os layouts desktop/mobile nesta execução; as respostas HTTP e os testes não substituem essa inspeção.

Não há alteração de banco, credenciais, SMTP ou configuração de produção nesta unidade.
