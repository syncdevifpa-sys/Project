# Turmas — avaliação de viabilidade

Avaliação do pedido encaminhado pelo Chat de Conversa; não equivale a implementação das permissões novas.

| Pedido | Base existente | Lacuna e implementação prevista |
|---|---|---|
| Hierarquia turma/oferta/disciplina | `frontend/js/classes.js:renderSubjects` já agrupa turma e período | Substituir títulos soltos por detalhes expansíveis e seletor da oferta, mantendo só disciplinas autorizadas e estado ativo. Sem migração. |
| Ícones sugeridos e alterados por admin | Ícones SVG compartilhados em `portal.js`; catálogo e ofertas separados na migração 1.1.31 | Catálogo de chaves permitidas, sugestão local pelo nome e coluna de override vinculada ao catálogo. Não armazenar SVG enviado pelo usuário. Migração nova somente após conferir o esquema alvo. |
| Cabeçalho e gestão por engrenagem | `classes.js` já separa gestão em Turma, Disciplina/professor, vínculo e arquivamento | Reorganização visual aproveita os handlers existentes, com diálogo acessível; preservar confirmações e gestão por perfil. |
| Contribuição de representante e vice | IDs e validação de vínculo em `cohort-info.service.js`; vice atualmente não concede nova permissão | Mudança explícita no backend. Criar autorização estreita para contribuir, sem equiparar a professor/admin, com identificação de autoria e moderação. Revogar ao encerrar vínculo/representação. |
| Pedir nova disciplina com justificativa | Solicitações de ingresso e histórico de gestão já existem | São entidades distintas: nova tabela de pedidos de disciplina, estado, justificativa, versão, decisor e data. Transação e decisão idempotente; não reutilizar pedidos de ingresso. |
| Visão geral e disciplina | `classes.service.js:cohortFeed` já agrega ofertas autorizadas; publicações pertencem à disciplina | Estender conteúdo da turma sem ampliar leitura de disciplinas não autorizadas. Pode exigir relação explícita com turma, preservando os registros existentes. |
| Notificação interna e e-mail | Lembretes e serviços de e-mail existentes | Publicação não é lembrete: registrar evento após confirmação da transação, destinatários por vínculo ativo e preferências, deduplicação e tentativas. Sem envio automático só por ampliar perfil. |

`classes.service.js:scope` permite escrita ao professor ativo atribuído ou admin; `savePost` usa essa verificação. `cohort-info.service.js:vices` informa expressamente que a indicação não concede permissão adicional. Essa regra só deve mudar mediante implementação e testes próprios.

Ordem: hierarquia e cabeçalho; catálogo de ícones; autorização de contribuições e pedidos com trilha de decisão; agregação da turma; notificações. Testar admin, docente atribuído/não atribuído, representante, ambos os vices, aluno comum, vínculo encerrado, conta externa e ausência de autenticação. Não incluir WhatsApp. Inspeção baseada nos arquivos do repositório; Aiven não foi acessado ou alterado.

A pesquisa do Calendário já está publicada na 1.1.45 e integra esta base 1.1.46; não foi refeita nem duplicada.
