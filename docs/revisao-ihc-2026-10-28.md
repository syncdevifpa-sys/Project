# Revisão de interface — 28/10/2026

## Escopo e evidências

Inventário dos 23 HTMLs e 36 folhas CSS de `front/`. Os 59 arquivos passaram pelo
parser de HTML/CSS. A inspeção estrutural procurou IDs duplicados, imagens sem
`alt`, recursos locais ausentes, controles sem rótulos e tags desbalanceadas.
Após as correções, não foram encontrados esses problemas nos controles visíveis
estáticos. O campo de arquivo oculto de Configurações é acionado por botões
identificados. Isso não equivale a uma certificação de acessibilidade.

As famílias inspecionadas foram:

| Família                 | Páginas                                       | Componentes e estados examinados no código                                                |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Público                 | index, campus-map                             | Navegação, tema, hierarquia, busca, filtros, mapa, fontes e pendências                    |
| Acesso                  | login, signup, verify-email, reset-password   | Rótulos, mensagens, termos, Google, campos e estados indisponíveis                        |
| Institucional           | dashboard, tasks, documents, projects, people | Cabeçalho, perfil, resumos, carregamento, filtros, listas, tabelas, quadros e formulários |
| Publicações e agenda    | notices, notice, calendar                     | Tipos, categorias, cores, filtros, importação, edição, modos e janelas                    |
| Turmas e gestão         | classes, admin                                | Navegação, abas, horários, ajuda, tabelas responsivas, edição e confirmação               |
| Conta                   | settings, community, community-settings       | Preferências, vínculo, segurança, avatar, e-mail e exclusão                               |
| Legal e compatibilidade | terms, privacy, cookies, profile              | Leitura, sumário, rodapé, contato e redirecionamento legado                               |

Foram examinados também os componentes gerados por `portal.js`, `navigation.js`,
`content-views.js`, `dialog-shell.js` e os controladores de página, comunidade,
documentos e turmas. Guardas de acesso e validações do servidor foram preservados.

## Correções desta rodada

- Barras `.ar-nav` usam o tratamento do Início: desfoque de 20px, saturação 1,7,
  borda e sombra discretas; superfícies dos temas substituem cores brancas fixas.
  A barra fica mais sólida depois de rolar. Sem suporte ao desfoque, com redução
  de transparência ou cores forçadas, o fundo é sólido. A sidebar não mudou.
- O avatar recebe dimensões no componente compartilhado do cabeçalho, evitando
  repetir a expansão da imagem observada no mapa.
- Seletores em `.ar-field` recebem a mesma tipografia, espaçamento e superfície
  dos campos; selects e textareas entram no tratamento de foco de teclado.
- Há atalho de teclado “Ir para o conteúdo” nas telas do shell. Ele acompanha
  o título quando a navegação progressiva substitui a região principal.
- Áreas roláveis de tabela e quadro recebem nome e foco para uso pelo teclado.
  Botões ganham alvo mínimo de 44px em dispositivos com ponteiro impreciso.
- Janelas com título existente passam a receber `aria-labelledby` quando não
  têm nome acessível. O editor administrativo também possui referência estática.
- O formulário de vínculo em `community-settings.html` tinha tags sem `<`.
  Sua estrutura de formulário, labels, opções e botão foi restaurada. O teste
  agora verifica tags reais, pois a presença dos nomes em texto não detectava
  essa falha. Nenhum campo nem regra de vínculo foi removido.

Os comportamentos já existentes de cabeçalho fixo nas janelas, backdrop, Escape,
confirmação de alterações não salvas e bloqueio durante gravação foram preservados.
Os testes de banners antes da pintura, horários, cores, navegação persistente e
permissões permanecem aprovados.

## Prévia e limites

- Mapa real: `http://127.0.0.1:61120/campus-map.html`.
- Componentes isolados: `http://127.0.0.1:61121/`, com os CSS reais copiados para
  `tmp/previews/estilo`. É um artefato local, fora do Git e do build, identificado
  como exemplo. Oferece claro/escuro e janela demonstrativa, sem API ou contas.
- Conferência visual: mapa público e componentes representativos, desktop e
  celular. Na prévia móvel dos componentes, largura do documento e conteúdo de
  375px, sem transbordamento horizontal. Os dois temas foram vistos no navegador.
- Não houve revisão visual de todos os estados autenticados nem comparação de
  todos os textos longos com dados reais. Isso continua dependendo de sessão e
  backend disponíveis; não se deve inferir aprovação visual integral da suíte.
- A navegação progressiva permanece limitada a Mapa, Publicações, Projetos e
  Meu painel. Formulários, Turmas e outras telas mantêm navegação completa até
  terem seu ciclo de vida adaptado; ampliar isso exige trabalho funcional próprio.
- A localização de setores ainda marcados como “a confirmar” no mapa continua
  pendente de conferência física, não é uma falha de CSS.

Validação: 500 testes aprovados, sem falhas ou testes ignorados, incluindo os três
PDFs de calendário; verificação de tipos, build e checagem de espaços aprovados.
Nenhum banco, e-mail, ambiente de produção ou configuração secreta foi alterado.
