// Offline: valida uma base existente antes de registrar a consolidacao. Nao conecta a banco.
const fs = require('node:fs');
const path = require('node:path');
const { helpers, column, index, fk, triggerCheck, checksum } = require('../lib/migration-sql.cjs');
const spec = require('../../backend/db/migrations/1.1.25.json');
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
const assert = (expression, message) => `CALL _arc125_assert(${expression},${quote(message)});`;
const columns = [...spec.columns, ...spec.tables.flatMap(table => table.columns)];
const indexes = [...spec.indexes, ...spec.tables.flatMap(table => table.indexes)];
const foreignKeys = [...spec.foreignKeys, ...spec.tables.flatMap(table => table.foreignKeys),
    { table: 'lembretes', columns: 'id_usuario', ref: 'usuarios', refColumns: 'id_usuario', delete: 'CASCADE' },
    { table: 'lembretes', columns: 'id_evento', ref: 'calendario', refColumns: 'id_evento', delete: 'SET NULL' }];
const output = [
    '-- GERADO por node tools/db/build-adoption.cjs. MySQL 8.4. Banco existente e backup atualizado.',
    '-- Conferir defaultdb. Workbench: parar no primeiro erro; executar tudo na mesma conexao.',
    '-- Cria rotinas auxiliares e a tabela de controle. NAO modifica tabelas/dados do aplicativo.',
    '-- Nao cria gatilhos. Nao substitui a migracao 1.1.26. Nenhum SQL foi testado em servidor pelo gerador.',
    'SELECT DATABASE() AS banco,VERSION() AS versao;', 'SET @arc125_failed=0;', helpers,
    assert("DATABASE()='defaultdb'", 'Este bloco foi preparado para defaultdb.'),
    assert("VERSION() REGEXP '^8[.]4[.]' AND VERSION() NOT LIKE '%MariaDB%'", 'Requer MySQL 8.4.'),
    ...[...new Set([...spec.baseline, ...spec.tables.map(table => table.name)])].map(table =>
        assert(`EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(table)} AND ENGINE='InnoDB' AND TABLE_TYPE='BASE TABLE')`, 'Tabela ausente/incompativel: ' + table)),
    ...columns.flatMap(col => [
        assert(`EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(col.table)} AND COLUMN_NAME=${quote(col.name)})`, 'Coluna ausente: ' + col.table + '.' + col.name),
        // COLUMN_TYPE inclui UNSIGNED; alguns campos do manifesto guardam apenas o tipo-base.
        column({...col, type: /\bUNSIGNED\b/i.test(col.definition) && !/ unsigned$/i.test(col.type) ? col.type+' unsigned' : col.type}, false)
    ]),
    ...indexes.flatMap(idx => [
        assert(`EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${quote(idx.table)} AND INDEX_NAME=${quote(idx.name)})`, 'Indice ausente: ' + idx.name), index(idx, false)
    ]),
    ...foreignKeys.flatMap(key => [
        assert(`EXISTS(SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=${quote(key.table)} AND COLUMN_NAME=${quote(key.columns)} AND REFERENCED_TABLE_NAME=${quote(key.ref)} AND REFERENCED_COLUMN_NAME=${quote(key.refColumns)})`, 'FK ausente: ' + key.table + '.' + key.columns), fk(key, false)
    ]),
    assert("EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND CONSTRAINT_NAME='chk_oferta_semestre' AND CONSTRAINT_TYPE='CHECK')", 'CHECK de semestre ausente.'),
    'CALL _arc125_check(0);',
    assert("NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_disciplinas' AND INDEX_NAME='uq_disciplina_turma')", 'Indice antigo ainda existe.'),
    assert("NOT EXISTS(SELECT 1 FROM academico_turmas GROUP BY LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')) COLLATE utf8mb4_bin HAVING COUNT(*)>1)", 'Ha nomes duplicados de turma.'),
    assert("NOT EXISTS(SELECT 1 FROM academico_turmas WHERE BINARY nome_chave <> BINARY LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')))", 'Ha chaves de turma inconsistentes.'),
    ...spec.triggers.map(trigger => triggerCheck(trigger, true)),
    'CREATE TABLE IF NOT EXISTS arcadia_schema_migrations (versao VARCHAR(32) PRIMARY KEY,checksum CHAR(64) NOT NULL,verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;',
    assert(`NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.25' AND checksum<>${quote(checksum(spec))})`, 'Checksum anterior divergente.'),
    `INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) SELECT '1.1.25',${quote(checksum(spec))} WHERE @arc125_failed=0;`,
    "SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.25';",
    ...['column','index','fk','names','check','assert'].map(name => 'DROP PROCEDURE IF EXISTS _arc125_'+name+';')
];
const outputDir=path.join(__dirname,'../../backend/db/workbench/1.1.25');
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'adopt.sql'),output.join('\n')+'\n');
console.log('Validacao e registro preparados offline. Nenhum SQL executado.');
