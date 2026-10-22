# Aparência pessoal dos banners

Uma paleta SVG discreta no canto abre um diálogo com os seletores circulares usados nas cores do calendário (`ar-color-fields`, em `content-views.css`). Usa o ícone do catálogo do portal, glifo de 16px e área de clique de 44px, sem círculo branco permanente. Tem nome acessível “Personalizar cores”, tooltip, foco visível, estado expandido, fechamento por Escape e retorno do foco. O diálogo respeita a largura e a altura disponíveis.

Abrange os banners de Início, Meu painel, Calendário, Minhas turmas, Documentos, Avisos e notícias, Pessoas, Projetos, Configurações, Tarefas e detalhe de publicação. Nas Turmas também abrange os banners dinâmicos de cada oferta e da turma/período. No Meu painel, os três cards-resumo (avisos não lidos, tarefas em aberto e documentos em análise) têm preferências independentes entre si e do hero, incluindo título, contagem, descrição e link. Os demais cards, etiquetas de status, capas de conteúdo e blocos explicativos do Início preservam suas cores semânticas.

Cada banner permite Padrão do site, Sem cor ou Personalizado com fundo e texto. A prévia usa contraste mínimo de 4,5:1. Se a combinação escolhida não atingir esse valor, uma mensagem informa o ajuste para preto ou branco antes de salvar. Preferências antigas também passam pela correção de contraste ao serem lidas. Sem cor acompanha os tokens neutros do tema; Padrão remove somente a preferência desse item.

Preferências ficam somente no localStorage deste navegador, separadas por conta institucional ou externa. Não sincronizam entre dispositivos e podem desaparecer ao limpar os dados do navegador. Visitantes sem conta não recebem controles. Nenhuma alteração alcança a identidade compartilhada, permissões ou conteúdo da turma. As chaves de Turmas foram preservadas; as demais usam página e identificador estável do banner, incluindo o ID no detalhe da publicação.

Verificações automatizadas cobrem o cálculo de contraste, correção de cores inválidas e inclusão única do componente nas onze páginas. Não foi iniciado o site, feita validação visual no navegador ou executada qualquer migração nesta etapa.
