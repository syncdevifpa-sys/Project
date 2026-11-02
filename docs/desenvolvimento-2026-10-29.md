# Desenvolvimento — verificações e preparação do banco

Esta entrega é para a branch `codex/desenvolvimento`. O `main` e o banco real
não foram alterados. Os testes usam bancos simulados, transporte de e-mail em
memória e servidores de teste locais; não comprovam um deploy ou envio real.

Validação final: **514 testes aprovados, zero falhas e zero testes ignorados**,
incluindo os três PDFs reais fornecidos. Verificação de tipos, build, parser dos
59 HTMLs/CSS e checagem de espaços aprovados. Após remover as opções estáticas
antigas de curso, os cinco testes focados de cadastro e vínculo e o build foram
conferidos novamente.

## O que está implementado

- Biblioteca de estudo com Quadro, Tabela e Lista, busca por título, assunto,
  autoria e descrição, filtro por formato e pastas preservadas.
- Capas de PDF renderizam a primeira página. DOCX aceita uma prévia **textual
  aproximada** do início do documento, não uma reprodução da diagramação do Word.
  O arquivo original continua disponível. Imagens recebem miniaturas próprias;
  links não provocam buscas em serviços externos.
- Prévias são geradas em workers limitados, com prazo e concorrência limitada.
  O endpoint reutiliza as permissões do download, inclusive para revisão
  administrativa, e responde com `no-store`. O cliente cancela requisições e
  libera URLs temporárias ao trocar de modo ou conta.
- DOCX é validado como pacote Word, sem executar macros, extrair caminhos no
  disco ou seguir relações externas. O limite continua em 2 MB por arquivo.
- Upload multipart evita colocar descrições Unicode e autoria na URL. O endpoint
  binário antigo permanece compatível. Erros preservam o formulário e o arquivo.
- Autoria declarada da obra fica junto ao título. A conta publicadora fica em
  texto secundário e vem do servidor. Não é inferida pelo conteúdo do PDF,
  orientador ou nome da conta, nem altera permissões.
- O sino abre um painel sobre a página atual. Mostra os lembretes ativos da conta,
  sem inventar notificações não lidas ou confirmar envio por e-mail. Fecha por X,
  Escape, clique fora ou saída do foco. Usa as APIs institucional/externa separadas.
- Revisão administrativa de materiais passou a se chamar **Revisão de publicação**.
  Projetos e atividades da disciplina ficam em Turmas; o envio de trabalhos deve
  usar o canal indicado pelo professor. Não foi implementado um novo sistema de
  entregas, correção ou notas.
- Projetos reutilizam o recorte e a validação de imagens de Avisos. A quantidade
  de vagas foi ocultada no card, preservando o limite interno e as inscrições.
  O filtro de situação usa exatamente as opções de criação/edição.
- O banner do mapa reutiliza os detalhes gráficos do portal sem cobrir os controles.
- Curso e etapa do aluno usam seletores do catálogo do banco. As etapas são anos
  ou semestres conforme a configuração de cada curso; não são o semestre da oferta.
  O servidor valida o ID ativo, o regime e a faixa da etapa antes de salvar.
- A resposta ao solicitante em Requisitos aceita parágrafos, até 1000 caracteres,
  mantém autoria/data da decisão e registra aprovação/recusa na auditoria existente.
- A gestão cadastral permite matrícula, telefone e nome social com validação,
  transação e auditoria. Não libera troca administrativa arbitrária do e-mail,
  confirmação de e-mail ou atribuição direta de vínculo de Professor.
- Recuperação de senha recebe botão **Redefinir senha** no HTML do e-mail e
  mantém alternativa em texto, fragmento com token, expiração, uso único e GET
  sem alteração de senha. Nenhum e-mail real foi enviado nesta verificação.

## SQLs pendentes — não executados

Revisar na base correta, com backup atualizado. Os arquivos não substituem
instalações históricas nem alteram checksums já aplicados:

1. `backend/db/pending/document-authorship.sql`: campo opcional `autor_obra`.
   Sem ele, a biblioteca funciona e o novo campo fica indisponível com explicação.
2. `backend/db/pending/project-cover.sql`: capa opcional em Projetos.
   Sem ele, os projetos existentes continuam listados, mas tentar salvar uma
   imagem informa que a equipe precisa habilitar o recurso.
3. `backend/db/pending/account-audit.sql`: auditoria dos novos campos cadastrais.
   Registra autor, pessoa, campos alterados e data, sem duplicar seus valores.
4. `backend/db/pending/1.1.33-course-stages.sql`: metadados de curso e etapa nos
   pedidos de vínculo. **Depois do SQL**, configurar cada curso na administração:
   regime semestral/anual e quantidade de etapas entre 1 e 20. Nenhuma duração foi
   presumida. Sem essa preparação, novos pedidos de Aluno não podem completar os
   seletores e o servidor recusa dados inventados. Professor/Servidor mantêm os
   respectivos fluxos.

`backend/schema.sql` inclui os campos para instalações novas. Não importar esse
esquema inteiro em uma base existente. Os scripts pendentes não são marcados como
aplicados pelo agente e ainda precisam de verificação no MySQL de destino.

## Limites e trabalhos que permanecem separados

- Nome de exibição e solicitação/aprovação de alteração do nome original ainda
  não foram implementados nesta entrega. Não houve mudança de dados reais ou das
  regras de nome como efeito indireto destes ajustes.
- A revisão mobile mais ampla e a ajuda contextual em todas as telas continuam
  para uma próxima entrega. Não se deve considerar todos os estados reais do
  aplicativo visualmente aprovados a partir dos testes automatizados.
- Não há diagnóstico confirmado de uma conta real demorando a recadastrar. O
  código já distingue exclusão definitiva de desativação e mantém origens de
  contas vinculadas; cadastro consulta ambas as tabelas. O limitador de
  confirmação/cadastro atual não impõe espera por e-mail/IP, mas há cotas globais
  de entrega. Contas desativadas ou origens vinculadas continuam existindo e não
  podem ser tratadas como e-mail livre. Determinar o caso concreto exige retorno
  da API ou consulta administrativa autorizada, sem remover proteções por hipótese.
- A mensagem pública de recuperação continua genérica, conforme a decisão de
  privacidade. Não foi adicionada consulta pública de existência de e-mail.
- A revisão visual usou prévias isoladas com exemplos e componentes reais. Não
  substitui explorar a branch com sessão, banco preparado e dados reais. As
  prévias em `tmp/` não são publicadas nem incluídas no build.
