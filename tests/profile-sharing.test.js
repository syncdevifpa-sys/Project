const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const sharing = require('../backend/src/services/profile-sharing.service');
after(() => db.end());
const user = { id_usuario: 7, nome: 'Ana', tipo_usuario: 'discente', situacao: 'ativo', email: 'login@private.test', telefone: '99999999', foto: 'data:image/png;base64,private', preferencias: { mostrar_foto: true }, matricula: 'secret', is_admin: 1 };

test('legado e contato vazio não publicam e-mail de login, telefone, foto, matrícula ou preferências', () => {
    for (const value of [undefined, {}, { mostrar_foto: 'true', mostrar_email: '1' }]) {
        const visible = sharing.publicPerson(user, value);
        for (const key of ['email', 'telefone', 'foto', 'matricula', 'preferencias', 'is_admin', 'contato_email']) assert.equal(Object.hasOwn(visible, key), false);
    }
    assert.equal(sharing.publicPerson(user, { mostrar_email: 1 }).contato_email, undefined);
});
test('opt-in e opt-out por campo são independentes e não alteram a própria foto', () => {
    const prefs = { contato_email: 'public@contact.test', contato_handle: '@ana (rede)', contato_telefone: '+5591999999999' };
    for (const key of ['email', 'handle', 'telefone', 'foto']) {
        const visible = sharing.publicPerson(user, { ...prefs, ['mostrar_' + key]: 1 });
        assert.equal(key === 'foto' ? visible.foto : visible['contato_' + key], key === 'foto' ? user.foto : prefs['contato_' + key]);
        for (const other of ['email', 'handle', 'telefone', 'foto'].filter(value => value !== key)) assert.equal(visible[other === 'foto' ? 'foto' : 'contato_' + other], undefined);
    }
    assert.equal(user.foto, 'data:image/png;base64,private');
});
test('validação normaliza telefone, limita dados e impede identidade, privilégios e visibilidade de outra conta', () => {
    assert.deepEqual(sharing.normalize({ contato_email: ' a@b.test ', contato_telefone: '+55 (91) 99999-9999', mostrar_foto: false }), { contato_email: 'a@b.test', contato_telefone: '+5591999999999', mostrar_foto: false });
    assert.deepEqual(sharing.normalize({ contato_email: '', contato_handle: '', contato_telefone: '' }), { contato_email: '', contato_handle: '', contato_telefone: '' });
    for (const value of [{ id_usuario: 8 }, { is_admin: true }, { tipo_usuario: 'servidor' }, { mostrar_email: 'true' }, { contato_email: 'invalid' }, { contato_handle: '<img>' }, { contato_handle: 'x'.repeat(101) }, { contato_telefone: 'javascript:1' }, { contato_telefone: '123' }, { foto: '' }]) assert.throws(() => sharing.normalize(value), { status: 400 });
    assert.throws(() => sharing.normalize({ foto: 'https://example.test' }, true), { status: 400 });
});
test('banco legado mantém diretório privado e informa migração ao tentar salvar; indisponibilidade não é ocultada', async t => {
    t.mock.method(db, 'execute', async () => { throw Object.assign(Error('missing'), { code: 'ER_NO_SUCH_TABLE' }); });
    assert.equal((await sharing.read('users', 7)).disponivel, false);
    assert.equal((await sharing.read('external', 7)).foto, '');
    assert.equal((await sharing.publicPeople([user]))[0].foto, undefined);
    await assert.rejects(sharing.save('users', 7, { mostrar_foto: true }), { status: 409 });
    t.mock.method(db, 'execute', async () => { throw Error('offline'); });
    await assert.rejects(sharing.publicPeople([user]), /offline/);
});
test('persistência parcial preserva flags ausentes; contas desativadas não são exibidas', async t => {
    let row = { id_usuario: 7, mostrar_foto: 1, mostrar_email: 1, contato_email: 'public@contact.test' };
    t.mock.method(db, 'execute', async (sql, params) => {
        if (sql.startsWith('INSERT')) {
            assert.deepEqual(params, [7, false, false]);
            assert.match(sql, /id_usuario, mostrar_email/);
            row.mostrar_email = false; return [{ affectedRows: 1 }];
        }
        return [[row]];
    });
    const result = await sharing.save('users', 7, { mostrar_email: false });
    assert.equal(result.mostrar_foto, true); assert.equal(result.mostrar_email, false);
    const list = await sharing.publicPeople([user, { ...user, id_usuario: 8, situacao: 'bloqueado' }]);
    assert.equal(list.length, 1); assert.equal(list[0].contato_email, undefined); assert.equal(list[0].foto, user.foto);
});
