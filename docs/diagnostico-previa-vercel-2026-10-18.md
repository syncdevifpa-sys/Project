# Prévia PDF: preparação do runtime na Vercel

O erro público “Não foi possível preparar a prévia.” cobre exceções sem status. Não havia diagnóstico seguro por etapa. A localização das fontes e getDocument eram executados fora do tratamento de erros do leitor; uma exceção nessas operações reproduz essa classe de falha, mas não identifica por si só a causa no ambiente remoto.

## Correção e diagnóstico

Fontes são localizadas a partir do módulo PDF.js incluído explicitamente na função, em vez de depender da resolução do manifesto do pacote. A existência do diretório de fontes é conferida antes de iniciar a tarefa. O includeFiles também passa a incluir o manifesto explicitamente. A inicialização síncrona do documento recebe tratamento próprio.

Falhas de runtime, arquivos e inicialização retornam 503 com códigos PDF_RUNTIME_UNAVAILABLE, PDF_ASSETS_UNAVAILABLE e PDF_INIT_UNAVAILABLE. As etapas de autorização, metadados, leitura e assinatura são marcadas. Falhas inesperadas de assinatura retornam CALENDAR_PREVIEW_SIGN; as demais retornam CALENDAR_PREVIEW_UNAVAILABLE. A primeira consulta de permissão deixa de expor a mensagem bruta do banco.

Os logs registram somente etapa, tipo e código de listas fechadas. Não incluem mensagem bruta, stack, conteúdo do PDF, caminho, token, e-mail ou credenciais. A saída não concede acesso nem altera as regras de autorização/importação.

## Validação e limites

Os testes injetam falha na resolução do módulo usado para localizar fontes, verificando status e ausência de caminhos nos logs. O teste HTTP simula falhas de leitura e assinatura e verifica mensagens e logs sanitizados. Os PDFs originais percorrem os caminhos existentes com persistência simulada. Nenhum PDF foi enviado ao domínio nem houve gravação no banco real nesta revisão.

Não houve acesso aos Runtime Logs privados da Vercel: o controle de navegador estava indisponível nesta sessão. A implantação Linux ainda precisa ser confirmada com uma nova tentativa no Preview; caso falhe, o código público e o diagnóstico sanitizado indicarão a etapa. Sucesso local ou de build não é evidência de resolução remota. Nenhuma promoção desta correção para main foi autorizada.
