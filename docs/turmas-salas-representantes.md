# Turmas, sala oficial e representantes

Em 26/10/2026, o responsável confirmou a execução da migração **1.1.30 sem problemas** na base usada pela Vercel. Não reaplicar nessa base; não houve execução nem inspeção independente do banco pelo agente. Outras bases exigem ensaio em MySQL 8.4, backup e aplicação autorizada antes da publicação. As migrações 1.1.27/28/29 confirmadas não foram alteradas.

Novos Alunos, Professores e Servidores ficam externos até aprovação em Requisitos. E-mail confirmado ou Google não concedem vínculo. Alunos institucionais legados permanecem ativos, sem rebaixamento em massa.

Servidor sem administração consulta apenas nome, descrição e sala oficial. Materiais, participantes e convites continuam sujeitos à autorização institucional na API. `is_admin` é independente do vínculo.

A sala oficial é opcional. Aluno membro ativo, professor responsável e administrador podem atualizá-la pelo endpoint específico, com confirmação do aviso e versão atual. A transação registra autor, data, valor anterior e novo valor. Não há punição automática por engano. Histórico é restrito à administração e preservado após exclusão de conta.

A escolha do representante ocorre fora do site. Professor responsável/admin registra um aluno ativo da turma. Representante e responsáveis podem identificar até dois vices opcionais, sem duplicações ou poderes adicionais. Saída/desativação de membro impede sua identificação na tela. Só o próprio representante autoriza seu WhatsApp para participantes/responsáveis; vazio revoga consentimento, troca de representante remove o contato anterior e nenhum telefone do perfil é importado. Catálogo de Servidor não recebe nomes/telefones.

Horários semanais pertencem à oferta, com dia, início/fim, vigência e sala opcional da aula. Professor responsável/admin gerencia; aluno participante consulta. API recusa sobreposições da turma/professor e projeta ocorrências em até 93 dias em `America/Belem`, sem criar eventos diários. Sala específica prevalece sobre a oficial. Remover uma recorrência a desativa sem apagar registro. Publicações avulsas permanecem independentes; não inferir cancelamento de aula pelo texto de um aviso. Exceções explícitas permitem cancelar/restabelecer somente uma aula válida da recorrência; a Agenda identifica o cancelamento e as demais ocorrências permanecem.

Sidebar guarda expansão/scroll por conta na aba do navegador, com espaço reservado antes da montagem. A navegação continua entre documentos HTML, não é SPA. Turmas ignora respostas fora de ordem, oferece nova tentativa e revalida acesso ao voltar do BFCache.

One Tap já era desativado intencionalmente com sessão existente. Agora o Arcádia mostra aviso próprio para continuar ao painel. A apresentação nativa ainda depende do Google/navegador; o botão oficial permanece. Não ampliamos escopos.

Banners das áreas de conteúdo em “Padrão do site” usam o destaque das Configurações. Personalizações explícitas e Meu espaço são preservados. Reset remove variáveis locais, sem fixar cor ou apagar preferências de outros elementos.

A promoção administrativa de outra conta institucional é aceita pela API sem trocar vínculo. Proteções de própria conta/último admin e revogação das sessões permanecem. Conta externa não recebe `is_admin`; exige primeiro vínculo aprovado. O teste verifica promoção de outro aluno institucional. Não foi reproduzido bloqueio geral: a mensagem específica do caso real ainda é necessária para diagnosticar uma falha de ambiente/UI.
