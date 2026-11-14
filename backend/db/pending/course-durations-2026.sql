-- Opcional: sincroniza somente cursos sem regime E sem etapas configurados.
-- Exige as colunas criadas por 1.1.33-course-stages.sql. Revisar após backup.
-- Não altera a configuração explícita da administração nem a duração de ofertas existentes.
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Agrimensura (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Desenvolvimento de Sistemas (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Design de Interiores (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Edificações (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Eletrônica (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Eletrotécnica (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Estradas (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Eventos (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Mecânica (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Metalurgia (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Mineração (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Química (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Recursos Pesqueiros (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Saneamento (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO126638962103450011752.pdf
UPDATE cursos SET regime_etapas='anual',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Telecomunicações (Integrado)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Agente Comunitário de Saúde (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Aquicultura (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Edificações (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Eletrônica (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=4 WHERE id_curso>0 AND nome='Técnico em Eletrotécnica (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Eventos (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Geodésia e Cartografia (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Guia de Turismo (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Hospedagem (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=4 WHERE id_curso>0 AND nome='Técnico em Mecânica (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=4 WHERE id_curso>0 AND nome='Técnico em Mineração (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Química (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=3 WHERE id_curso>0 AND nome='Técnico em Saneamento (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=4 WHERE id_curso>0 AND nome='Técnico em Segurança do Trabalho (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=4 WHERE id_curso>0 AND nome='Técnico em Telecomunicações (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeofertadevagasRETIFICADO128638962102482321811.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=4 WHERE id_curso>0 AND nome='Técnico em Vigilância em Saúde (Subsequente)' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=10 WHERE id_curso>0 AND nome='Bacharelado em Engenharia de Controle e Automação' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://sigaa.ifpa.edu.br/sigaa/public/curso/portal.jsf?id=30569&lc=en_US
UPDATE cursos SET regime_etapas='semestral',total_etapas=10 WHERE id_curso>0 AND nome='Bacharelado em Engenharia de Materiais' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=10 WHERE id_curso>0 AND nome='Bacharelado em Engenharia Elétrica' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em Ciências Biológicas' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em Geografia' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em História' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em Letras - Língua Portuguesa' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em Matemática' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em Pedagogia' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://ifpa.edu.br/ultimas-noticias/2981-campus-belem-abre-processo-seletivo-com-465-vagas-em-cursos-de-engenharia-licenciatura-e-tecnologia
UPDATE cursos SET regime_etapas='semestral',total_etapas=8 WHERE id_curso>0 AND nome='Licenciatura em Química' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeOfertaRETIFICADO127638962101809261842.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=6 WHERE id_curso>0 AND nome='Tecnologia em Análise e Desenvolvimento de Sistemas' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso4.fundacaocefetminas.org.br/documentos/OrientacoesManifestacaodeInteresseGraduacaoRetificao99638470504506342582.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=6 WHERE id_curso>0 AND nome='Tecnologia em Gestão Hospitalar' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://sigaa.ifpa.edu.br/sigaa/public/curso/portal.jsf?id=30588&lc=en_US
UPDATE cursos SET regime_etapas='semestral',total_etapas=5 WHERE id_curso>0 AND nome='Tecnologia em Gestão Pública' AND regime_etapas IS NULL AND total_etapas IS NULL;
-- https://concurso26.fundacaocefetminas.org.br/documentos/AnexoIQuadrodeOfertaRETIFICADO127638962101809261842.pdf
UPDATE cursos SET regime_etapas='semestral',total_etapas=5 WHERE id_curso>0 AND nome='Tecnologia em Saneamento Ambiental' AND regime_etapas IS NULL AND total_etapas IS NULL;
