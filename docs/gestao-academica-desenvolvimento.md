# Gestão de turmas e grade — desenvolvimento

## Entrega e limite de publicação

A migração **1.1.30** foi confirmada pelo responsável em 26/10/2026. Não a reaplicar nem editar seus arquivos/checksum. A **1.1.31 é nova e não foi aplicada pelo agente**. Não enviar esta rodada ao main nem fazer deploy antes da validação em cópia descartável MySQL 8.4 e da aplicação manual autorizada da nova migração. O agente não conectou ao banco real.

Os novos endpoints de catálogo, ingresso, arquivamento/restauração e gestão verificam o registro/checksum 1.1.31 e respondem indisponibilidade antes de qualquer escrita se essa base estiver ausente. Não executam DDL pela aplicação. A grade e a edição de horários continuam usando a estrutura 1.1.30.

## Migração e compatibilidade

1. Ensaiar `backend/db/migrations/1.1.31.sql` numa cópia descartável da base 1.1.30, com backup e interrupção no primeiro erro. A geração offline `node tools/db/build-academic-access.cjs` modifica somente os artefatos da **1.1.31**.
2. Verificar `backend/db/checks/1.1.31.sql`, quantidade de registros e restrições. Ensaiar reexecução após aplicação e recuperação de execução interrompida; DDL MySQL não é uma transação reversível única.
3. Conferir os registros `revisao_legado`: alunos com matrículas em mais de uma turma do mesmo curso não recebem uma transferência ou escolha automática de turma principal. Seus registros existentes são mantidos para revisão humana.
4. Cada oferta legada recebe uma referência própria no catálogo. Não há fusão destrutiva por nomes parecidos. Esses itens aparecem com a indicação legado/ID. Novas ofertas reutilizam um item escolhido; editar o título de uma oferta não renomeia as demais.
5. Vínculo com turma é independente de matrícula em disciplina. No legado não ambíguo, o vínculo é deduzido de matrículas ativas existentes; nenhuma conta ou cargo é aprovado/promovido pela migração. Depois do registro 1.1.31, reexecutar o script valida a estrutura e não repete a adoção.

## Onde encontrar as ações

- **Administração → Turmas e disciplinas**: filtros Ativas/Arquivadas/Todas; histórico, motivo e autor; Arquivar; Restaurar; exclusão definitiva com nome exato. Restaurar a turma não restaura todas as ofertas nem reativa convites cancelados. Restaurar cada oferta desejada é uma decisão explícita. Exclusão definitiva é bloqueada quando há dependências, inclusive inativas; arquivamento é a alternativa apresentada.
- **Administração → Turmas e disciplinas → Catálogo**: manutenção global. Desativar impede seleção em novas ofertas e mantém o histórico/títulos das ofertas atuais.
- **Turmas → Criar disciplina**: selecionar turma existente, item do catálogo, título local, ano/regime/semestre e responsável permitido. Professor cria somente oferta própria; administrador atribui professor ativo.
- **Turmas → Gerenciar → Editar disciplina** (professor da oferta) ou **Editar disciplina e professor** (admin): título local e período. Mudança de período exige confirmação; datas incompatíveis impedem a mudança, sem deslocar aulas/eventos. Aluno não edita esses dados.
- **Turmas → Solicitar entrada em uma turma**: busca por turma/curso sem participantes/telefones. Administração ou representante atual, discente e membro ativo daquela turma, analisa em Pedidos de entrada. Vices não recebem esse poder. Autoaprovação é bloqueada e não há transferência automática entre turmas do mesmo curso.
- **Turmas → Participantes → Incluir membros ativos da turma**: professor responsável/admin inclui os alunos aprovados somente na oferta selecionada. Repetir não duplica matrículas. Entrar na turma não libera todas as disciplinas. Aceitar convite de disciplina exige vínculo de turma já aprovado; convite não substitui a aprovação.
- Sair da turma desativa vínculo e matrículas de suas ofertas, cancela pedidos/convites pendentes e retira a representação/compartilhamento de WhatsApp do representante. Remover aluno de uma disciplina preserva matrícula histórica desativada.

## Grade adotada no Arcádia para Belém

Regra informada pelo responsável, **não uma declaração de horário oficial do IFPA**: seis aulas de 50 minutos e intervalo de 20 minutos após a terceira. Turnos iniciam às 07h, 13h e 19h. Manhã termina 12h20, tarde 18h20 e noite 00h20 do dia seguinte. Cada slot mostra a disciplina, mesmo que a mesma aula ocupe dois ou três slots; a renderização não cria registros/eventos/lembretes adicionais.

A configuração única está em `front/js/campus-timetable.js`, também importada pelo serviço Node. Horários antigos incompatíveis são mantidos e sinalizados. Novos horários devem alinhar aos slots e não podem atravessar intervalos. O fim da última aula noturna é armazenado como **24:20** no TIME existente e exibido como **00:20 (+1 dia)**; a ocorrência pertence ao dia de início e traz data final explícita. Não é necessária coluna nova para essa representação. `TIME_FORMAT` mantém horas acima de 23 conforme a [documentação MySQL](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html#function_time-format).

Sala efetiva: override não vazio da aula, ou sala oficial atual da turma. O fallback nunca é copiado para o override; mudar a sala da turma altera a próxima consulta. Na grade/lista a origem oficial é indicada. A grade compartilhada usa somente disciplinas autorizadas da mesma turma e período; a seleção de uma disciplina sem horário não oculta as aulas das demais autorizadas. Servidor comum permanece no catálogo de turma/sala, sem horários privados, participantes ou contatos; usuário externo continua bloqueado em Turmas.

## Validação

Testes de política, serviço, interfaces em DOM simulado e HTTP com banco simulado. Não equivalem a um ensaio real da migração nem a uma conferência visual em navegador. Fazer revisão final em desktop/mobile, tema claro/escuro, teclado, modais e grade com rolagem horizontal contida antes de publicar.

Validação em 26/10/2026: **450 testes aprovados, sem falhas ou saltos**, com os três PDFs locais de teste; `npm run typecheck` e `npm run build` aprovados. O servidor local entregou `classes.html`, `js/campus-timetable.js`, `js/academic-ui.js` e `academic-management.css` com HTTP 200. A conferência visual em navegador e o ensaio real da migração continuam pendentes.
