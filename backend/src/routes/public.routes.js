const router = require('express').Router();
const db = require('../config/database');
async function publicProjects() {
    try {
        const [columns] = await db.execute("SHOW COLUMNS FROM projetos LIKE 'capa'");
        const cover = columns.some((column) => column.Field === 'capa') ? 'capa' : 'NULL AS capa';
        return await db.execute(
            `SELECT id_projeto,titulo,descricao,eixo,data_inicio,data_fim,${cover} FROM projetos WHERE aprovacao = 'aprovado' AND visibilidade = 'publico' ORDER BY criado_em DESC`
        );
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') return [[]];
        throw error;
    }
}

/* As projeções públicas excluem dados de conta e inscrição. */
router.get('/', async (req, res, next) => {
    try {
        const coverColumn = (await require('../services/notice-schema.service').hasNoticeCover())
            ? 'capa'
            : 'NULL AS capa';
        const typeColumn = (await require('../services/notice-schema.service').hasNoticeType())
            ? 'tipo_publicacao'
            : "'aviso' AS tipo_publicacao";
        const [[notices], [projects]] = await Promise.all([
            db.execute(`SELECT id_aviso, titulo, resumo, descricao, data_publicacao, ${coverColumn}, ${typeColumn}
                FROM avisos WHERE situacao = 'publicado' AND (FIND_IN_SET('todos', publico_alvo) > 0 OR FIND_IN_SET('externo', publico_alvo) > 0)
                ORDER BY fixado DESC, data_publicacao DESC`),
            publicProjects()
        ]);
        res.json({ notices, projects });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
