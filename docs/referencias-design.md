# Referências de design e funcionalidades

Estas são as plataformas usadas como inspiração para o portal da Arcádia, que atende os alunos do ensino médio/técnico e os professores do IFPA Campus Belém. A ideia é ter um site de informação que chame atenção e faça a pessoa voltar. Não precisa ser bonito como uma landing page, mas tem que ser rápido de entender e ter funcionalidades que realmente funcionam.

Evitamos copiar portais acadêmicos brasileiros tradicionais (SIGAA e parecidos) por causa da UI datada. A ideia é usar o **padrão de uso** das referências, e não a identidade visual delas: nada de logo, nome ou layout idêntico.

## 1. Portais escolares (base do painel)

| Referência | O que aproveitar | Onde usar na Arcádia |
|---|---|---|
| **Canvas LMS** | Lista "A fazer" com prazo e disciplina, cards coloridos por disciplina e o cartão "próximo compromisso" | Meu painel, Tarefas, Turmas |
| **Google Classroom** | Fluxo simples entre o mural da turma e as atividades, e a separação entre o que é "pendente" e o que é "concluído" | Turmas, Tarefas |
| **Toddle** | Visão do professor por turma, com calendário e planejamento juntos | Turmas (visão do docente) |
| **Schoology** | Atualizações da turma em formato de feed, com anexos | Turmas, Avisos |

## 2. Pique CRM (organizar pessoas, tarefas e documentos)

| Referência | O que aproveitar | Onde usar na Arcádia |
|---|---|---|
| **Attio** | Perfis de pessoa com tudo relacionado num lugar só (turmas, documentos, contato), além de filtros e visões salvas | Pessoas, Admin |
| **Linear** | Status claros (aberta, em andamento, concluída), prioridade com cor, busca/comandos por **Ctrl+K** e atalhos | Tarefas, busca global |
| **Notion** | Documentos organizados em páginas, busca rápida e templates | Documentos, Biblioteca |

## 3. Engajamento (motivos para voltar)

| Referência | O que aproveitar | Onde usar na Arcádia |
|---|---|---|
| **Duolingo** | Sequência (streak), meta da semana e comemoração ao zerar as pendências | Meu painel |
| **Khan Academy / Brilliant** | Barra de progresso por disciplina/unidade e um "continue de onde parou" | Meu painel, Turmas |
| **Handshake** | Oportunidades (estágio, bolsa, edital) em cards com filtro por curso | Avisos/notícias, futura área de oportunidades |
| **Discord / Ed Discussion** | Dúvidas por disciplina com resposta marcada como "resolvida" | Comunidade |

## 4. Avisos e calendário

| Referência | O que aproveitar | Onde usar na Arcádia |
|---|---|---|
| **Slack** | Bolinha de "não lido", contador e o botão "Marcar tudo como lido" | Avisos, Meu painel |
| **Notion Calendar / Google Agenda** | Cores por categoria de evento, visão da semana e eventos com hora e local | Calendário, "Próximas datas" |

## 5. Brasileiras com boa UI

| Referência | O que aproveitar | Onde usar na Arcádia |
|---|---|---|
| **Me Salva!** | Linguagem próxima do aluno e progresso por conteúdo | Textos do portal, Meu painel |
| **Descomplica** | Organização por trilha/cronograma de estudos | Tarefas, Calendário |

## O que já foi aplicado no Meu painel (`front/dashboard.html`)

| Bloco do painel | Referência | Arquivo/trecho |
|---|---|---|
| Saudação com o resumo do dia (compromissos, entregas, atrasos, avisos novos) | Canvas / Classroom | `renderGreeting()` em `front/js/dashboard.js` |
| Cartão "Agora / próximo compromisso" com contagem regressiva | Canvas | `renderNow()` |
| Lista "A fazer" com filtros (Todas, Atrasadas, Próximos 7 dias), concluir com um clique e "Desfazer" | Canvas + Linear | `renderTasks()`, `complete()` |
| Busca global com Ctrl+K | Linear / Notion | botão `.db-search[data-search-trigger]` (usa a paleta do `portal.js`) |
| Sequência de entregas no prazo, progresso da semana e o estado vazio "Zerou tudo por aqui!" | Duolingo / Khan | `streaks()`, `renderProgress()` |
| Avisos com bolinha de não lido, a pill "Urgente" e "Marcar como lidos" | Slack | `renderNotices()`, `readAll()` |
| "Próximas datas" com a cor da categoria do calendário | Notion Calendar / Google Agenda | `renderDates()` e as cores `--event-*` em `front/dashboard.css` |
| Cards de disciplina coloridos | Canvas | `renderClasses()` |

## Ideias ainda não aplicadas

- **Tarefas:** visão em quadro (aberta → em andamento → concluída), atalhos de teclado e prioridade com cor, no estilo do Linear.
- **Pessoas/Admin:** perfil único com as turmas, documentos e histórico da pessoa, além de filtros salvos, no estilo do Attio.
- **Turmas:** progresso por disciplina e mural da turma, no estilo de Khan e Classroom.
- **Comunidade:** dúvidas por disciplina com resposta "resolvida", no estilo do Ed Discussion.
- **Avisos:** área de oportunidades (estágio, bolsa, edital) com filtro por curso, no estilo do Handshake.
- **Calendário:** visão da semana com hora e local, no estilo do Google Agenda.

> Observação: hoje o banco não tem horário de aulas nem frequência, então blocos como "próxima aula" e "faltas" dependem dessas tabelas existirem.
