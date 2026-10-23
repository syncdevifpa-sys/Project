const router = require('express').Router();
const db = require('../config/database');
async function publicProjects() {
    try { return await db.execute(`SELECT id_projeto,titulo,descricao,eixo,data_inicio,data_fim FROM projetos WHERE aprovacao = 'aprovado' AND visibilidade = 'publico' ORDER BY criado_em DESC`); }
    catch(error) { if(error.code==='ER_BAD_FIELD_ERROR') return [[]]; throw error; }
}

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
            publicProjects()
        ]);
        res.json({ notices, projects });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
