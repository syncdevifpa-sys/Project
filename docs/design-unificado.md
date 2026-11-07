# Design compartilhado do Arcádia

Base: redesenho do Início e Meu painel enviado por Renzo, incluindo o ajuste de fontes das Configurações (`2404e4a`).

- `frontend/design-system.css` aplica a identidade creme, branco, azul e marinho às páginas existentes, com equivalentes para o tema escuro.
- Texto de interface usa Inter e alternativas do sistema; títulos usam Times New Roman, Times e serif. A antiga fonte Instrument Serif deixa de ser solicitada.
- Banners personalizados e cores de classificação dos eventos continuam com suas próprias regras.
- O novo cabeçalho do Início exibe o emblema transparente ao lado de Arcádia. Os cabeçalhos internos mantêm o emblema existente.
- Login e cadastro passam a compartilhar a identidade, em vez de fixar o antigo tema verde.
- A alteração é de apresentação; não modifica APIs, dados, permissões ou banco.

## Banners e tema escuro

- Branco e azul-marinho aparecem nas Configurações de aparência e no seletor de cada banner, ao lado das cores existentes.
- As cores prontas e o modo Personalizado oferecem “Aplicar degradê suave”. A preferência continua independente por banner e conta neste navegador; desmarcar mantém a cor lisa.
- O segundo tom é calculado localmente com contraste de texto verificado. O formato anterior de preferências continua válido, sem migração nem substituição automática de escolhas.
- O painel recupera o detalhe gráfico decorativo no banner de boas-vindas. Tema escuro separa fundos e textos, corrigindo cabeçalho claro, boas-vindas, filtros, estados vazios e cartões de documentos.
- Texto de interface permanece em Inter/alternativas do sistema; títulos e marca “Arcádia” usam Times New Roman.

Revisão em branch `codex/design-unificado`. Renomear branches ou títulos antigos requer identificar quais nomes o usuário quer corrigir; essa operação não integra a mudança visual.
