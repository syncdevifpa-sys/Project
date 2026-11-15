const router = require('express').Router();
const { authenticateSubject, taskOwner } = require('../middlewares/subject.middleware');
const service = require('../services/google-workspace.service').createWorkspace();
router.use(authenticateSubject, (_q, s, next) => {
    s.set('Cache-Control', 'private, no-store');
    next();
});
const action = (fn) => async (q, s) => {
    try {
        await fn(q, s);
    } catch (e) {
        const schema = ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(e.code);
        s.status(e.status || (schema ? 503 : 500)).json({
            error: e.status
                ? e.message
                : schema
                  ? 'A integração aguarda a aplicação de google-workspace.sql no banco.'
                  : 'Não foi possível preparar o envio ao Google. Tente novamente.'
        });
    }
};
router.get('/config', (_q, s) => {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    let appOrigin = null;
    try {
        const url = new URL(process.env.APP_URL);
        if (
            url.protocol === 'https:' ||
            (!process.env.VERCEL &&
                ['localhost', '127.0.0.1'].includes(url.hostname) &&
                url.protocol === 'http:')
        )
            appOrigin = url.origin;
    } catch {}
    const configured =
        /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId) && !!appOrigin;
    s.json({ configured, clientId: configured ? clientId : null, appOrigin });
});
router.get(
    '/destinations/:sub',
    action(async (q, s) => s.json(await service.read(taskOwner(q), q.params.sub)))
);
router.post(
    '/destinations/:sub/lease',
    action(async (q, s) => s.json(await service.claim(taskOwner(q), q.params.sub)))
);
router.put(
    '/destinations/:sub',
    action(async (q, s) => s.json(await service.save(taskOwner(q), q.params.sub, q.body || {})))
);
router.delete(
    '/destinations/:sub/lease',
    action(async (q, s) => {
        await service.release(taskOwner(q), q.params.sub, q.body?.lease);
        s.json({ message: 'Envio finalizado.' });
    })
);
module.exports = router;
