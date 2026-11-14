# Cadastro, tarefas arquivadas e atividades da turma

O cadastro solicita curso antes da etapa atual. O regime vem da configuração do curso; o cadastro oferece quatro anos ou oito semestres, ampliando o limite para cursos oficialmente mais longos, como engenharias com dez semestres. O limite de cadastro não altera a duração registrada do curso. Um curso sem regime ou duração configurados continua indisponível para escolher etapa. A configuração existente é feita com `regime_etapas` e `total_etapas`, conforme `1.1.33-course-stages.sql`.

Em Turmas, **Atividades** reúne avisos, projetos, atividades, trabalhos, avaliações, eventos e aulas canceladas. Materiais e Horários continuam separados. Registros antigos são exibidos sem conversão ou exclusão. Cancelar uma atividade comunica o cancelamento; não reescreve a grade semanal. Eventos e aulas canceladas exigem data e horário.

O arquivamento de tarefas é pessoal e reversível. Tarefas arquivadas saem da lista ativa, do painel e das opções de novos lembretes. O filtro Arquivadas permite restaurá-las com o mesmo conteúdo e situação. Arquivar desliga lembretes vinculados; restaurar não reativa o envio automaticamente.

## Banco existente

Após conferir o banco selecionado e preservar backup, revisar e executar pelo Workbench:

`backend/db/pending/tasks-archive-class-activities.sql`

O script adiciona uma tabela de arquivamento e uma coluna opcional para o tipo de atividade. Não altera estados de tarefas, datas ou publicações existentes. A execução no banco de produção não foi realizada por este trabalho.

Sem esse SQL, tarefas normais continuam funcionando e o arquivamento informa que precisa ser habilitado. A nova classificação de atividades recusa o salvamento com uma orientação, revertendo a transação, em vez de salvar parcialmente ou perder a categoria.


## Cancelamentos e aulas extras

Cancelamentos feitos em **Horários → Exceções de aula** aparecem automaticamente em Atividades, com disciplina, data, horário e motivo. A leitura usa o registro original, sem copiar uma publicação; restabelecer a aula retira esse aviso na próxima consulta. Horários retirados e ofertas arquivadas não integram essa listagem. A consulta respeita o acesso à disciplina.

Aulas extras podem ser cadastradas em **Atividades → Adicionar atividade → Aula extra**, com data e horário obrigatórios. Não alteram a recorrência semanal. Usam a mesma coluna `tipo_atividade` do SQL já entregue, sem outra migração.
