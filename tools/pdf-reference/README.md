# Referência local para o leitor JavaScript

Ferramenta pequena para inspecionar palavras, coordenadas, texto e preenchimentos de retângulos. Usa pdfplumber 0.11.9, biblioteca com licença MIT. Não importa PyMuPDF e não é parte do backend, do build ou do runtime Vercel. Não envia PDFs, acessa credenciais, grava eventos ou altera o banco.

Com um Python que tenha a dependência de `requirements.txt` instalada:

```powershell
python -B tools/pdf-reference/inspect_pdf.py 'CAMINHO_DO_PDF' --page 4
python -B tools/pdf-reference/inspect_pdf.py 'CAMINHO_DO_PDF' --page 4 --region 0 0 0.34 0.4
```

A região opcional usa frações da largura/altura da página, entre 0 e 1. A saída JSON vai somente para stdout, com coordenadas em pontos e origem no canto superior esquerdo. No PDF.js, o eixo vertical tem outra convenção; normalize antes de comparar. O hash ajuda a conferir que a referência e o leitor usam exatamente o mesmo arquivo.

A ferramenta não interpreta eventos. Ela permite conferir se um texto pertence ao rodapé ou à descrição, e onde ficam cabeçalhos, colunas e cores, sem depender da saída do parser JavaScript. Limite de 4 MiB e 30 páginas; sem OCR. Não foi validada para documentos arbitrários.

## Licença e dependências

Fonte e licença MIT do pdfplumber: https://github.com/jsvine/pdfplumber e https://github.com/jsvine/pdfplumber/blob/stable/LICENSE.txt. A licença permite uso sem taxa de licença, sujeito à preservação dos avisos aplicáveis; não significa ausência de licença. Nenhum código de terceiros foi copiado ou teve avisos removidos.

A versão consultada declara pdfminer.six, Pillow e pypdfium2 como dependências. As licenças e avisos dessas distribuições permanecem nos pacotes instalados; esta ferramenta não os redistribui nem incorpora binários no site. O ambiente já disponível do Codex foi usado na validação local. Para distribuição futura de um ambiente empacotado, mantenha os respectivos avisos e valide os binários da plataforma.
