// Executado somente dentro da transação de aprovação e com as duas identidades travadas.
async function transfer(c, external, user) {
    await c.execute('INSERT INTO preferencias_notificacao(id_usuario,email_lembretes,consentido_em) SELECT ?,email_lembretes,consentimento_lembretes_em FROM publico_externo WHERE id_externo=?', [user,external]);
    await c.execute('INSERT INTO projeto_inscricoes(id_projeto,id_usuario,status,criado_em) SELECT id_projeto,?,status,criado_em FROM projeto_inscricoes_externas WHERE id_externo=?', [user,external]);
    // A inscrição muda de namespace, mantendo status e data e sem dobrar a contagem de vagas.
    await c.execute('DELETE FROM projeto_inscricoes_externas WHERE id_externo=?', [external]);
    const [events] = await c.execute('SELECT * FROM agenda_externa WHERE id_externo=? ORDER BY id_evento FOR UPDATE', [external]);
    for (const event of events) {
        const [saved] = await c.execute("INSERT INTO calendario(id_usuario,titulo,descricao,categoria,data_evento,data_fim,hora_inicio,hora_fim,local,visibilidade,origem_calendario,criado_em) VALUES (?,?,?,?,?,?,?,?,?,'pessoal','agenda',?)", [user,event.titulo,event.descricao,event.categoria,event.data_evento,event.data_fim,event.hora_inicio,event.hora_fim,event.local,event.criado_em]);
        await c.execute("UPDATE lembretes SET id_evento_externo=NULL,id_evento=?,contexto='calendario',versao=versao+1 WHERE id_externo=? AND id_evento_externo=?", [saved.insertId,external,event.id_evento]);
        await c.execute('INSERT INTO agenda_vinculos(id_evento_externo,id_evento) VALUES (?,?)', [event.id_evento,saved.insertId]);
    }
    await c.execute('UPDATE tarefas SET id_usuario=?,id_externo=NULL WHERE id_externo=?', [user,external]);
    await c.execute('UPDATE lembretes SET id_usuario=?,id_externo=NULL,versao=versao+1 WHERE id_externo=?', [user,external]);
}
module.exports = { transfer };
