# Comunidade externa e intenção de vínculo

O acesso efetivo de Professor/Servidor pendente é o mesmo de Comunidade externa. Confirmar e-mail ou usar Google não aprova vínculo institucional.

| Área | Acesso externo |
| --- | --- |
| Meu painel | `community.html`, dados da própria conta, sem indicadores institucionais |
| Configurações | `community-settings.html`, página própria de dados, foto, e-mail e gestão da conta; sem controles de publicação em Pessoas |
| Tarefas e lembretes | Somente itens do titular externo; IDs iguais aos de usuários institucionais não compartilham propriedade |
| Avisos e notícias | Publicados para Todos ou Comunidade externa; rascunhos e demais públicos não são liberados |
| Calendário | Eventos públicos na internet, eventos compartilhados com IFPA e contas externas após a 1.1.28, e compromissos da própria agenda; escopo institucional, ocultos, privados alheios e legado sem visibilidade não são liberados |
| Projetos | Aprovados e explicitamente públicos; inscrição depende também de `permite_externos`, situação e vagas |
| Documentos, Pessoas, Turmas e Administração | Indisponíveis na sessão externa |

Ser IFPA não libera nem bloqueia sozinho um evento: é necessária visibilidade pública explícita. A importação e a edição administrativa continuam institucionais. As páginas públicas anônimas não concedem acesso às áreas privadas.

O menu e a busca rápida não oferecem destinos proibidos. URLs institucionais de painel/configurações encaminham a conta externa ao seu próprio painel. APIs verificam a sessão externa e bloqueiam as áreas vedadas antes de executar as rotas; tarefas verificam o titular em lista, detalhe, criação, edição e exclusão. Filtros de avisos, calendários e projetos valem no servidor, independentemente do menu ou de parâmetros enviados pelo navegador.

## Pedidos de Professor e Servidor

A escolha inicial é persistida como intenção, sem mudar o papel efetivo da conta externa. O cadastro abre o pedido correspondente junto da conta pendente e da confirmação. Matrícula/SIAPE e usuário no SIGAA são exigidos; formação é obrigatória para Professor e opcional para Servidor. A administração vê o tipo solicitado e só aprova após conferência e e-mail confirmado.

Comunidade externa comum não recebe um formulário permanente de Professor no painel. Nas Configurações, pode iniciar explicitamente “Solicitar vínculo com o IFPA” para Aluno, Professor ou Servidor. Esse fluxo exige a migração 1.1.29 e não altera intenção original nem acesso efetivo. Edição do perfil e login Google não mudam vínculo. Um pedido pendente de outro tipo impede criar uma segunda solicitação concorrente; o responsável pode reenviar os dados no mesmo pedido.

Na aprovação, a conta recebe somente o tipo conferido do pedido, sem administração ou ingresso automático em turma. O cadastro externo fica preservado como origem bloqueada, ligado à projeção institucional por `conta_vinculos` e `usuarios.id_externo_origem`. Credenciais, Google, perfil, tarefas, preferências, agenda e histórico de lembretes são preservados; IDs de eventos externos convertidos ficam rastreáveis em `agenda_vinculos`. A versão dos lembretes avança para invalidar trabalhos de envio antigos, preservando escolha e consentimento. Sessões e tokens de recuperação anteriores são encerrados. Não há mesclagem por mera coincidência de e-mail/matrícula.

Solicitar vínculo é exclusivo para ingresso ou vínculo real comprovável. A recusa comum mantém a conta externa. Desativar por spam ou falsa declaração comprovada é decisão administrativa distinta: exige justificativa e confirmação, registra auditoria e revoga sessões sem excluir dados. Nenhum bot ou classificação automática desativa a conta por não possuir vínculo.

## Banco e validação

A [migração 1.1.27](../backend/db/migrations/1.1.27.sql) foi aplicada pelo responsável via Workbench, conforme confirmação em 23/10/2026: backup prévio, nenhum erro registrado e versão presente em `arcadia_schema_migrations`. Não reaplicar. O agente não acessou o banco nem conferiu independentemente todos os objetos; veja o [guia do banco](../backend/db/README.md). Projetos antigos ficam restritos até publicação explícita; nenhuma promoção é feita em massa.

Testes usam banco e sessões simulados, incluindo acesso direto e colisão de IDs. A interface usa o shell, tokens, navegação, cabeçalho e estilos do portal, sem servidor de prévia ou conta fictícia real. A validação visual em navegador e o ensaio do SQL real continuam necessários no ambiente de teste autorizado.

Em 24/10/2026, o responsável confirmou também a aplicação das migrações 1.1.28 e 1.1.29 no banco usado pela Vercel. Não reaplicar. Não houve execução nem verificação independente do banco pelo agente.
