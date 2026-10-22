# Revisão de Turmas e acesso da Comunidade externa

## Ofertas e vínculos

A turma é a coorte permanente. Cada `id_disciplina` identifica uma oferta com professor, ano, regime e semestre próprios. Novas ofertas são semestrais por padrão, com opção anual explícita. Legado aparece como período não informado; nenhum semestre é presumido. O semestre letivo não é o período curricular do aluno. A visão consolidada também é filtrada por oferta no servidor.

Sair da turma encerra todas as matrículas ativas do próprio aluno naquela turma e cancela convites pendentes para seu e-mail. Reentrada exige novo convite válido. Sair da disciplina encerra somente a atribuição do próprio professor naquela oferta. Alunos, publicações, materiais e autoria são preservados. As saídas de professor ficam registradas; publicações novas registram seu autor, e autoria desconhecida do legado não é inventada. Privilégios administrativos globais não são revogados por uma saída de disciplina.

O nome da turma é único no sistema, com espaços normalizados e comparação sem distinguir caixa. A aplicação valida criação e renomeação; índice único e triggers protegem outros escritores e conflitos concorrentes. Reutilizar uma turma exige selecionar seu ID. Não há fusão nem exclusão automática de duplicados.

Seletores usam itens de navegação com nome, período e marca de seleção. Seções são botões nativos agrupados com `aria-pressed`, sem `role=tab` artificial. Cores seguem tokens e foco visível. Os banners geral, de uma oferta e da turma/período admitem Padrão, Personalizada ou Sem cor. A preferência é individual por conta e item, salva apenas neste navegador; não altera a turma de outras pessoas nem outras páginas.

## Comunidade externa

Professor pendente permanece externo. O card de solicitação distingue a espera, organiza os campos e mantém o reenvio. Nome, telefone e organização podem ser editados sem alterar e-mail, vínculo ou administração. Depois de mudar o nome, um pedido pendente deve ser atualizado e reenviado para conferência.

- Avisos e notícias seguem o público-alvo no servidor.
- Documentos: somente catálogo e download público elegível, sem pastas pessoais, protocolos ou materiais internos.
- Projetos: `permite_externos` nasce desligado, inclusive no legado. Inscrição exige opção habilitada, projeto aprovado e ativo/em inscrições, conta ativa e vagas disponíveis quando limitadas. Ver o projeto não autoriza ingressar. Inscrições repetidas ou recusadas não são recriadas; canceladas podem ser reenviadas enquanto elegíveis.
- Agenda: eventos comuns públicos e compromissos pessoais da própria conta. O calendário IFPA não é retornado para externo nem visitante, inclusive no detalhe por ID e com filtros manipulados.
- A origem é persistida em `origem_calendario`. Importações gravam `ifpa` no servidor. Legado sem origem confiável fica restrito; não se usam palavras do título para autorizar acesso. Um responsável pode revisar eventos comuns antigos e classificá-los como agenda.
- A aprovação docente transfere participações em projetos e compromissos pessoais para a identidade institucional na mesma transação, antes de substituir a conta externa. Não concede administração.

## Workbench: aplicação manual

Nenhuma migração desta revisão foi executada em banco local ou produção. Não execute `schema.sql` em banco existente. Confira backup recente e `SELECT DATABASE();`. Requer MySQL 8 com CHECK e REGEXP_REPLACE.

Confirme primeiro as migrações iniciais de biblioteca, Turmas e Requisitos. Depois aplique somente as ainda ausentes:

1. `backend/admin/add-external-community-access.sql`: opção de participação, origem e tabelas externas.
2. `backend/admin/add-class-offerings.sql`: regime, semestre e unicidade por oferta, mantendo IDs antigos.
3. `backend/admin/add-class-voluntary-leave.sql`: vínculos ativos/inativos, autoria e registro de saída.
4. `backend/admin/add-unique-class-names.sql`: execute PRIMEIRO apenas o SELECT de diagnóstico. Se retornar linhas, PARE e revise nomes e vínculos com a equipe, sem fundir nem apagar turmas. Somente sem duplicidades execute as alterações, índice e triggers, em janela sem criação ou renomeação de turmas. O índice recusará conflitos remanescentes.

Não repita ALTER TABLE em tabelas já atualizadas: confira colunas, índices e triggers antes de cada script. DDL MySQL pode fazer commit implícito; rollback de aplicação não desfaz DDL. As migrações não apagam registros antigos.

## Validação e limites

Os testes automatizados cobrem serviços e HTTP com banco simulado: identidade atual, origem IFPA, ofertas, saída, perda de acesso, cancelamento de convites, reentrada e conflitos de nome. A revisão visual anterior usou frontend real com dados fictícios isolados, temas claro/escuro e celular, sem overflow horizontal. Após a orientação de não executar localmente, não foi iniciada outra prévia nem executada migração.

Não há MySQL local confirmado nem confirmação das migrações em produção. Constraints, triggers e concorrência real ainda dependem de validação controlada após a aplicação dos SQLs. Isso não comprova deploy, SMTP ou banco real. Nenhum e-mail foi enviado nem conta real alterada nesta revisão.
