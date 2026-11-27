const { test } = require('node:test');
const assert = require('node:assert/strict');
const { config, createDatabase } = require('../backend/src/database/postgres');

test('PostgreSQL exige configuração explícita e TLS validado para destinos remotos', () => {
    assert.throws(() => config({}), /POSTGRES_URL/);
    assert.throws(() => config({POSTGRES_URL:'postgres://user:pass@example.test/db'}), /exigem/);
    assert.throws(() => config({POSTGRES_URL:'postgres://user:pass@example.test/db?sslmode=no-verify',POSTGRES_SSL:'true'}), /parâmetros SSL/);
    assert.equal(config({POSTGRES_URL:'postgres://user:pass@localhost/db'}).ssl,false);
    assert.equal(config({POSTGRES_URL:'postgres://user:pass@example.test/db',POSTGRES_SSL:'true'}).ssl.rejectUnauthorized,true);
});

test('transações PostgreSQL usam o mesmo cliente e liberam após commit ou rollback', async () => {
    const calls=[];
    const client={query:async (sql, values)=>{calls.push([sql,values]);return {rows:[{id:3}]};},release:()=>calls.push(['release'])};
    const db=createDatabase({connect:async()=>client});
    const result=await db.transaction(c=>c.query('INSERT INTO exemplo(nome) VALUES($1) RETURNING id',['Nome']));
    assert.equal(result.rows[0].id,3);
    assert.deepEqual(calls.map(c=>c[0]),['BEGIN','INSERT INTO exemplo(nome) VALUES($1) RETURNING id','COMMIT','release']);
    calls.length=0;
    const expected=Error('falha');
    await assert.rejects(db.transaction(async()=>{throw expected;}), e=>e===expected);
    assert.deepEqual(calls.map(c=>c[0]),['BEGIN','ROLLBACK','release']);
});
