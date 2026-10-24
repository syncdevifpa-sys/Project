const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generate } = require('../tools/lib/external-access-migration.cjs');
const { checksum } = require('../tools/lib/migration-sql.cjs');
const spec = require('../backend/db/migrations/1.1.27.json');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

test('migração 1.1.27 é reproduzível, exige a base correta e não promove contas nem apaga dados', () => {
    const sql = generate(spec);
    assert.equal(read('backend/db/migrations/1.1.27.sql'), sql);
    assert.ok(sql.includes(checksum(require('../backend/db/migrations/1.1.26.json'))));
    assert.ok(sql.includes(checksum(spec)));
    assert.match(sql, /versao='1\.1\.26'/);
    assert.match(sql, /WHERE @arc127_failed=0/);
    assert.doesNotMatch(sql, /\b(?:DELETE\s+FROM|TRUNCATE\s+TABLE|UPDATE\s+(?:usuarios|publico_externo|projetos))\b/i);
    assert.equal(spec.columns.find(c => c.name === 'visibilidade').default, 'privado');
    assert.equal(spec.columns.find(c => c.name === 'intencao_cadastro').default, 'externo');
});

test('tarefas da 1.1.27 preservam titular institucional e exigem titular único antes do registro', () => {
    const sql = generate(spec);
    const validation = sql.indexOf('CALL _arc127_external_tasks();');
    assert.ok(validation > 0);
    assert.ok(sql.indexOf('INSERT IGNORE INTO arcadia_schema_migrations') > validation);
    assert.match(sql, /CHECK \(\(id_usuario IS NULL\) <> \(id_externo IS NULL\)\)/);
    assert.match(sql, /FK institucional de tarefas ausente/);
    const schema = read('backend/schema.sql');
    assert.match(schema, /chk_tarefa_titular/);
    assert.ok(schema.includes(checksum(spec)));
    assert.deepEqual(spec.foreignKeys[0], {
        table: 'tarefas', columns: 'id_externo', ref: 'publico_externo',
        refColumns: 'id_externo', delete: 'CASCADE'
    });
});

test('pacote de implantação mantém fontes e configuração necessários à compilação TypeScript', () => {
    const ignored = read('.vercelignore').split('\n').map(s => s.trim());
    for (const source of ['tools/typed', 'tools/typed/migration-checksum.ts', 'tsconfig.tools.json']) {
        assert.equal(ignored.includes(source), false, source + ' não pode ser excluído do build');
    }
    const config = JSON.parse(read('vercel.json'));
    assert.equal(config.installCommand, 'npm ci --include=dev');
    assert.equal(JSON.parse(read('package.json')).scripts.prebuild, 'npm run typebuild');
});
