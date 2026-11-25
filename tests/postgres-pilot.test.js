const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { citext } = require('@electric-sql/pglite/contrib/citext');
const { createPostgresPilot } = require('../backend/src/database/postgres-pilot');

test('piloto PostgreSQL exige injeção e não seleciona banco por variável de ambiente', () => {
    assert.throws(() => createPostgresPilot(), /explicitamente/);
    assert.throws(() => createPostgresPilot({ query() {} }), /explicitamente/);
});

test('tarefas, arquivamento e reservas Google executam SQL PostgreSQL com isolamento e rollback', async t => {
    const engine = new PGlite({ extensions: { citext } });
    t.after(() => engine.close());
    await engine.exec(fs.readFileSync('backend/db/postgres/schema.sql','utf8'));
    // Somente adaptação do formato de resultado do PGlite; o SQL não é traduzido.
    const wrap = client => ({ query: async (sql,args=[]) => {
        const result = await client.query(sql,args);
        return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    } });
    const database = { ...wrap(engine), transaction: work => engine.transaction(client => work(wrap(client))) };
    const { tasks, archive, workspace } = createPostgresPilot(database);
    await engine.exec(`INSERT INTO usuarios(id_usuario,nome,email,senha,tipo_usuario)
        VALUES(1,'Conta fictícia A','fixture-a@example.test','hash-ficticio','discente'),
        (2,'Conta fictícia B','fixture-b@example.test','hash-ficticio','discente');
        INSERT INTO publico_externo(id_externo,nome,email,senha)
        VALUES(1,'Externo fictício','fixture-external@example.test','hash-ficticio');`);

    let key;
    await t.test('CRUD preserva dono, data, texto literal e campos em edição parcial', async () => {
        const title = "Revisar SQL ? $1 ' OR 1=1 --";
        const created = await tasks.createTask(1,{titulo:title,data_entrega:'2027-02-03'});
        key = created.insertId;
        assert.ok(Number.isInteger(key));
        assert.equal(created.affectedRows,1);
        const found = await tasks.findTaskById(key,1);
        assert.equal(found.titulo,title);
        assert.equal(found.data_entrega,'2027-02-03');
        assert.equal(await tasks.findTaskById(key,2),undefined);
        assert.equal(await tasks.findTaskById(key,{external:1}),undefined);
        assert.equal(await tasks.updateTask(key,2,{titulo:'Alheia'}),null);
        await tasks.updateTask(key,1,{prioridade:'alta',id_usuario:2});
        const edited = await tasks.findTaskById(key,1);
        assert.equal(edited.titulo,title);
        assert.equal(edited.data_entrega,'2027-02-03');
        assert.equal(edited.prioridade,'alta');
        assert.equal(edited.id_usuario,1);
        assert.equal((await tasks.deleteTask(key,2)).affectedRows,0);
        const external = await tasks.createTask({external:1},{titulo:'Somente externo'});
        assert.equal((await tasks.listTasks({external:1})).length,1);
        assert.equal((await tasks.listTasks(1)).length,1);
        assert.equal((await tasks.deleteTask(external.insertId,1)).affectedRows,0);
        assert.equal((await tasks.deleteTask(external.insertId,{external:1})).affectedRows,1);
    });

    await t.test('conclusão invalida lembretes pelo gatilho e reabrir não os reativa', async () => {
        await engine.query(`INSERT INTO lembretes(id_usuario,id_tarefa,titulo,data_lembrete,enviar_email,contexto)
            VALUES(1,$1,'Lembrete fictício',LOCALTIMESTAMP,1,'tarefa')`,[key]);
        await tasks.updateTask(key,1,{status:'concluida'});
        const done = await tasks.findTaskById(key,1);
        assert.ok(done.concluida_em);
        const row = (await engine.query('SELECT ativo,enviar_email,versao FROM lembretes WHERE id_tarefa=$1',[key])).rows[0];
        assert.equal(row.ativo,0);
        assert.equal(row.enviar_email,0);
        assert.equal(Number(row.versao),2);
        await tasks.updateTask(key,1,{observacao:'Concluída'});
        assert.deepEqual((await tasks.findTaskById(key,1)).concluida_em,done.concluida_em);
        await tasks.updateTask(key,1,{status:'aberta'});
        assert.equal((await tasks.findTaskById(key,1)).concluida_em,null);
        assert.equal((await engine.query('SELECT ativo FROM lembretes WHERE id_tarefa=$1',[key])).rows[0].ativo,0);
    });

    await t.test('arquivar preserva tarefa, impede conta alheia e restaurar mantém lembrete desligado', async () => {
        await engine.query('UPDATE lembretes SET ativo=1,enviar_email=1 WHERE id_tarefa=$1',[key]);
        await assert.rejects(archive.set(2,key,true),{status:404});
        await assert.rejects(archive.set({external:1},key,true),{status:404});
        await archive.set(1,key,true);
        const first = (await archive.annotate(await tasks.listTasks(1)))[0];
        assert.ok(first.arquivada_em);
        await archive.set(1,key,true);
        assert.deepEqual((await archive.annotate(await tasks.listTasks(1)))[0].arquivada_em,first.arquivada_em);
        await archive.set(1,key,false);
        assert.equal((await archive.annotate(await tasks.listTasks(1)))[0].arquivada_em,null);
        assert.equal((await engine.query('SELECT ativo FROM lembretes WHERE id_tarefa=$1',[key])).rows[0].ativo,0);
        assert.ok(await tasks.findTaskById(key,1));
    });

    await t.test('falha posterior ao arquivamento reverte também a primeira gravação', async () => {
        await engine.exec(`CREATE FUNCTION fixture_reject_reminder() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'falha de teste'; END $$;
            CREATE TRIGGER fixture_reject BEFORE UPDATE ON lembretes FOR EACH ROW EXECUTE FUNCTION fixture_reject_reminder();`);
        try {
            await assert.rejects(archive.set(1,key,true),/falha de teste/);
            assert.equal((await engine.query('SELECT count(*)::int AS n FROM tarefa_arquivos WHERE id_tarefa=$1',[key])).rows[0].n,0);
        } finally { await engine.exec('DROP TRIGGER fixture_reject ON lembretes; DROP FUNCTION fixture_reject_reminder();'); }
    });

    await t.test('edição inválida desfaz transação sem perder a tarefa', async () => {
        await assert.rejects(tasks.updateTask(key,1,{prioridade:'invalida'}),{code:'23514'});
        assert.equal((await tasks.findTaskById(key,1)).prioridade,'alta');
    });

    await t.test('reservas concorrentes têm um vencedor e conta/sub distintos permanecem isolados', async () => {
        const attempts = await Promise.allSettled([workspace.claim(1,'subject-A'),workspace.claim(1,'subject-A')]);
        assert.equal(attempts.filter(row=>row.status==='fulfilled').length,1);
        assert.equal(attempts.find(row=>row.status==='rejected').reason.status,409);
        const held = attempts.find(row=>row.status==='fulfilled').value;
        await workspace.save(1,'subject-A',{lease:held.lease,calendar_id:'calendar@example.test',tasklist_id:'tasks-1',access_token:'never-store'});
        assert.deepEqual(await workspace.read(1,'subject-A'),{calendar_id:'calendar@example.test',tasklist_id:'tasks-1'});
        assert.equal((await workspace.read({external:1},'subject-A')).calendar_id,null);
        assert.equal((await workspace.read(2,'subject-A')).calendar_id,null);
        assert.equal((await workspace.read(1,'subject-a')).calendar_id,null);
        await assert.rejects(workspace.save(2,'subject-A',{lease:held.lease,calendar_id:'wrong'}),{status:409});
        await workspace.release(1,'subject-A',held.lease);
        const next = await workspace.claim(1,'subject-A');
        assert.notEqual(next.lease,held.lease);
        await workspace.release(1,'subject-A',held.lease);
        await assert.rejects(workspace.claim(1,'subject-A'),{status:409});
        await engine.exec("UPDATE google_export_destinos SET reserva_ate=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 second'");
        await assert.rejects(workspace.save(1,'subject-A',{lease:next.lease,calendar_id:'expired'}),{status:409});
        const recovered = await workspace.claim(1,'subject-A');
        assert.equal(recovered.calendar_id,'calendar@example.test');
        assert.notEqual(recovered.lease,next.lease);
        await assert.rejects(workspace.save(1,'subject-A',{lease:next.lease,calendar_id:'stale'}),{status:409});
        await assert.rejects(workspace.save(1,'subject-A',{lease:recovered.lease,calendar_id:'invalid\nvalue'}),{status:400});
    });
});
