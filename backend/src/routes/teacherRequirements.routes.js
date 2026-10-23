const router = require('express').Router();
const { authenticateExternal } = require('../middlewares/externalAuth.middleware');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');
const service = require('../services/teacher-requirements.service').createRequirements();
router.use((_q, s, next) => {
    s.set('Cache-Control', 'no-store');
    next();
});
const action = (fn) => async (q, s) => {
    try {
        s.json(await fn(q));
    } catch (e) {
        s.status(
            e.status ||
                (['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code) ? 503 : e.code === 'ER_DUP_ENTRY' ? 409 : 500)
        ).json({
            error: e.status
                ? e.message
                : ['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code)
                  ? 'Requisitos precisa ser habilitado no banco.'
                  : e.code === 'ER_DUP_ENTRY'
                    ? 'Nome de usuário, matrícula ou e-mail já vinculado. Confira os dados.'
                    : 'Não foi possível concluir a solicitação.'
        });
    }
};
router.get(
    '/mine',
    authenticateExternal,
    action((q) => service.own(q.externalUser.id_externo))
);
router.post(
    '/mine',
    authenticateExternal,
    action((q) => service.submit(q.externalUser.id_externo, q.body || {}))
);
router.get(
    '/review',
    authenticateToken,
    authorizeAdmin,
    action((q) => service.list(q.user.id_usuario))
);
router.post(
    '/review/:id',
    authenticateToken,
    authorizeAdmin,
    action((q) => service.decide(q.user.id_usuario, q.params.id, q.body || {}))
);
module.exports = router;
