const { developmentFallbackEnabled } = require('../services/development-mode.service');
const db = require('../config/database');

const memoryApplications = [];
let nextId = 1;


async function applyToNotice(id_aviso, id_usuario, data = {}) {
    try {
        const [result] = await db.execute(
            `INSERT INTO inscricoes_editais (id_aviso, id_usuario, motivo, anexo_url) VALUES (?, ?, ?, ?)`,
            [id_aviso, id_usuario, data.motivo || null, data.anexo_url || null]
        );
        return {
            id_inscricao: result.insertId,
            id_aviso,
            id_usuario,
            status: 'inscrito',
            motivo: data.motivo || null,
            anexo_url: data.anexo_url || null,
            criado_em: new Date().toISOString()
        };
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const error = new Error('Você já realizou inscrição para este edital.');
            error.statusCode = 409;
            throw error;
        }
        if (developmentFallbackEnabled() && err.code === 'ECONNREFUSED') {
            const exists = memoryApplications.find(a => String(a.id_aviso) === String(id_aviso) && String(a.id_usuario) === String(id_usuario));
            if (exists) {
                const error = new Error('Você já realizou inscrição para este edital.');
                error.statusCode = 409;
                throw error;
            }
            const record = {
                id_inscricao: nextId++,
                id_aviso: Number(id_aviso),
                id_usuario: Number(id_usuario),
                status: 'inscrito',
                motivo: data.motivo || null,
                anexo_url: data.anexo_url || null,
                criado_em: new Date().toISOString()
            };
            memoryApplications.push(record);
            return record;
        }
        throw err;
    }
}

async function listApplicationsByNotice(id_aviso) {
    try {
        const [rows] = await db.execute(
            `SELECT i.*, u.nome, u.email, u.tipo_usuario 
             FROM inscricoes_editais i 
             JOIN usuarios u ON i.id_usuario = u.id_usuario 
             WHERE i.id_aviso = ? 
             ORDER BY i.criado_em DESC`,
            [id_aviso]
        );
        return rows;
    } catch (err) {
        if (developmentFallbackEnabled() && err.code === 'ECONNREFUSED') {
            return memoryApplications.filter(a => String(a.id_aviso) === String(id_aviso));
        }
        throw err;
    }
}

async function listUserApplications(id_usuario) {
    try {
        const [rows] = await db.execute(
            `SELECT i.*, a.titulo AS aviso_titulo, a.categoria, a.data_prazo 
             FROM inscricoes_editais i 
             JOIN avisos a ON i.id_aviso = a.id_aviso 
             WHERE i.id_usuario = ? 
             ORDER BY i.criado_em DESC`,
            [id_usuario]
        );
        return rows;
    } catch (err) {
        if (developmentFallbackEnabled() && err.code === 'ECONNREFUSED') {
            return memoryApplications.filter(a => String(a.id_usuario) === String(id_usuario));
        }
        throw err;
    }
}

async function updateApplicationStatus(id_inscricao, status, motivo) {
    try {
        await db.execute(
            `UPDATE inscricoes_editais SET status = ?, motivo = COALESCE(?, motivo) WHERE id_inscricao = ?`,
            [status, motivo || null, id_inscricao]
        );
        return true;
    } catch (err) {
        if (developmentFallbackEnabled() && err.code === 'ECONNREFUSED') {
            const item = memoryApplications.find(a => String(a.id_inscricao) === String(id_inscricao));
            if (item) {
                item.status = status;
                if (motivo) item.motivo = motivo;
            }
            return true;
        }
        throw err;
    }
}

module.exports = {
    applyToNotice,
    listApplicationsByNotice,
    listUserApplications,
    updateApplicationStatus
};
