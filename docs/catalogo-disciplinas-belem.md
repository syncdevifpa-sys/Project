# Catálogo de disciplinas de Belém

Coleta pública realizada pelo navegador em 15/11/2026, sem login no SIGAA e sem alterar dados.

## Abrangência

57 registros de curso com sede Belém nas listagens públicas: 39 técnicos, 15 de graduação e 3 de mestrado. A listagem lato sensu não apresentou cursos na consulta. Isso descreve o catálogo público encontrado, não garante oferta vigente, matrícula aberta ou todos os programas possíveis do campus.

Após a solicitação de usar apenas os mais recentes, a importação contém 60 matrizes recentes dos 57 cursos: 2.621 registros de componentes e 1.450 nomes distintos. Seleção pelo maior ano de criação disponível na página do curso; empates foram conferidos pela vigência. Física e Matemática mantêm variantes com a mesma vigência mais recente, sem incluir vigências anteriores.

Matrizes antigas foram retiradas do JSON e dos SQL de importação. O levantamento bruto fica somente em output, como material de conferência local. Ser a matriz mais recente publicada não comprova que o curso tenha ingresso ou oferta aberta atualmente.

O JSON backend/catalog/belem-curriculos-sigaa.json preserva curso, nível, ID da matriz, código, fonte, caminho de acesso, componentes, carga horária, período e natureza quando informada. Nos técnicos e mestrados, não se presume obrigatoriedade onde a página não a informa. Uma disciplina pode ter códigos/cargas diferentes conforme a matriz; só o nome reutilizável é consolidado no catálogo global atual do Arcádia.

## Aplicação posterior

1. Revisar os dados e fazer backup.
2. No MySQL atual, aplicar backend/db/pending/subject-catalog-length.sql para aceitar os nomes oficiais completos (até 117 caracteres encontrados; limite preparado de 150).
3. Gerar os arquivos com node tools/import-belem-subjects.cjs.
4. Revisar backend/admin/import-belem-subjects.mysql.sql para MySQL, ou backend/db/postgres/import-belem-subjects.sql para o PostgreSQL preparado localmente.
5. Aplicar somente no banco correspondente e conferir contagem. O importador preserva registros existentes e não cria turmas, ofertas, atribuições, matrículas ou vínculo de alunos.

A importação não foi executada no banco real. A prévia local mostra os nomes oficiais com IDs temporários e tabelas paginadas. O catálogo global continua sem metadados curriculares no banco; a proveniência detalhada está no JSON e deverá integrar o modelo PostgreSQL completo.

Fontes: https://sigaa.ifpa.edu.br/sigaa/public/curso/lista.jsf?nivel=T ; https://sigaa.ifpa.edu.br/sigaa/public/curso/lista.jsf?nivel=G ; https://sigaa.ifpa.edu.br/sigaa/public/curso/lista.jsf?nivel=S ; https://sigaa.ifpa.edu.br/sigaa/link/public/curso/curriculo/23612496
