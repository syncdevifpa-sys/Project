-- Catálogo com oferta comprovada em Belém em 2026. Fontes: backend/catalog/belem-courses-2026.json.
-- 1. Confira o banco selecionado e a lista real antes de autorizar a etapa de inclusão.
SELECT DATABASE() AS banco_selecionado;
SELECT id_curso, nome, nivel, ativo FROM cursos ORDER BY nome;
-- 2. Mude apenas esta variável para TRUE depois de confirmar que há somente os dois cursos.
SET @arcadia_course_catalog_confirmed = FALSE;
START TRANSACTION;
SELECT id_curso FROM cursos ORDER BY id_curso FOR UPDATE;
SET @arcadia_course_initial_count = (SELECT COUNT(*) FROM cursos);
INSERT INTO cursos (nome, nivel, ativo)
SELECT c.nome, c.nivel, TRUE FROM (
SELECT 'Técnico em Agrimensura (Integrado)' AS nome, 'tecnico' AS nivel, 'Técnico em Agrimensura (Integrado)' AS alias0, 'Técnico em Agrimensura - Integrado' AS alias1, 'Técnico em Agrimensura Integrado ao Ensino Médio' AS alias2
UNION ALL
SELECT 'Técnico em Desenvolvimento de Sistemas (Integrado)', 'tecnico', 'Técnico em Desenvolvimento de Sistemas (Integrado)', 'Técnico em Desenvolvimento de Sistemas - Integrado', 'Técnico em Desenvolvimento de Sistemas Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Design de Interiores (Integrado)', 'tecnico', 'Técnico em Design de Interiores (Integrado)', 'Técnico em Design de Interiores - Integrado', 'Técnico em Design de Interiores Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Edificações (Integrado)', 'tecnico', 'Técnico em Edificações (Integrado)', 'Técnico em Edificações - Integrado', 'Técnico em Edificações Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Eletrônica (Integrado)', 'tecnico', 'Técnico em Eletrônica (Integrado)', 'Técnico em Eletrônica - Integrado', 'Técnico em Eletrônica Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Eletrotécnica (Integrado)', 'tecnico', 'Técnico em Eletrotécnica (Integrado)', 'Técnico em Eletrotécnica - Integrado', 'Técnico em Eletrotécnica Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Estradas (Integrado)', 'tecnico', 'Técnico em Estradas (Integrado)', 'Técnico em Estradas - Integrado', 'Técnico em Estradas Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Eventos (Integrado)', 'tecnico', 'Técnico em Eventos (Integrado)', 'Técnico em Eventos - Integrado', 'Técnico em Eventos Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Mecânica (Integrado)', 'tecnico', 'Técnico em Mecânica (Integrado)', 'Técnico em Mecânica - Integrado', 'Técnico em Mecânica Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Metalurgia (Integrado)', 'tecnico', 'Técnico em Metalurgia (Integrado)', 'Técnico em Metalurgia - Integrado', 'Técnico em Metalurgia Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Mineração (Integrado)', 'tecnico', 'Técnico em Mineração (Integrado)', 'Técnico em Mineração - Integrado', 'Técnico em Mineração Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Química (Integrado)', 'tecnico', 'Técnico em Química (Integrado)', 'Técnico em Química - Integrado', 'Técnico em Química Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Recursos Pesqueiros (Integrado)', 'tecnico', 'Técnico em Recursos Pesqueiros (Integrado)', 'Técnico em Recursos Pesqueiros - Integrado', 'Técnico em Recursos Pesqueiros Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Saneamento (Integrado)', 'tecnico', 'Técnico em Saneamento (Integrado)', 'Técnico em Saneamento - Integrado', 'Técnico em Saneamento Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Telecomunicações (Integrado)', 'tecnico', 'Técnico em Telecomunicações (Integrado)', 'Técnico em Telecomunicações - Integrado', 'Técnico em Telecomunicações Integrado ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Agente Comunitário de Saúde (Subsequente)', 'tecnico', 'Técnico em Agente Comunitário de Saúde (Subsequente)', 'Técnico em Agente Comunitário de Saúde - Subsequente', 'Técnico em Agente Comunitário de Saúde Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Aquicultura (Subsequente)', 'tecnico', 'Técnico em Aquicultura (Subsequente)', 'Técnico em Aquicultura - Subsequente', 'Técnico em Aquicultura Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Edificações (Subsequente)', 'tecnico', 'Técnico em Edificações (Subsequente)', 'Técnico em Edificações - Subsequente', 'Técnico em Edificações Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Eletrônica (Subsequente)', 'tecnico', 'Técnico em Eletrônica (Subsequente)', 'Técnico em Eletrônica - Subsequente', 'Técnico em Eletrônica Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Eletrotécnica (Subsequente)', 'tecnico', 'Técnico em Eletrotécnica (Subsequente)', 'Técnico em Eletrotécnica - Subsequente', 'Técnico em Eletrotécnica Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Eventos (Subsequente)', 'tecnico', 'Técnico em Eventos (Subsequente)', 'Técnico em Eventos - Subsequente', 'Técnico em Eventos Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Geodésia e Cartografia (Subsequente)', 'tecnico', 'Técnico em Geodésia e Cartografia (Subsequente)', 'Técnico em Geodésia e Cartografia - Subsequente', 'Técnico em Geodésia e Cartografia Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Guia de Turismo (Subsequente)', 'tecnico', 'Técnico em Guia de Turismo (Subsequente)', 'Técnico em Guia de Turismo - Subsequente', 'Técnico em Guia de Turismo Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Hospedagem (Subsequente)', 'tecnico', 'Técnico em Hospedagem (Subsequente)', 'Técnico em Hospedagem - Subsequente', 'Técnico em Hospedagem Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Mecânica (Subsequente)', 'tecnico', 'Técnico em Mecânica (Subsequente)', 'Técnico em Mecânica - Subsequente', 'Técnico em Mecânica Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Mineração (Subsequente)', 'tecnico', 'Técnico em Mineração (Subsequente)', 'Técnico em Mineração - Subsequente', 'Técnico em Mineração Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Química (Subsequente)', 'tecnico', 'Técnico em Química (Subsequente)', 'Técnico em Química - Subsequente', 'Técnico em Química Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Saneamento (Subsequente)', 'tecnico', 'Técnico em Saneamento (Subsequente)', 'Técnico em Saneamento - Subsequente', 'Técnico em Saneamento Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Segurança do Trabalho (Subsequente)', 'tecnico', 'Técnico em Segurança do Trabalho (Subsequente)', 'Técnico em Segurança do Trabalho - Subsequente', 'Técnico em Segurança do Trabalho Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Telecomunicações (Subsequente)', 'tecnico', 'Técnico em Telecomunicações (Subsequente)', 'Técnico em Telecomunicações - Subsequente', 'Técnico em Telecomunicações Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Técnico em Vigilância em Saúde (Subsequente)', 'tecnico', 'Técnico em Vigilância em Saúde (Subsequente)', 'Técnico em Vigilância em Saúde - Subsequente', 'Técnico em Vigilância em Saúde Subsequente ao Ensino Médio'
UNION ALL
SELECT 'Bacharelado em Engenharia de Controle e Automação', 'graduacao', 'Bacharelado em Engenharia de Controle e Automação', 'Engenharia de Controle e Automação', 'Engenharia de Controle e Automação (Bacharelado)'
UNION ALL
SELECT 'Bacharelado em Engenharia de Materiais', 'graduacao', 'Bacharelado em Engenharia de Materiais', 'Engenharia de Materiais', 'Engenharia de Materiais (Bacharelado)'
UNION ALL
SELECT 'Bacharelado em Engenharia Elétrica', 'graduacao', 'Bacharelado em Engenharia Elétrica', 'Engenharia Elétrica', 'Engenharia Elétrica (Bacharelado)'
UNION ALL
SELECT 'Licenciatura em Ciências Biológicas', 'graduacao', 'Licenciatura em Ciências Biológicas', 'Ciências Biológicas', 'Ciências Biológicas (Licenciatura)'
UNION ALL
SELECT 'Licenciatura em Geografia', 'graduacao', 'Licenciatura em Geografia', 'Geografia', 'Geografia (Licenciatura)'
UNION ALL
SELECT 'Licenciatura em História', 'graduacao', 'Licenciatura em História', 'História', 'História (Licenciatura)'
UNION ALL
SELECT 'Licenciatura em Letras - Língua Portuguesa', 'graduacao', 'Licenciatura em Letras - Língua Portuguesa', 'Letras - Língua Portuguesa', 'Letras - Língua Portuguesa (Licenciatura)'
UNION ALL
SELECT 'Licenciatura em Matemática', 'graduacao', 'Licenciatura em Matemática', 'Matemática', 'Matemática (Licenciatura)'
UNION ALL
SELECT 'Licenciatura em Pedagogia', 'graduacao', 'Licenciatura em Pedagogia', 'Pedagogia', 'Pedagogia (Licenciatura)'
UNION ALL
SELECT 'Licenciatura em Química', 'graduacao', 'Licenciatura em Química', 'Química', 'Química (Licenciatura)'
UNION ALL
SELECT 'Tecnologia em Análise e Desenvolvimento de Sistemas', 'graduacao', 'Tecnologia em Análise e Desenvolvimento de Sistemas', 'Análise e Desenvolvimento de Sistemas', 'Análise e Desenvolvimento de Sistemas (Tecnologia)'
UNION ALL
SELECT 'Tecnologia em Gestão Hospitalar', 'graduacao', 'Tecnologia em Gestão Hospitalar', 'Gestão Hospitalar', 'Gestão Hospitalar (Tecnologia)'
UNION ALL
SELECT 'Tecnologia em Gestão Pública', 'graduacao', 'Tecnologia em Gestão Pública', 'Gestão Pública', 'Gestão Pública (Tecnologia)'
UNION ALL
SELECT 'Tecnologia em Saneamento Ambiental', 'graduacao', 'Tecnologia em Saneamento Ambiental', 'Saneamento Ambiental', 'Saneamento Ambiental (Tecnologia)'
UNION ALL
SELECT 'Especialização em Linguagens e Artes na Formação Docente', 'pos_graduacao', 'Especialização em Linguagens e Artes na Formação Docente', NULL, NULL
UNION ALL
SELECT 'Especialização em Tecnologia Social em Saneamento, Saúde e Ambiente na Amazônia', 'pos_graduacao', 'Especialização em Tecnologia Social em Saneamento, Saúde e Ambiente na Amazônia', NULL, NULL
UNION ALL
SELECT 'Mestrado Profissional em Engenharia de Materiais', 'pos_graduacao', 'Mestrado Profissional em Engenharia de Materiais', NULL, NULL
) c
WHERE @arcadia_course_catalog_confirmed = TRUE
  AND @arcadia_course_initial_count = 2
  AND NOT EXISTS (SELECT 1 FROM cursos u WHERE u.nome IN (c.alias0, c.alias1, c.alias2));
SELECT ROW_COUNT() AS cursos_incluidos;
SELECT id_curso, nome, nivel, ativo FROM cursos ORDER BY nome;
-- 3. Revise o resultado. Por padrão desfaz; use COMMIT somente ao aprovar a inclusão.
ROLLBACK;
