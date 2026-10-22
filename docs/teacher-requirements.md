# Requisitos para Professor

Escolher Professor no cadastro cria uma conta real de Comunidade externa e um pedido de vínculo na mesma transação. Não concede permissões de Professor. O usuário confirma o e-mail pelo fluxo existente e pode entrar com senha ou Google mantendo o acesso externo até a aprovação. O domínio do e-mail não atribui cargo.

O pedido contém nome e e-mail vinculados à própria conta, matrícula/SIAPE, nome de usuário e formação conforme registrados no SIGAA. Esses dados ficam restritos ao próprio solicitante e à administração; não são publicados no perfil. O administrador deve usar seu próprio acesso institucional autorizado ao SIGAA para conferir os dados e o vínculo antes da aprovação. O Arcádia não solicita senha do SIGAA, não acessa esse sistema automaticamente e não considera o simples conhecimento desses dados uma validação de identidade. Nome e e-mail são somente leitura na solicitação; a edição do e-mail continua usando confirmação. O acesso continua por e-mail, não por nome de usuário. O nome de usuário é registrado no pedido; não substitui automaticamente um contato público já configurado.

Na página Minha conta da Comunidade externa, o usuário vê o estado e pode atualizar ou reenviar o pedido. Há uma única solicitação por conta: reenviar incrementa a versão e invalida uma decisão administrativa baseada na versão antiga. A recusa exige justificativa e mantém a conta externa.

Administradores usam a aba **Requisitos** da Administração. Aprovar exige conferir o vínculo, matrícula e formação com a instituição e ter confirmação real do e-mail no banco. Não há aprovação automática por domínio, Google ou edição do perfil. A edição administrativa genérica não permite mudar outro vínculo para Professor; deve usar Requisitos.

## O que acontece ao aprovar

A transação cria a identidade institucional com papel Professor, preservando nome, e-mail, hash de senha, telefone, data de criação, foto, preferências de compartilhamento e confirmação de e-mail. O vínculo Google é transferido. A solicitação guarda o histórico da decisão e o novo usuário. A identidade externa é substituída pela institucional; suas sessões e recuperações de senha antigas são invalidadas. Não são copiados tokens de acesso. O usuário deve entrar novamente com o mesmo e-mail/senha ou Google.

Se houver conflito de matrícula/e-mail, confirmação ausente, versão antiga ou falha em uma etapa, a transação é revertida. A conta não é parcialmente promovida. Contas de Professor já existentes não são rebaixadas pela migração.

## Workbench

Execute **somente** `backend/admin/add-teacher-requirements.sql` no banco correto após backup. Ele cria uma tabela nova, sem promover ninguém. O ambiente também precisa das tabelas existentes de confirmação de e-mail, sessões, recuperação, compartilhamento de perfil e Google. Não execute `backend/schema.sql` em banco existente. Nenhuma migração de produção foi executada pelo agente.

Depois publique/acesse um deployment da branch com o código e valide com duas contas reais: solicitante externo e administrador. Confirme o e-mail, revise um pedido, recuse com motivo, reenvie e aprove. Confira que a sessão externa antiga deixou de funcionar e que uma nova entrada usa Professor. Testes automatizados com banco simulado não validam a conectividade do MySQL/SMTP de produção.
