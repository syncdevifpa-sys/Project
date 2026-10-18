# Melhorias do leitor JavaScript com apoio da análise Python

O leitor do portal continua em JavaScript/PDF.js. Nenhuma dependência Python, PyMuPDF, chamada externa, credencial ou alteração de banco foi adicionada ao site.

## Mudanças

- Rodapés são delimitados na região da tabela antes da associação dos fragmentos às colunas. Isso impede que um número solto de “Total de dias letivos” vire evento e interrompe a herança de contexto quando a tabela termina.
- Cabeçalhos institucionais são excluídos por linha antes do recorte; fragmentos como “DO PARÁ” não contaminam títulos na página seguinte. Descrições legítimas no corpo, como “Campus Belém”, permanecem.
- O preâmbulo de resoluções deixa de gerar eventos a partir de artigos numerados. Em região sem modalidade reconhecida, apenas datas explícitas podem gerar candidatos; não se inventa mês.
- “Ensino Superior” é reconhecido como Graduação, inclusive na análise das cores. Os três grupos de modalidade continuam independentes.
- Campus é obtido do cabeçalho. Em novas prévias ele entra no token assinado e define o período da importação, sem aceitar substituição pelo formulário de confirmação. Campus não identificado permanece identificado como tal. Tokens anteriores sem esse campo mantêm a compatibilidade de Belém até expirar. Períodos maiores que o limite de 60 caracteres do esquema são recusados antes da gravação.
- Identificação do leitor mudou para colunas-contexto-v4; o cliente exige a versão correspondente. A confirmação visual pede conferir o campus da fonte.

## Evidência

A comparação focal contém 19 casos conferidos nos PDFs originais de Belém 2025, Belém 2026 e Superior 2026 de Conceição do Araguaia. Depois das alterações o JavaScript atende 19/19 (antes 17/19). Os ganhos nesses dois casos são identificação de modalidade; os casos de datas de Belém já eram atendidos. Falso rodapé “dias PÓS-GRADUAÇÃO” e preâmbulo com “Estatuto” deixam de aparecer. Não é uma referência exaustiva de todos os eventos.

Os testes de regressão cobrem os três PDFs, anos, períodos, virada para janeiro/2027, preservação de títulos, continuação de OIKOS, identificação e assinatura do campus, recusa de truncamento, prévia HTTP e gravação simulada. O calendário interativo continua usando os campos existentes. Nenhum evento real foi importado.

O protótipo e o ambiente Python permanecem isolados e não são dependências de execução do portal. As melhorias foram implementadas nas regras próprias de geometria e contexto; não houve incorporação da biblioteca PyMuPDF ao backend.

## Limites

Mantêm-se as restrições a PDF com texto selecionável. Layouts novos ainda podem exigir revisão. Os 19 casos não provam cobertura integral; divergências fora dessa referência continuam a exigir conferência. Não houve validação de contas/banco reais nem demonstração de resolução do erro de runtime anteriormente relatado na Vercel. A presente alteração trata a interpretação e a identificação da fonte.


## Auxiliar Python e limpeza

`tools/pdf-reference/inspect_pdf.py` é uma ferramenta local independente com pdfplumber 0.11.9 (MIT), sem PyMuPDF. Confere texto, palavras, retângulos, cores e hash dos PDFs, com recorte relativo opcional; saída somente no terminal. Requisitos e avisos de licença estão no README da ferramenta. Não é usada pelo backend/build/Vercel.

Foram removidos nove PNG/JSON temporários reproduzíveis de tmp/pdfs e dois scripts antigos de substituição de código (fix-mail-surface.cjs e update-recovery-tests.cjs). A busca não encontrou consumidores de aplicação, testes ou documentação para essas saídas; o inspetor de cores restante pode regenerar calendar-pages.json. As evidências citadas pela auditoria de segurança, utilitários ainda documentados, PDFs originais externos, ambiente isolado e protótipo recente foram preservados. Novos arquivos de tmp passam a ser ignorados pelo Git, sem retirar as evidências já rastreadas. O SQL administrativo alterado pelo usuário não faz parte desta entrega.
