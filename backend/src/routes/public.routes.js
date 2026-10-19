const router = require('express').Router();
const db = require('../config/database');

// Public projections deliberately exclude account and registration information.
router.get('/', async (req, res, next) => {
    try {
        const coverColumn = (await require('../services/notice-schema.service').hasNoticeCover())
            ? 'capa'
            : 'NULL AS capa';
        const [[notices], [projects]] = await Promise.all([
            db.execute(`SELECT id_aviso, titulo, resumo, descricao, data_publicacao, ${coverColumn}
                FROM avisos WHERE situacao = 'publicado' AND (FIND_IN_SET('todos', publico_alvo) > 0 OR FIND_IN_SET('externo', publico_alvo) > 0)
                ORDER BY fixado DESC, data_publicacao DESC`),
            db.execute(`SELECT id_projeto, titulo, descricao, eixo, data_inicio, data_fim
                FROM projetos WHERE aprovacao = 'aprovado' ORDER BY criado_em DESC`)
        ]);
        res.json({ notices, projects });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
