const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transfer } = require('../backend/src/services/account-link-transfer.service');

test('mudança de namespace preserva vínculo dos lembretes ao evento, preferências e histórico sem duplicar vagas', async () => {
    const writes=[];
    const event={id_evento:91,titulo:'Consulta',descricao:'Pessoal',categoria:'evento',data_evento:'2027-02-01',data_fim:null,hora_inicio:'09:00',hora_fim:null,local:null,criado_em:'2026-10-01'};
    await transfer({execute:async(sql,args)=>{
        if(sql.startsWith('SELECT * FROM agenda_externa')) return [[event]];
        writes.push({sql,args});return [{insertId:205}];
    }},5,20);
    const conversion=writes.find(q=>q.sql.startsWith('UPDATE lembretes SET id_evento_externo'));
    assert.deepEqual(conversion.args,[205,5,91]);
    assert.ok(writes.some(q=>q.sql.startsWith('INSERT INTO agenda_vinculos') && q.args[0]===91 && q.args[1]===205));
    const owner=writes.find(q=>q.sql.startsWith('UPDATE lembretes SET id_usuario'));
    assert.deepEqual(owner.args,[20,5]); assert.doesNotMatch(owner.sql,/ativo=|enviar_email=/);
    assert.ok(writes.some(q=>q.sql.startsWith('INSERT INTO preferencias_notificacao') && q.sql.includes('consentimento_lembretes_em')));
    assert.ok(writes.findIndex(q=>q.sql.startsWith('INSERT INTO projeto_inscricoes'))<writes.findIndex(q=>q.sql.startsWith('DELETE FROM projeto_inscricoes_externas')));
    assert.ok(!writes.some(q=>/DELETE FROM (?:agenda_externa|lembretes|tarefas|publico_externo)/.test(q.sql)));
});

test('migração 1.1.29 é reproduzível e aditiva, sem vincular contas ou alterar versões aplicadas', () => {
    const spec=require('../backend/db/migrations/1.1.29.json');
    const sql=require('../tools/lib/account-link-migration.cjs').generate(spec);
    assert.equal(fs.readFileSync('backend/db/migrations/1.1.29.sql','utf8').replace(/\r\n/g,'\n'),sql);
    assert.match(sql,/versao='1.1.28'/);assert.match(sql,/versao='1.1.29'/);
    assert.doesNotMatch(sql,/\b(?:UPDATE usuarios|UPDATE publico_externo|DELETE FROM|TRUNCATE TABLE|INSERT INTO conta_vinculos)\b/i);
    for(const name of ['conta_vinculos','agenda_vinculos','vinculo_auditoria']) assert.ok(spec.tables.some(t=>t.name===name));
});
