# Solicitações de vínculo com o IFPA

O cadastro inicial de Professor/Servidor permanece externo até conferência administrativa. Contas externas comuns também podem escolher explicitamente **Solicitar vínculo com o IFPA**, em Configurações, para ingresso como Aluno, Professor ou Servidor. Não há formulário permanente de Professor no painel de toda conta externa.

Matrícula e usuário no SIGAA são exigidos. Professor informa formação; para Servidor ela é opcional. Aluno informa curso e período letivo/ingresso. Nome e e-mail vêm da própria conta. Não enviar senha do SIGAA: o Arcádia não acessa esse sistema nem comprova vínculo automaticamente; a administração usa seu acesso institucional autorizado para conferir os dados.

A API de mudança explícita é POST /api/teacher-requirements/mine/change. O titular vem da sessão, não do corpo. O pedido não modifica papel, administração ou intenção original. Há um pedido por conta; sua atualização incrementa versão. Tipo diferente com pedido pendente recebe conflito. A conta e o pedido são travados na mesma ordem e a aprovação usa a versão atual.

## Revisão e identidade preservada

A aba administrativa Requisitos mostra o papel solicitado. Aprovar exige administração atual, confirmação de e-mail no banco e conferência expressa. Rejeitar exige justificativa e mantém a conta externa. Conhecer um domínio institucional ou usar Google não concede permissão.

A aprovação é transacional: o cadastro externo permanece como origem imutável e bloqueada, ligado de forma única ao registro institucional por conta_vinculos e usuarios.id_externo_origem. Os dois registros representam a mesma conta em namespaces históricos diferentes, não dois acessos independentes. Não se reutiliza um usuário de mesmo e-mail/matrícula: conflito exige revisão, sem mesclagem automática.

Senha protegida, confirmação, Google, perfil e data de criação são mantidos. Tarefas passam ao titular institucional; agenda pessoal é convertida e rastreada em agenda_vinculos, com os lembretes religados aos novos eventos. Preferências e consentimento de e-mail são copiados; os IDs e o histórico dos lembretes permanecem, com versão incrementada. Inscrições em projeto mantêm status/data e mudam de namespace sem dobrar a contagem de vagas. As sessões externas e recuperações antigas são invalidadas; entrar novamente com o mesmo e-mail e senha ou Google. Não há administração nem turma concedidas automaticamente.

## Desativação por abuso comprovado

Antes do formulário, o aviso informa que a solicitação é exclusiva para ingresso ou vínculo real. Spam ou falsa declaração de vínculo comprovada podem resultar em desativação após análise administrativa. Falta de comprovante e recusa comum não causam bloqueio automático.

A ação administrativa **Desativar por abuso comprovado** é distinta de recusar: exige motivo e confirmação explícita, grava vinculo_auditoria e encerra sessões, preservando dados. O servidor verifica administração e versão do pedido. Não existe desativação automática por domínio, texto ou decisão de bot.

## Banco e limites

A migração 1.1.27 foi confirmada pelo responsável; não reaplicar. As novas etapas 1.1.28 (calendário) e 1.1.29 (mudança de vínculo) estão preparadas, não executadas pelo agente. Consulte backend/db/README.md; faça ensaio MySQL 8.4 descartável, backup e aplicação autorizada nessa ordem antes de usar o código no ambiente real. Nenhum checksum aplicado foi alterado.

Testes com banco simulado verificam titularidade, papéis, conflitos, transação/rollback, revogação e preservação das relações. Não substituem o ensaio SQL nem testes de conta real no Preview; nenhuma mensagem real adicional foi enviada.
