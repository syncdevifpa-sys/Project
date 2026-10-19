const { developmentFallbackEnabled } = require('../services/development-mode.service');
const db = require('../config/database');
const {
    hasNoticeType,
    writableType,
    hasNoticeCover,
    writableCover
} = require('../services/notice-schema.service');

async function listNotices() {
    try {
        const coverColumn = (await hasNoticeCover()) ? 'capa' : 'NULL AS capa';
        const typeColumn = (await hasNoticeType()) ? 'tipo_publicacao' : "'aviso' AS tipo_publicacao";
        const [notices] = await db.execute(`
            SELECT
                id_aviso,
                ${typeColumn},
                ${coverColumn},
                id_usuario,
                titulo,
                resumo,
                descricao,
                categoria,
                publico_alvo,
                situacao,
                urgente,
                fixado,
                referencia,
                data_prazo,
                data_evento,
                vagas,
                detalhes,
                data_publicacao,
                criado_em,
                atualizado_em
            FROM avisos
            ORDER BY fixado DESC, data_publicacao DESC
        `);

        return notices;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return require('../services/dev-memory-store.service').listNotices();
        }
        throw err;
    }
}

async function findNoticeById(noticeId) {
    try {
        const coverColumn = (await hasNoticeCover()) ? 'capa' : 'NULL AS capa';
        const typeColumn = (await hasNoticeType()) ? 'tipo_publicacao' : "'aviso' AS tipo_publicacao";
        const [notices] = await db.execute(
            `
            SELECT
                id_aviso,
                ${typeColumn},
                ${coverColumn},
                id_usuario,
                titulo,
                resumo,
                descricao,
                categoria,
                publico_alvo,
                situacao,
                urgente,
                fixado,
                referencia,
                data_prazo,
                data_evento,
                vagas,
                detalhes,
                data_publicacao,
                criado_em,
                atualizado_em
            FROM avisos
            WHERE id_aviso = ?
        `,
            [noticeId]
        );

        return notices[0];
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return require('../services/dev-memory-store.service').findNoticeById(noticeId);
        }
        throw err;
    }
}

async function createNotice(noticeData) {
    const coverAvailable = await writableCover(noticeData.capa);
    const typeAvailable = await writableType(noticeData.tipo_publicacao || 'aviso');
    const {
        id_usuario,
        titulo,
        resumo,
        descricao = null,
        categoria = 'matricula',
        publico_alvo = 'todos',
        situacao = 'publicado',
        urgente = false,
        fixado = false,
        referencia = null,
        data_prazo = null,
        data_evento = null,
        vagas = null,
        detalhes = null
    } = noticeData;

    const [result] = await db.execute(
        `
        INSERT INTO avisos (
            id_usuario,
            titulo,
            resumo,
            descricao,
            categoria,
            publico_alvo,
            situacao,
            urgente,
            fixado,
            referencia,
            data_prazo,
            data_evento,
            vagas,
            detalhes,
            data_publicacao
            ${typeAvailable ? ', tipo_publicacao' : ''}
            ${coverAvailable ? ', capa' : ''}
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${situacao === 'publicado' ? 'CURRENT_TIMESTAMP' : 'NULL'}${typeAvailable ? ', ?' : ''}${coverAvailable ? ', ?' : ''})
    `,
        [
            id_usuario,
            titulo,
            resumo,
            descricao,
            categoria,
            publico_alvo,
            situacao,
            urgente,
            fixado,
            referencia,
            data_prazo,
            data_evento,
            vagas,
            detalhes,
            ...(typeAvailable ? [noticeData.tipo_publicacao || 'aviso'] : []),
            ...(coverAvailable ? [noticeData.capa || null] : [])
        ]
    );

    return result;
}

async function updateNotice(noticeId, noticeData, actorId) {
    return require('../services/notice-edit.service').editNotice(noticeId, noticeData, actorId);
}

async function deleteNotice(noticeId, actorId) {
    if (!/^[1-9]\d*$/.test(String(noticeId)) || !Number.isSafeInteger(Number(noticeId))) {
        throw Object.assign(new Error('Identificador de publicação inválido.'), { status: 400 });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [actors] = await connection.execute(
            "SELECT id_usuario, is_admin FROM usuarios WHERE id_usuario = ? AND situacao = 'ativo' FOR UPDATE",
            [actorId]
        );
        if (!actors.length)
            throw Object.assign(new Error('Sessão institucional necessária.'), { status: 403 });
        const [notices] = await connection.execute(
            'SELECT id_usuario FROM avisos WHERE id_aviso = ? FOR UPDATE',
            [noticeId]
        );
        if (!notices.length)
            throw Object.assign(new Error('Aviso não encontrado.'), { status: 404 });
        const actor = actors[0];
        if (
            actor.is_admin !== 1 &&
            actor.is_admin !== true &&
            Number(notices[0].id_usuario) !== Number(actor.id_usuario)
        ) {
            throw Object.assign(
                new Error('Somente o autor ou um administrador pode excluir esta publicação.'),
                { status: 403 }
            );
        }
        // Leituras são dependências da publicação; outros registros não são removidos.
        await connection.execute('DELETE FROM avisos_lidos WHERE id_aviso = ?', [noticeId]);
        const [result] = await connection.execute('DELETE FROM avisos WHERE id_aviso = ?', [
            noticeId
        ]);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    listNotices,
    findNoticeById,
    createNotice,
    updateNotice,
    deleteNotice
};
