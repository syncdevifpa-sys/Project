# Revisão de IHC — 4 de novembro de 2026

Escopo: correções da auditoria na branch `codex/desenvolvimento`, mantendo o desenho atual. Não inclui o redesenho proposto do Início, publicação no main, migração de banco, SMTP ou alterações de ambiente.

## Evidências e correções

| Prioridade | Antes, demonstrável no código | Depois |
| --- | --- | --- |
| Alta | `auth.js` permitia novas submissões enquanto a chamada anterior aguardava. | Trava por formulário, texto de processamento, `aria-busy` e restauração do botão em `finally`. Teste com promessa pendente comprova uma chamada. |
| Alta | Erros locais de login/cadastro não tinham papel de anúncio e não recebiam foco. | `role=alert`, foco na mensagem e rolagem apenas até ela após erro; o aviso de rede continua único. |
| Alta | Todas as capas eram escondidas da tecnologia assistiva. | Capas publicadas têm alternativa contextual escapada. Prévia decorativa mantém alternativa vazia; editor orienta transcrição do conteúdo do cartaz. A qualidade do texto das publicações existentes exige revisão editorial. |
| Média | Facebook era apresentado como login disponível, mas abria aviso de indisponibilidade. | Botão removido do login; Google e senha continuam. |
| Média | Drawer e janela podiam manter dois estados de fundo/foco sobrepostos. | Abertura da janela fecha o drawer; mudança de breakpoint libera `inert` e bloqueio do menu, com teste. |
| Média | Painel de filtros só calculava posição ao abrir. | Reposiciona na mudança de tamanho/viewport, preserva valores, fecha ao mover foco para fora e retorna foco sem salto ao concluir. |
| Média | Exclusão de pessoa dependia somente de um clique na confirmação genérica. | Exige digitar o nome para confirmar. Cancelamento de solicitação também pede confirmação. Contagens exatas de impacto não foram inventadas nem consultadas no banco real. |
| Média | Requisitos administrativos eram descritos apenas como Professor. | Texto cobre Aluno, Professor e Servidor, com conferência correspondente ao vínculo. |
| Média | Tablet dependia principalmente de regras móveis/desktop dispersas. | Camada adaptativa comum com faixa 601–1100 px, colunas e contexto por espaço, toque, foco e campos. Mesma página e mesmas permissões. |

## Matriz e limites de evidência

| Verificação | Evidência nesta sessão |
| --- | --- |
| Fluxos de acesso, perda de rede, foco de modais, navegação, filtros e confirmação | Testes executam os controladores com DOM e API isolados; resultado final registrado no commit. |
| Rotação e mudança de breakpoint | Eventos de resize/media exercitados por testes, sem descartar seleção ou deixar fundo inerte. |
| HTTP da prévia e dados de turmas/biblioteca | Prévia local identificada, com fixtures em memória; sem banco ou e-mail reais. |
| 320/390, 768/820/1024 e 1280 px, claro/escuro | Regras implementadas e prévia preparada. Validação visual real **pendente**: tanto CUA quanto a inicialização de `@oai/sky` falharam com erro de criação dos assets do kernel. |
| Teclado virtual, zoom, leitor de tela e toque real | Requer revisão manual no navegador/dispositivo. Não há alegação de aprovação desses cenários por testes de strings ou CSS. |
| Permissões e dados reais de todos os perfis | Permanecem cobertos pelos testes existentes; nenhuma sessão/conta de produção foi usada nesta revisão visual. Fixtures não comprovam autorização real. |

## Prévia para conferência

Execute `node tools/final-ui-preview.cjs 61124` e abra `http://127.0.0.1:61124/ui-preview`. O servidor liga somente em loopback; dados são fictícios, algumas operações são apenas em memória e as demais são recusadas. Não inserir dados pessoais reais. A ferramenta não faz parte do build publicado.

Os links usam páginas reais do portal e permitem escolher perfil simulado e tema. A seleção de perfil é explícita e não constitui autenticação de produção. A prévia não redesenha o Início.

## Revisão manual restante

1. Conferir menu, barras, popovers e rodapé nos seis tamanhos e ao girar o tablet.
2. Percorrer cadastro, confirmação, recuperação e Google por teclado, com rede indisponível e lenta.
3. Conferir quadro/tabela/lista, títulos extensos e vazios em Avisos, Projetos e Biblioteca.
4. Conferir grade semanal de Turmas e agenda/mapa com rolagem local e alternativas de leitura.
5. Conferir exclusão e revisão administrativa somente com fixtures, incluindo confirmação digitada.
6. Revisar cartazes publicados: informações que existam apenas na imagem precisam ser transcritas; alternativa contextual não faz OCR nem corrige o conteúdo retroativamente.

Não é declaração de conformidade WCAG, parecer jurídico ou validação de SMTP/deploy/banco.
