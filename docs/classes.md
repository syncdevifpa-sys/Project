# Turmas e disciplinas

A página `classes.html` usa a sessão real do Arcádia e a API `/api/classes`. A prévia anterior continua separada: seus dados são fictícios e seus arquivos são excluídos do build publicado.

## Como funciona

- Professores criam ofertas de suas disciplinas em uma turma existente ou nova. A turma/coorte é permanente e seu nome é único no sistema após normalização de espaços e caixa. Reutilizar uma turma exige selecionar seu ID. Cada oferta identifica ano, regime e semestre; nomes de disciplina podem se repetir em ofertas distintas.
- O professor acessa suas disciplinas; cada contexto mostra somente os participantes e conteúdos daquela disciplina. Administradores podem criar disciplinas escolhendo um professor ativo, editar o nome e responsável da disciplina, editar nome/turno/campus da turma e administrar participantes, convites e conteúdos. Dados de turma são compartilhados por todas as suas disciplinas; curso e ingresso não são alterados por essa edição.
- A troca de professor preserva as matrículas e publicações, concede acesso ao novo responsável e retira o acesso do anterior, salvo seu privilégio administrativo. Documentos originais continuam pertencendo a seus autores.
- O responsável pode cancelar um convite pendente ou remover o acesso de um aluno à sua disciplina, com confirmação. Isso não exclui a conta nem as matrículas nas outras disciplinas.
- Alunos veem as disciplinas aceitas, agrupadas por turma. O convite não dá acesso às demais disciplinas.
- A opção **Todas as disciplinas** reúne avisos, materiais, projetos e agenda apenas das ofertas aceitas naquela turma e período letivo, com filtro também no servidor. Cada publicação identifica sua disciplina. O professor permanece no contexto de uma oferta, sem essa visão agregada de aluno.
- Convites são endereçados ao e-mail atual da conta, expiram em sete dias e aparecem em Turmas. Não há envio por SMTP nesta entrega. O aluno precisa de uma conta institucional do tipo discente; possuir Gmail não atribui esse papel automaticamente.
- Aceitar não muda a turma de um aluno que já participa de outra turma do mesmo curso. O conflito pede conferência com o professor; não existe transferência automática nesta entrega.
- Avisos, materiais, projetos com prazo e eventos da agenda são privados da disciplina. Professores podem editar e excluir publicações. Agenda permite sinalizar cancelamento. Projetos são orientações: entrega de trabalhos e atribuição de notas não fazem parte desta etapa.
- Materiais aceitam links HTTP/HTTPS ou documentos da biblioteca do próprio autor. Anexar um documento torna-o acessível aos participantes da disciplina sem torná-lo público no catálogo. O formulário avisa sobre esse compartilhamento. A remoção da publicação preserva o documento original; a exclusão do original é impedida enquanto houver anexos em disciplinas.
- Datas de agenda e prazos são horários locais do campus, digitados sem conversão automática de fuso. Criação e atualização usam os horários reais do servidor. Campos opcionais vazios não geram textos de preenchimento na listagem.

## Banco no Workbench

O usuário informou que possui backup do banco de produção e executará os SQLs manualmente. Nenhum script foi executado automaticamente.

1. Abra a conexão de produção usada pela Vercel e selecione o banco correto no painel SCHEMAS. Confira com `SELECT DATABASE();`.
2. Execute `backend/admin/add-document-library.sql` inteiro primeiro.
3. Execute `backend/admin/add-classes.sql` inteiro em seguida. Ele depende da biblioteca para anexos.
4. Atualize o painel de tabelas. Confira a criação de `documento_pastas`, `documento_itens`, `documento_salvos`, `documento_armazenamento`, `academico_turmas`, `academico_disciplinas`, `academico_matriculas`, `academico_convites` e `academico_publicacoes`.
5. Use um deployment da branch que contém a implementação. O banco atualizado não altera sozinho o código do site em produção.

As migrações criam tabelas com `IF NOT EXISTS`, sem limpar registros antigos. Não execute `backend/schema.sql` sobre o banco existente: ele é o esquema de instalação nova. Se uma tabela dessas já existir com estrutura diferente, pare e compare a definição antes de continuar; `IF NOT EXISTS` não atualiza colunas.

Para verificar nomes sem ler dados pessoais:

```sql
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND (TABLE_NAME LIKE 'academico_%' OR TABLE_NAME LIKE 'documento_%')
ORDER BY TABLE_NAME;
```

## Verificação no ambiente

Após aplicar a migração, valide com contas reais distintas: dois professores e um aluno. Crie duas disciplinas na mesma turma, convide o aluno para uma delas e confira que a outra permanece inacessível; aceite o segundo convite e confira o agrupamento. Confira anexos privados e recusa de acesso com outro aluno não matriculado. Os testes automatizados usam banco simulado, não substituem essa verificação no MySQL de produção.

As rotas verificam os papéis atuais no banco, a propriedade da oferta, a matrícula ativa e o e-mail do convite. Não aceitam professor/aluno do corpo da requisição como identidade. Administradores podem trocar o professor da oferta. Não há notificações por e-mail, transferência automática de alunos, exclusão de turma ou diário de notas nesta entrega.

## Atualização de ofertas, saída e nomes únicos

Consulte `docs/turmas-revisao-2026-10-22.md` para as quatro migrações adicionais e o diagnóstico de duplicidade antes da publicação. A saída voluntária encerra vínculos sem apagar publicações ou materiais. Legado não recebe semestre presumido. Cores são preferências pessoais por item e navegador; não alteram a turma compartilhada.
