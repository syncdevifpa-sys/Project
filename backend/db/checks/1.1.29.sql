-- SOMENTE LEITURA. Não reaplicar migrações já confirmadas.
SELECT DATABASE() AS banco,VERSION() AS versao;
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME IN ('conta_vinculos','agenda_vinculos','vinculo_auditoria') OR
(TABLE_NAME='usuarios' AND COLUMN_NAME='id_externo_origem') OR
(TABLE_NAME='docente_requisitos' AND COLUMN_NAME IN ('tipo_solicitado','origem_solicitacao','curso_informado')));
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao IN ('1.1.27','1.1.28','1.1.29');
SELECT COUNT(*) AS vinculos_inconsistentes FROM conta_vinculos v JOIN usuarios u ON u.id_usuario=v.id_usuario WHERE NOT(u.id_externo_origem <=> v.id_externo);
SELECT COUNT(*) AS origens_sem_vinculo FROM usuarios u LEFT JOIN conta_vinculos v ON v.id_usuario=u.id_usuario AND v.id_externo=u.id_externo_origem WHERE u.id_externo_origem IS NOT NULL AND v.id_usuario IS NULL;
SELECT COUNT(*) AS origens_com_acesso_externo FROM conta_vinculos v JOIN publico_externo e ON e.id_externo=v.id_externo WHERE e.situacao<>'bloqueado';
