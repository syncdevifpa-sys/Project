const db = require("../config/database");

async function listarAvisos() {
    const [avisos] = await db.execute(`
        SELECT
            id_aviso,
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
        ORDER BY data_publicacao DESC
    `);

    return avisos;
}

module.exports = {
    listarAvisos
};