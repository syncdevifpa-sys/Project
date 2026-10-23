const db = require('../config/database');
const { validateContent } = require('./content-edit.service');
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function id(value) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
        fail(400, 'Identificador inválido.');
    return Number(value);
}
function createCommunity(database = db) {
    async function account(c, owner, lock = false) {
        const [rows] = await c.execute(
            'SELECT id_externo,situacao FROM publico_externo WHERE id_externo=?' +
                (lock ? ' FOR UPDATE' : ''),
            [id(owner)]
        );
        if (rows[0]?.situacao !== 'ativo') fail(403, 'Conta externa indisponível.');
    }
    async function transaction(owner, action) {
        const c = await database.getConnection();
        try {
            await c.beginTransaction();
            await account(c, owner, true);
            const result = await action(c);
            await c.commit();
            return result;
        } catch (e) {
            await c.rollback();
            throw e;
        } finally {
            c.release();
        }
    }
    async function updateProfile(owner, body) {
        const limits = { nome: 100, telefone: 20, organizacao: 120 },
            data = {};
        for (const [name, max] of Object.entries(limits)) {
            if (!Object.hasOwn(body, name)) continue;
            const value = body[name];
            if (
                typeof value !== 'string' ||
                value.trim().length > max ||
                /[\x00-\x1f\x7f]/.test(value) ||
                (name === 'nome' && !value.trim())
            )
                fail(400, 'Dados pessoais inválidos.');
            data[name] = value.trim() || null;
        }
        const fields = Object.keys(data);
        if (!fields.length) fail(400, 'Nenhum dado pessoal para salvar.');
        return transaction(owner, async (c) => {
            await c.execute(
                'UPDATE publico_externo SET ' +
                    fields.map((name) => name + '=?').join(',') +
                    " WHERE id_externo=? AND situacao='ativo'",
                [...fields.map((name) => data[name]), id(owner)]
            );
            return {
                message:
                    'Dados pessoais salvos. Se houver um pedido de Professor, atualize e reenvie os dados para análise.'
            };
        });
    }
    async function registrations(owner) {
        await account(database, owner);
        let rows;
        try { [rows] = await database.execute(
            "SELECT e.id_projeto,e.status FROM projeto_inscricoes_externas e JOIN projetos p ON p.id_projeto=e.id_projeto WHERE e.id_externo=? AND p.aprovacao='aprovado' AND p.visibilidade='publico'",
            [id(owner)]
        ); } catch(error) { if(error.code==='ER_BAD_FIELD_ERROR') return []; throw error; }
        return rows;
    }
    async function register(owner, project, cancel = false) {
        return transaction(owner, async (c) => {
            const [projects] = await c.execute(
                'SELECT id_projeto,aprovacao,situacao,permite_externos,vagas,visibilidade FROM projetos WHERE id_projeto=? FOR UPDATE',
                [id(project)]
            );
            const row = projects[0];
            if (!row || row.aprovacao !== 'aprovado') fail(404, 'Projeto não encontrado.');
            if (cancel) {
                const [result] = await c.execute(
                    "UPDATE projeto_inscricoes_externas SET status='cancelado' WHERE id_projeto=? AND id_externo=? AND status IN ('inscrito','aprovado')",
                    [id(project), id(owner)]
                );
                if (!result.affectedRows) fail(409, 'Não há inscrição ativa para cancelar.');
                return { message: 'Inscrição cancelada.' };
            }
            if (![1, true].includes(row.permite_externos))
                fail(403, 'Este projeto não permite participação da Comunidade externa.');
            if (row.visibilidade !== 'publico') fail(404,'Projeto não disponível publicamente.');
            if (!['ativo', 'inscricoes'].includes(row.situacao))
                fail(409, 'O projeto não está recebendo inscrições.');
            const [existing] = await c.execute(
                'SELECT status FROM projeto_inscricoes_externas WHERE id_projeto=? AND id_externo=? FOR UPDATE',
                [id(project), id(owner)]
            );
            if (existing.length && existing[0].status !== 'cancelado')
                fail(409, 'Já existe uma inscrição para este projeto.');
            if (Number(row.vagas) > 0) {
                const [counts] = await c.execute(
                    "SELECT (SELECT COUNT(*) FROM projeto_inscricoes WHERE id_projeto=? AND status IN ('inscrito','aprovado')) + (SELECT COUNT(*) FROM projeto_inscricoes_externas WHERE id_projeto=? AND status IN ('inscrito','aprovado')) AS total",
                    [id(project), id(project)]
                );
                if (Number(counts[0].total) >= Number(row.vagas))
                    fail(409, 'Não há vagas disponíveis.');
            }
            await c.execute(
                "INSERT INTO projeto_inscricoes_externas(id_projeto,id_externo,status) VALUES (?,?,'inscrito') ON DUPLICATE KEY UPDATE status='inscrito',criado_em=NOW()",
                [id(project), id(owner)]
            );
            return { message: 'Inscrição realizada.' };
        });
    }
    async function agenda(owner) {
        await account(database, owner);
        const [rows] = await database.execute(
            'SELECT * FROM agenda_externa WHERE id_externo=? ORDER BY data_evento,hora_inicio',
            [id(owner)]
        );
        return rows.map((row) => ({
            ...row,
            visibilidade: 'pessoal',
            origem_calendario: 'agenda'
        }));
    }
    async function saveEvent(owner, key, body) {
        const data = validateContent('calendar', body, !key);
        // Campos de autoria, visibilidade pública e origem acadêmica nunca vêm do cliente.
        const allowed = [
            'titulo',
            'descricao',
            'categoria',
            'data_evento',
            'data_fim',
            'hora_inicio',
            'hora_fim',
            'local'
        ];
        const names = allowed.filter((name) => Object.hasOwn(data, name));
        if (!names.length) fail(400, 'Nenhum campo para salvar.');
        return transaction(owner, async (c) => {
            if (key) {
                const [rows] = await c.execute(
                    'SELECT * FROM agenda_externa WHERE id_evento=? AND id_externo=? FOR UPDATE',
                    [id(key), id(owner)]
                );
                if (!rows.length) fail(404, 'Evento não encontrado.');
                const combined = { ...rows[0], ...data };
                const iso = (value) =>
                    value instanceof Date
                        ? value.toISOString().slice(0, 10)
                        : String(value || '').slice(0, 10);
                if (combined.data_fim && iso(combined.data_fim) < iso(combined.data_evento))
                    fail(400, 'A data final deve ser posterior à inicial.');
                await c.execute(
                    'UPDATE agenda_externa SET ' +
                        names.map((name) => name + '=?').join(',') +
                        ' WHERE id_evento=? AND id_externo=?',
                    [...names.map((name) => data[name]), id(key), id(owner)]
                );
            } else {
                await c.execute(
                    'INSERT INTO agenda_externa (id_externo,' +
                        names.join(',') +
                        ') VALUES (' +
                        [owner, ...names].map(() => '?').join(',') +
                        ')',
                    [id(owner), ...names.map((name) => data[name])]
                );
            }
            return { message: 'Evento pessoal salvo.' };
        });
    }
    async function deleteEvent(owner, key) {
        return transaction(owner, async (c) => {
            const [result] = await c.execute(
                'DELETE FROM agenda_externa WHERE id_evento=? AND id_externo=?',
                [id(key), id(owner)]
            );
            if (!result.affectedRows) fail(404, 'Evento não encontrado.');
            return { message: 'Evento pessoal excluído.' };
        });
    }
    async function documents(owner) {
        fail(403,'Documentos não estão disponíveis para a Comunidade externa.');
    }
    async function download(owner, key) {
        fail(403,'Documentos não estão disponíveis para a Comunidade externa.');
    }
    return {
        updateProfile,
        registrations,
        register,
        agenda,
        saveEvent,
        deleteEvent,
        documents,
        download
    };
}
module.exports = { createCommunity };
