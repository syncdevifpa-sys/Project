const router = require('express').Router();
const { authenticateExternal } = require('../middlewares/externalAuth.middleware');
const service = require('../services/external-community.service').createCommunity();
router.use(authenticateExternal);
router.use((_q, s, next) => {
    s.set('Cache-Control', 'no-store');
    next();
});
const action = (fn) => async (q, s) => {
    try {
        await fn(q, s);
    } catch (e) {
        const migration = ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE'].includes(e.code);
        s.status(e.status || (migration ? 503 : 500)).json({
            error: e.status
                ? e.message
                : migration
                  ? 'O acesso da Comunidade externa precisa da atualização do banco.'
                  : 'Não foi possível concluir a operação.'
        });
    }
};
router.put(
    '/profile',
    action(async (q, s) =>
        s.json(await service.updateProfile(q.externalUser.id_externo, q.body || {}))
    )
);
router.get(
    '/registrations',
    action(async (q, s) => s.json(await service.registrations(q.externalUser.id_externo)))
);
router.post(
    '/projects/:id/register',
    action(async (q, s) =>
        s.status(201).json(await service.register(q.externalUser.id_externo, q.params.id))
    )
);
router.delete(
    '/projects/:id/register',
    action(async (q, s) =>
        s.json(await service.register(q.externalUser.id_externo, q.params.id, true))
    )
);
router.get(
    '/agenda',
    action(async (q, s) => s.json(await service.agenda(q.externalUser.id_externo)))
);
router.post(
    '/agenda',
    action(async (q, s) =>
        s.status(201).json(await service.saveEvent(q.externalUser.id_externo, null, q.body || {}))
    )
);
router.put(
    '/agenda/:id',
    action(async (q, s) =>
        s.json(await service.saveEvent(q.externalUser.id_externo, q.params.id, q.body || {}))
    )
);
router.delete(
    '/agenda/:id',
    action(async (q, s) =>
        s.json(await service.deleteEvent(q.externalUser.id_externo, q.params.id))
    )
);
router.get(
    '/documents',
    action(async (q, s) => s.json(await service.documents(q.externalUser.id_externo)))
);
router.get(
    '/documents/:id/download',
    action(async (q, s) => {
        const item = await service.download(q.externalUser.id_externo, q.params.id);
        s.set({
            'Content-Type': 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition':
                `attachment; filename="documento"; filename*=UTF-8''` +
                encodeURIComponent(item.nome_arquivo).replace(
                    /['()*]/g,
                    (c) => '%' + c.charCodeAt(0).toString(16)
                )
        });
        s.send(item.conteudo);
    })
);
module.exports = router;
