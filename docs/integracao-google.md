# Google Agenda, Google Tasks e tarefas de Turmas

## O que foi implementado

- Configurações institucionais e externas: Google Agenda e Tasks, autorização por janela Google e desconexão.
- Tarefas: botão individual de envio e seleção de até 25 tarefas por lote. Destinos: Agenda, Tasks ou ambos. Cada operação informa sucesso ou falha; nada é reenviado automaticamente.
- Agenda: agenda secundária Arcádia e eventos de dia inteiro, pois tarefas armazenam data sem horário. Reenvio atualiza eventos identificados como originados da mesma tarefa.
- Tasks: lista Arcádia; tarefas sem data são aceitas. Reenvio procura a referência da tarefa na lista, incluindo itens concluídos, e atualiza a cópia correspondente. Não remova a linha “Origem Arcádia” das notas se quiser preservar essa associação. Cópias duplicadas são sinalizadas para revisão.
- Turmas: em Atividades, “Criar tarefa pessoal” abre o editor com título, descrição, data final (ou inicial), referência da disciplina e link. A pessoa revisa antes de salvar. A atividade não é alterada; atividades canceladas não oferecem esse atalho.

## Ativação

1. Aplicar backend/db/pending/google-workspace.sql no banco existente. Ele cria apenas a tabela dos destinos e amplia tarefas.observacao para TEXT, preservando os dados existentes. No aplicativo, a observação aceita até 5.000 caracteres.
2. Manter GOOGLE_CLIENT_ID e APP_URL configurados na Vercel. APP_URL deve ser o endereço canônico do portal, pois ele identifica a tarefa de origem mesmo quando outra URL de implantação é usada.
3. No mesmo projeto Google Cloud do login, habilitar Google Calendar API e Google Tasks API.
4. Manter os escopos calendar.app.created e tasks na tela de consentimento. Incluir a conta em Usuários de teste enquanto o aplicativo estiver em teste. Cadastrar cada origem real usada em Origens JavaScript autorizadas, incluindo esquema e porta quando local.
5. Publicar a alteração e testar com uma conta escolhida. O modo de autorização por janela não requer uma nova URL de retorno, GOOGLE_CLIENT_SECRET nem uma chave de API no navegador.

## Autorização e dados

A integração usa o modelo de token do Google Identity Services, próprio para ações iniciadas pela pessoa. Tokens de acesso ficam somente na memória da aba, têm validade curta e não são gravados no banco ou no armazenamento local. Uma nova aba pode exigir nova confirmação de conta e permissões. O login do Arcádia continua independente.

O banco guarda apenas os IDs da agenda/lista e uma reserva temporária de envio, vinculados ao titular autenticado do Arcádia e ao identificador da conta Google. Não guarda senhas ou tokens. A reserva evita dois lotes concorrentes da mesma conta.

Para desconectar uma autorização ativa nesta aba, usar Desconectar Google. Para revisar autorizações de outras sessões, usar Gerenciar acesso na Conta Google. Os eventos e tarefas já enviados permanecem no Google.

Enviar copia título, observação, estado e data para a conta Google selecionada. Não há sincronização em segundo plano nem leitura geral das agendas pessoais. O escopo Tasks é amplo, mas a implementação usa somente a lista de destino Arcádia associada à conexão. Excluir uma tarefa no Arcádia não apaga sua cópia Google. Para refletir conclusão/alterações, reenviar a tarefa. Ao selecionar ambos, falhas parciais podem ser reenviadas sem criar outra cópia dos itens já associados.

Conectividade instável pode tornar uma criação incerta: conferir o Google antes de reenviar. Não há promessa de entrega exatamente uma vez entre sistemas externos. As notas de origem e os IDs estáveis dos eventos permitem conferir e evitar repetições nos reenvios normais.

## Validação

Testes automatizados cobrem transformação de datas, atualização sem duplicação no fluxo normal, resultados parciais, proteção de eventos não associados, preenchimento a partir de atividades, isolamento entre titulares, reservas concorrentes e autenticação HTTP. A revisão visual usa Google simulado e não modifica contas reais. Uma autorização e um envio em conta real continuam necessários para confirmar a configuração do projeto Google Cloud.

Referências: https://developers.google.com/identity/oauth2/web/guides/use-token-model ; https://developers.google.com/workspace/calendar/api/auth ; https://developers.google.com/workspace/tasks/auth
