# Biblioteca de documentos

A aba Documentos organiza materiais de aula em duas áreas: **Meus documentos**, privada para cada conta institucional, e **Materiais públicos**, disponível às contas institucionais autenticadas. Professores e administradores podem publicar materiais; o padrão de criação permanece privado e o formulário exige selecionar a visibilidade conscientemente. A publicação apresenta a autoria. Usuários externos e visitantes não têm acesso a esta entrega.

As solicitações acadêmicas anteriores permanecem em **Solicitações acadêmicas e protocolos**, com as mesmas rotas e registros. Nenhum dado antigo é convertido ou excluído pela migração.

## Habilitação

Revise `backend/admin/add-document-library.sql` e aplique o arquivo inteiro no banco correto após backup. Não execute `schema.sql` sobre uma base existente. A migração cria tabelas novas com `IF NOT EXISTS` e insere a chave de controle com `INSERT IGNORE`; não publica conteúdo nem altera contas. Nenhuma migração foi aplicada automaticamente ao banco local ou à Aiven nesta implementação.

O código usa o MySQL existente, sem novo provedor pago e sem gravar arquivos no disco temporário da Vercel. O uso do banco consome a capacidade já contratada; os limites não significam que o plano seja ilimitado ou que toda a capacidade esteja livre. A cota total inicial de arquivos da biblioteca é 200 MB, conservadora em relação a um banco de 1 GB, que também precisa guardar as demais tabelas e índices. Aumentar a cota exige avaliar o espaço real disponível e as condições do provedor.

## Limites

- Arquivos: PDF, PNG e JPEG de até 2 MB, com extensão e assinatura verificadas no servidor. Downloads são anexos, nunca execução embutida na página. Não há suporte a Office, ZIP ou HTML nesta entrega, nem alegação de análise antivírus.
- Espaço: 20 MB por usuário e 200 MB no total da biblioteca. A transação serializa operações por proprietário e verifica a cota global após obter um mutex, com leitura atual bloqueada para evitar soma desatualizada entre uploads concorrentes.
- Até 500 itens e 100 pastas por usuário. Links não consomem a cota de bytes dos arquivos, mas contam como itens.
- Pastas em um nível, sem árvore ou compartilhamento de pastas. É possível renomear e mover itens. A exclusão de pasta ocupada é recusada; nenhuma cascata de conteúdo é executada ao excluir uma pasta.
- Links HTTP/HTTPS sem credenciais embutidas. O servidor não baixa o destino. A privacidade do destino depende do serviço externo, não da biblioteca do Arcádia.

## Autorização e contratos

Todas as rotas `/api/document-library` exigem uma sessão institucional ativa. O proprietário vem da sessão, nunca do formulário. A permissão de publicar é conferida no banco dentro da transação, com o papel e o privilégio administrativo atuais. O catálogo público filtra autores ativos com publicação permitida e não expõe pastas privadas, blobs, e-mail, senha ou contatos. Uma pessoa que perder a permissão pode tornar seu material privado; a listagem pública deixa de exibi-lo enquanto o autor não for elegível.

Um material privado pode ser baixado pelo dono. A exceção é um material enviado explicitamente para avaliação: administradores podem acessar esse envio enquanto estiver pendente. Não há acesso administrativo geral à biblioteca privada. Exclusões e edições exigem propriedade, inclusive para administradores. Downloads incluem `Content-Disposition: attachment`, `application/octet-stream`, `nosniff`, `no-store` e política de sandbox.

## Salvar materiais e solicitar publicação

Salvar um material público cria uma referência na biblioteca pessoal, com pasta própria, sem duplicar o arquivo ou consumir novamente a cota de bytes. A referência conta no limite de 500 itens. Se o original for excluído, ficar privado ou perder a elegibilidade, a referência aparece como indisponível, sem revelar seus metadados privados. Remover a referência não exclui o original.

Alunos podem enviar um documento privado para avaliação, após confirmar que a administração poderá lê-lo e publicá-lo. O envio continua privado até a aprovação. Só administradores podem decidir: a aprovação publica mantendo a autoria original; a recusa mantém o material privado e exige motivo. Materiais aprovados de alunos podem aparecer no catálogo enquanto o autor estiver ativo.

Editar o documento encerra a avaliação anterior e incrementa sua versão. Para alunos, um material aprovado deve voltar a privado ao ser editado, exigindo novo envio para publicação. A decisão administrativa exige a versão exibida na fila; decisões sobre versões antigas são recusadas para evitar publicar conteúdo diferente do revisado.

Rotas adicionais:

- `POST /public/:id/save`: salva referência em uma pasta pessoal.
- `PUT /saved/:id`, `DELETE /saved/:id`: move ou remove somente a própria referência.
- `POST /items/:id/submit`: envia o próprio documento privado para avaliação.
- `GET /reviews`: fila de avaliação, exclusiva da administração, sem blobs.
- `GET /reviews/:id/download`: anexo de um envio pendente para avaliação administrativa.
- `POST /items/:id/review`: decisão com `decisao`, `versao` e `motivo` obrigatório na recusa.

## Rotas principais

- `GET /`: lista a biblioteca privada e os limites, sem retornar os blobs.
- `GET /public`: catálogo de materiais publicados, sem exigir acesso a pastas pessoais.
- `POST /folders`, `PUT /folders/:id`, `DELETE /folders/:id`: criação, renomeação e remoção de pasta vazia.
- `POST /links`: cria um documento por endereço.
- `POST /files`: recebe corpo binário `application/octet-stream`, com título, pasta, descrição, visibilidade e nome do arquivo na query. O corpo é limitado a 2 MB, abaixo do limite de payload típico da Vercel; limites adicionais do banco ou da plataforma podem ser inferiores e precisam ser observados no ambiente utilizado.
- `PUT /items/:id`, `DELETE /items/:id`: edição de metadados, movimentação e exclusão consciente do próprio item.
- `GET /items/:id/download`: valida autorização antes de ler o arquivo e entregá-lo como anexo.

Se as tabelas não existirem, as rotas informam indisponibilidade e orientam habilitar a biblioteca. Falhas nunca são apresentadas como salvamento concluído. O formulário de edição de arquivo altera metadados e pasta; substituir o conteúdo exige adicionar outro item.
