const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { generate, checksum } = require('../tools/lib/migration-sql.cjs');
const spec = require('../backend/db/migrations/1.1.25.json');
const root = path.join(__dirname,'..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
function table(sql, name) {
    return sql.match(new RegExp('CREATE TABLE(?: IF NOT EXISTS)? '+name+' \\(([\\s\\S]*?)\\) ENGINE=InnoDB[^;]*;'))?.[1];
}
const compact = (s) => s.replace(/--[^\n]*/g,'').replace(/\s+/g,'').toLowerCase();

test('histórico preserva os 19 originais byte a byte e bundle removido tem substitutos íntegros', () => {
    const dir='backend/db/history/pre-1.1.25/';
    const manifest=JSON.parse(read(dir+'manifest.json'));
    assert.equal(manifest.length,19);
    for(const item of manifest) {
        const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,dir,item.file))).digest('hex');
        assert.equal(hash,item.sha256,item.file);
        assert.ok(!fs.existsSync(path.join(root,'backend/admin',item.file)),item.file);
    }
    const retired=JSON.parse(read(dir+'retired-bundle.json'));
    assert.equal(retired.equivalentSources.length,6);
    for(const source of retired.equivalentSources) assert.ok(manifest.some((m)=>m.file===source));
    assert.ok(!fs.existsSync(path.join(root,retired.removed)));
});

test('esquema novo já contém todo contrato final sem ALTER nem UPDATE em tabelas antigas', () => {
    const schema=read('backend/schema.sql');
    assert.doesNotMatch(schema.replace(/CREATE TRIGGER[\s\S]*?END\$\$/g,''),/^\s*(ALTER TABLE|UPDATE|DELETE|DROP TABLE|TRUNCATE|CREATE TABLE IF NOT EXISTS)\b/m);
    const names=[...schema.matchAll(/^CREATE TABLE (\w+)/gm)].map((m)=>m[1]);
    assert.equal(names.length,new Set(names).size);
    assert.ok(names.includes('inscricoes_editais'));
    assert.ok(names.includes('arcadia_schema_migrations'));
    for(const t of spec.tables) assert.equal(compact(table(schema,t.name)),compact(table(t.sql,t.name)),t.name);
    for(const c of spec.columns) assert.ok(compact(table(schema,c.table)).includes(compact(c.definition)),c.table+'.'+c.name);
    for(const i of spec.indexes) assert.ok(compact(table(schema,i.table)).includes(compact(i.columns)),i.name);
    assert.doesNotMatch(schema,/uq_disciplina_turma/);
    assert.ok(schema.includes(checksum(spec)));
    for(const t of spec.triggers) assert.ok(compact(schema).includes(compact('CREATE TRIGGER '+t.name+' '+t.timing+' '+t.event+' ON '+t.table+' FOR EACH ROW '+t.body)),t.name);
});

test('SQL consolidado é determinístico, guardado e não usa exclusão de dados ou rollback fictício', () => {
    const sql=read('backend/db/migrations/1.1.25.sql');
    assert.equal(sql,generate(spec));
    assert.doesNotMatch(sql,/\b(?:DELETE FROM|TRUNCATE|DROP TABLE|DROP DATABASE|MODIFY COLUMN|FOREIGN_KEY_CHECKS|START TRANSACTION|ROLLBACK)\b/);
    assert.match(sql,/HANDLER FOR SQLEXCEPTION[\s\S]*sql_safe_updates=previous_safe/);
    assert.match(sql,/Checksum divergente/);
    assert.match(sql,/HAVING COUNT\(\*\)>1/);
    assert.match(sql,/CREATE TRIGGER IF NOT EXISTS/);
    assert.match(sql,/INSERT IGNORE INTO arcadia_schema_migrations[\s\S]*WHERE @arc125_failed=0/);
    const newIndex=sql.indexOf("CALL _arc125_index('academico_disciplinas','uq_oferta_turma','id_turma,nome,ano_letivo,regime_letivo,semestre','1','1')");
    assert.ok(newIndex>0 && newIndex<sql.indexOf('DROP INDEX uq_disciplina_turma'));
});

test('colunas e relações históricas da instalação modular permanecem no esquema novo', () => {
    const schema=read('backend/schema.sql');
    for(const file of ['add-classes.sql','add-document-library.sql','add-teacher-requirements.sql','add-notice-applications.sql']) {
        const original=read('backend/db/history/pre-1.1.25/'+file);
        for(const [,name,body] of original.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? (\w+) \(([\s\S]*?)\) ENGINE=InnoDB/g)) {
            const current=table(schema,name); assert.ok(current,name);
            for(const [,column] of body.matchAll(/^\s*(\w+)\s+(?:INT|BIGINT|SMALLINT|TINYINT|VARCHAR|CHAR|ENUM|SET|JSON|DATE|DATETIME|TIMESTAMP|TEXT|MEDIUMTEXT|LONGBLOB)\b/gmi))
                assert.match(current,new RegExp('\\b'+column+'\\s'),name+'.'+column);
            for(const [fk] of body.matchAll(/FOREIGN KEY\s*\([^)]*\)\s*REFERENCES \w+\s*\([^)]*\) ON DELETE (?:RESTRICT|CASCADE|SET NULL)/gi))
                assert.ok(compact(current).includes(compact(fk)),name+' '+fk);
        }
    }
});
