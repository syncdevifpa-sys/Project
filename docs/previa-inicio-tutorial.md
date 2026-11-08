# Prévia de Início, tutorial e ajustes visuais

Destino: `codex/desenvolvimento`. O main não recebe estas alterações.

- Início com foco em notícias e projetos, navegação superior simplificada e foto do campus.
- Visitantes podem entrar diretamente ou abrir “Mais informações”, que leva ao tutorial completo.
- Para contas conectadas, o tutorial fica em Configurações → Tutorial.
- Guia com apresentação dos recursos, públicos, primeiro acesso, dúvidas, fotos reais do campus e captura da interface com dados demonstrativos.
- Botões principais com degradê claro no tema claro e azul no escuro.
- Menu lateral com subitens recuados, indicação discreta da página atual e rolagem preservada sem a barra visual.
- Painel com semana de sete dias, indicadores neutros e texto branco com contraste nos banners azuis.
- Capa da publicação dentro do banner: paisagens amplas e retratos proporcionais com recorte leve na base e névoa.
- Seletor PT/EN compartilhado para a interface; publicações e dados pessoais mantêm o conteúdo original.
- Abas da biblioteca derivam da cor do banner; cores próprias das áreas pessoais e personalizações são preservadas.

Validação: 591 testes, 581 aprovados, nenhuma falha e 10 ignorados por ausência dos PDFs de teste. Build estático e compilação de tipos concluídos.

O exemplo real do PSU permanece somente no simulador local; nenhum cadastro de produção é criado pelo envio desta branch. A alternativa `?design=hibrido` é exclusiva do servidor local de prévias.

## Correção dos padrões de cor — test 1.93

A paleta do editor passa a usar os mesmos tons dos banners padrão. O degradê pode ser salvo em “Padrão do site”, sem transformar a preferência em uma cor fixa: ele acompanha o destaque geral nas áreas comuns e mantém a cor própria das áreas pessoais. Desmarcar restaura a cor lisa. O marcador lateral acompanha a cor efetiva do banner. Corrigida também a repetição de atualizações ao salvar.

Validação desta correção: 593 testes, 583 aprovados, nenhuma falha e 10 ignorados; build concluído. Conferidos no navegador o salvamento, a recarga, a desativação do degradê e o marcador lateral.
