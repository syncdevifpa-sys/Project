const { helpers,column,index,fk,checksum } = require('./migration-sql.cjs');
function generate(spec) {
    const base=checksum(require('../../backend/db/migrations/1.1.28.json'));
    const out=['-- Gerado offline. MySQL 8.4. Backup, mesma conexao e parar no primeiro erro.\n-- Nao promove nem vincula contas existentes em massa. Requer 1.1.28.\nSET @arc125_failed=0;',helpers,
    `CALL _arc125_assert(VERSION() REGEXP '^8[.]4[.]' AND EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.28' AND checksum='${base}'),'Requer MySQL 8.4 e base 1.1.28.');`,
    `CALL _arc125_assert(NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.29' AND checksum<>'${checksum(spec)}'),'Checksum 1.1.29 divergente.');`,
    ...spec.columns.map(c=>column(c,false)),...spec.columns.map(c=>column(c,true)),...spec.indexes.map(i=>index(i,true))];
    out.push(`DELIMITER $$
DROP PROCEDURE IF EXISTS _arc125_requested_role$$
CREATE PROCEDURE _arc125_requested_role()
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_default TEXT; DECLARE actual_null VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc125_failed=1; RESIGNAL; END;
 CALL _arc125_assert(@arc125_failed=0,'Verificacao anterior falhou.');
 SELECT COLUMN_TYPE,COLUMN_DEFAULT,IS_NULLABLE INTO actual_type,actual_default,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='docente_requisitos' AND COLUMN_NAME='tipo_solicitado';
 CALL _arc125_assert(actual_null='NO' AND actual_default='docente','Default ou nulidade do tipo de pedido divergente.');
 IF actual_type='enum(''docente'',''servidor'')' THEN
  ALTER TABLE docente_requisitos MODIFY COLUMN tipo_solicitado ENUM('docente','servidor','discente') NOT NULL DEFAULT 'docente';
 ELSE CALL _arc125_assert(actual_type='enum(''docente'',''servidor'',''discente'')','Tipo de pedido divergente.'); END IF;
END$$
DELIMITER ;
CALL _arc125_requested_role();`);
    for(const table of spec.tables) {
        out.push("CALL _arc125_assert(@arc125_failed=0,'Verificacao anterior falhou.');",table.sql);
        out.push(`CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table.name}' AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE'),'Tabela precisa ser InnoDB: ${table.name}');`);
        for(const c of table.columns) out.push(`CALL _arc125_assert(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table.name}' AND COLUMN_NAME='${c.name}'),'Tabela parcial: ${table.name}.${c.name}');`,column(c,false));
        out.push(...table.indexes.map(i=>index(i,true)),...table.foreignKeys.map(i=>fk(i,true)));
    }
    out.push(`INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.29','${checksum(spec)}' WHERE @arc125_failed=0;`,
        "SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.29';",
        ...['requested_role','column','index','fk','names','check','assert'].map(name=>'DROP PROCEDURE IF EXISTS _arc125_'+name+';'));
    return out.join('\n').replaceAll('arc125','arc129')+'\n';
}
module.exports={generate};
