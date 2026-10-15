const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const users = require('../backend/src/models/users.model');
const admin = require('../backend/src/services/admin.service');
after(()=>db.end());
test('lista comum e detalhes comuns consultam apenas contas ativas; gestão mantém desativadas',async t=>{
    const queries=[];
    t.mock.method(db,'execute',async(sql,params)=>{queries.push({sql,params});return [[]];});
    await users.listUsers();
    await users.findUserById(43);
    await users.findUserById(43,true);
    await admin.people('users');
    assert.match(queries[0].sql,/WHERE situacao = 'ativo'/);
    assert.match(queries[1].sql,/AND situacao = 'ativo'/);
    assert.doesNotMatch(queries[2].sql,/AND situacao/);
    assert.doesNotMatch(queries[3].sql,/WHERE situacao/);
    assert.deepEqual(queries[1].params,[43]);
});
