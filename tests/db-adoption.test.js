const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {checksum,triggerCheck}=require('../tools/lib/migration-sql.cjs');
const spec=require('../backend/db/migrations/1.1.25.json');
test('adoção confere objetos existentes sem executar criadores ou corretores do aplicativo',()=>{
    const file='backend/db/workbench/1.1.25/adopt.sql';
    const before=fs.readFileSync(file,'utf8');
    execFileSync(process.execPath,['tools/db/build-adoption.cjs']);
    const sql=fs.readFileSync(file,'utf8');assert.equal(sql,before);
    assert.doesNotMatch(sql,/CREATE TRIGGER|CALL _arc125_names\(/);
    const calls=sql.split('\n').filter(line=>/^CALL _arc125_(column|index|fk)\(/.test(line));
    assert.ok(calls.length>40);
    for(const call of calls)assert.match(call,/'0'\);$/);
    for(const trigger of spec.triggers)assert.ok(sql.includes("TRIGGER_NAME='"+trigger.name+"'"));
    assert.ok(sql.includes(checksum(spec)));
    assert.match(sql,/INSERT IGNORE INTO arcadia_schema_migrations[\s\S]*WHERE @arc125_failed=0/);
    assert.match(sql,/'semestre','semestre TINYINT UNSIGNED NOT NULL DEFAULT 0','tinyint unsigned'/);
    assert.match(sql,/'versao','versao INT UNSIGNED NOT NULL DEFAULT 1','int unsigned'/);
    assert.ok(sql.indexOf("'Trigger ausente ou divergente: tarefa_invalida_lembretes'")<sql.indexOf('INSERT IGNORE INTO arcadia_schema_migrations'));
});

test('validação normaliza delimitadores escapados dos três literais antes do PREPARE, preservando a regra',()=>{
    const sql=fs.readFileSync('backend/db/workbench/1.1.25/adopt.sql','utf8');
    const body=sql.slice(sql.indexOf('CREATE PROCEDURE _arc125_check'),sql.indexOf('DELIMITER ;'));
    for(const value of ['semestral','legado','anual']) {
        const normalization=`SET clause_value=REPLACE(clause_value,CONCAT(CHAR(92),CHAR(39),'${value}',CHAR(92),CHAR(39)),CONCAT(CHAR(39),'${value}',CHAR(39)));`;
        assert.ok(body.includes(normalization));
        assert.ok(body.indexOf(normalization)<body.indexOf('PREPARE arc125_stmt'));
    }
    assert.match(body,/CALL _arc125_assert\(enforced_value='YES'/);
    assert.match(body,/semestre<255/);
    assert.match(body,/@arc125_check_diff=0/);
    assert.doesNotMatch(body,/SET (?:SESSION )?sql_mode/i);
});

test('gatilho de UPDATE único aceita apenas o mesmo corpo com ou sem BEGIN/END',()=>{
    const spec=require('../backend/db/migrations/1.1.26.json');
    for(const trigger of spec.triggers) {
        const sql=triggerCheck(trigger,true);
        const normalized=trigger.body.toLowerCase().replace(/[`\s]/g,'');
        const plain=normalized.slice(5,-4);
        assert.ok(sql.includes("'"+plain+"'"));
        assert.ok(sql.includes("'"+normalized+"'"));
        assert.ok(sql.includes("EVENT_OBJECT_TABLE='"+trigger.table+"'"));
        assert.ok(sql.includes("EVENT_MANIPULATION='"+trigger.event+"'"));
    }
    const compound=triggerCheck({name:'test',table:'test',timing:'AFTER',event:'UPDATE',body:'BEGIN UPDATE a SET x=1; UPDATE b SET x=1; END'},true);
    assert.ok(!compound.includes("'updateasetx=1;updatebsetx=1'"));
});

test('etapa final confere estrutura, titular, gatilhos e versão antes de registrar, sem criadores ativos',()=>{
    const file='backend/db/workbench/1.1.26/03-finalize.sql';
    const before=fs.readFileSync(file,'utf8');
    execFileSync(process.execPath,['tools/db/build-reminder-steps.cjs']);
    const sql=fs.readFileSync(file,'utf8');assert.equal(sql,before);
    assert.doesNotMatch(sql,/CREATE TRIGGER|CALL _arc126_(names|evolve|contexts)\(/);
    const calls=sql.split('\n').filter(line=>/^CALL _arc126_(column|index|fk)\(/.test(line));
    assert.equal(calls.length,15);
    for(const call of calls)assert.match(call,/'0'\);$/);
    assert.ok(sql.includes('chk_lembrete_titular'));
    assert.ok(sql.includes(checksum(require('../backend/db/migrations/1.1.26.json'))));
    assert.match(sql,/INSERT IGNORE INTO arcadia_schema_migrations[\s\S]*WHERE @arc126_failed=0/);
    const structure=fs.readFileSync('backend/db/workbench/1.1.26/01-structure.sql','utf8');
    assert.doesNotMatch(structure,/CREATE TRIGGER|INSERT IGNORE INTO arcadia_schema_migrations/);
});
