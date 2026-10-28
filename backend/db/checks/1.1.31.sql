-- Somente leitura: conferir depois de ensaio/aplicacao manual.
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.31' AND checksum='65b9e91ba1ee9ae3025c3078ee3a8e61e278640c482d384a0f35d154bd0ad326';
SELECT tipo,id_alvo,motivo FROM academico_gestao_historico WHERE acao='revisao_legado';
SELECT id_catalogo,nome FROM academico_catalogo_disciplinas WHERE legado=TRUE;
