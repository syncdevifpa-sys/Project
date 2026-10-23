# Comunidade externa e intenção de vínculo

O acesso efetivo de Professor/Servidor pendente é o mesmo de Comunidade externa. Confirmar e-mail ou usar Google não aprova vínculo institucional.

| Área | Acesso externo |
| --- | --- |
| Meu painel | `community.html`, dados da própria conta, sem indicadores institucionais |
| Configurações | `community.html#accountSettings`, dados, foto, privacidade, e-mail e gestão próprios |
| Tarefas e lembretes | Somente itens do titular externo; IDs iguais aos de usuários institucionais não compartilham propriedade |
| Avisos e notícias | Publicados para Todos ou Comunidade externa; rascunhos e demais públicos não são liberados |
| Calendário | Eventos de calendários explicitamente públicos e compromissos da própria agenda; ocultos, privados e legado sem visibilidade não são liberados |
| Projetos | Aprovados e explicitamente públicos; inscrição depende também de `permite_externos`, situação e vagas |
| Documentos, Pessoas, Turmas e Administração | Indisponíveis na sessão externa |

Ser IFPA não libera nem bloqueia sozinho um evento: é necessária visibilidade pública explícita. A importação e a edição administrativa continuam institucionais. As páginas públicas anônimas não concedem acesso às áreas privadas.

O menu e a busca rápida não oferecem destinos proibidos. URLs institucionais de painel/configurações encaminham a conta externa ao seu próprio painel. APIs verificam a sessão externa e bloqueiam as áreas vedadas antes de executar as rotas; tarefas verificam o titular em lista, detalhe, criação, edição e exclusão. Filtros de avisos, calendários e projetos valem no servidor, independentemente do menu ou de parâmetros enviados pelo navegador.

## Pedidos de Professor e Servidor

A escolha inicial é persistida como intenção, sem mudar o papel efetivo da conta externa. O cadastro abre o pedido correspondente junto da conta pendente e da confirmação. Matrícula/SIAPE e usuário no SIGAA são exigidos; formação é obrigatória para Professor e opcional para Servidor. A administração vê o tipo solicitado e só aprova após conferência e e-mail confirmado.

Comunidade externa comum não recebe o acordeão e não pode forjar um POST para criar pedido. Edição do perfil e login Google não alteram intenção. Google exige cadastro prévio com a escolha inicial; vincular a conta Google não cria vínculo institucional. No legado, um pedido próprio já existente permite acompanhar/corrigir o vínculo comprovado; não se infere intenção por domínio, nome ou por toda conta ser externa.

Na aprovação, a nova identidade institucional recebe somente o tipo do pedido. Senha/Google/estado de confirmação são preservados, e sessões antigas são encerradas. Tarefas próprias são transferidas; lembretes transferidos ficam desativados, sem e-mail, para revisão e novo consentimento. Dados anteriores não são apagados para simplesmente esconder áreas.

## Banco e validação

A [migração 1.1.27](../backend/db/migrations/1.1.27.sql) foi aplicada pelo responsável via Workbench, conforme confirmação em 23/10/2026: backup prévio, nenhum erro registrado e versão presente em `arcadia_schema_migrations`. Não reaplicar. O agente não acessou o banco nem conferiu independentemente todos os objetos; veja o [guia do banco](../backend/db/README.md). Projetos antigos ficam restritos até publicação explícita; nenhuma promoção é feita em massa.

Testes usam banco e sessões simulados, incluindo acesso direto e colisão de IDs. A interface usa o shell, tokens, navegação, cabeçalho e estilos do portal, sem servidor de prévia ou conta fictícia real. A validação visual em navegador e o ensaio do SQL real continuam necessários no ambiente de teste autorizado.
