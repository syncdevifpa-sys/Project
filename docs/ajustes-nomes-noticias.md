# Nome e apresentação das pessoas

O nome completo continua sendo o nome do cadastro. O portal apresenta somente o primeiro nome no cabeçalho e no perfil; a aba Pessoas apresenta o nome completo. O apelido ou nome de exibição independente foi retirado da interface e da API de edição.

A pessoa pode solicitar uma correção do nome completo em **Configurações → Correção de nome**. A administração analisa o pedido; até a aprovação, o nome cadastrado permanece o mesmo. A decisão registra autoria, data e motivo. Os pedidos acompanham a conta ao aprovar um vínculo institucional.

Não há remoção automática dos dados legados no banco. O script `backend/db/pending/account-names.sql` prepara somente os pedidos de correção para instalações ainda sem essa estrutura. `backend/admin/check-account-names.sql` confere as dez colunas da tabela de pedidos sem listar dados pessoais. Esses scripts não são executados pela interface nem durante o build.

# Avisos e notícias

A lista usa filtros recolhidos, busca, ordenação real e os modos Quadro, Tabela, Lista e Situação. As regras de publicação e de público-alvo continuam sendo validadas pelo servidor.
