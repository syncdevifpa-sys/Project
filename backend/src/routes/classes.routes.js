const express = require('express');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { createClasses } = require('../services/classes.service');
const service = createClasses(),
    router = express.Router();
router.use(authenticateToken);
router.use((_q, s, next) => {
    s.set('Cache-Control', 'no-store');
    next();
});
const action = (fn) => async (q, s, next) => {
    try {
        await fn(q, s);
    } catch (e) {
        next(e);
    }
};
router.get(
    '/teachers',
    action(async (q, s) => s.json(await service.teachers(q.user.id_usuario)))
);
router.put(
    '/cohorts/:id',
    action(async (q, s) => {
        await service.updateCohort(q.user.id_usuario, q.params.id, q.body || {});
        s.json({ message: 'Dados da turma atualizados.' });
    })
);
router.put(
    '/:id',
    action(async (q, s) => {
        await service.updateSubject(q.user.id_usuario, q.params.id, q.body || {});
        s.json({ message: 'Disciplina e responsável atualizados.' });
    })
);
router.get(
    '/',
    action(async (q, s) => s.json(await service.list(q.user.id_usuario)))
);
router.post(
    '/',
    action(async (q, s) =>
        s.status(201).json(await service.create(q.user.id_usuario, q.body || {}))
    )
);
router.post(
    '/invites/:id/decision',
    action(async (q, s) => {
        await service.decide(q.user.id_usuario, q.params.id, q.body || {});
        s.json({ message: 'Convite atualizado.' });
    })
);
router.get(
    '/cohorts',
    action(async (q, s) => s.json(await service.cohorts(q.user.id_usuario)))
);
router.get(
    '/:id',
    action(async (q, s) => s.json(await service.detail(q.user.id_usuario, q.params.id)))
);
router.get(
    '/cohorts/:id/feed',
    action(async (q, s) => s.json(await service.cohortFeed(q.user.id_usuario, q.params.id)))
);
router.post(
    '/:id/invites',
    action(async (q, s) => {
        await service.invite(q.user.id_usuario, q.params.id, q.body || {});
        s.status(201).json({
            message:
                'Convite disponível na aba Turmas da conta convidada por 7 dias. Não enviamos e-mail nesta etapa.'
        });
    })
);
router.delete(
    '/:id/invites/:invite',
    action(async (q, s) => {
        await service.cancelInvite(q.user.id_usuario, q.params.id, q.params.invite);
        s.json({ message: 'Convite cancelado.' });
    })
);
router.post(
    '/:id/posts',
    action(async (q, s) =>
        s.status(201).json(await service.savePost(q.user.id_usuario, q.params.id, q.body || {}))
    )
);
router.delete(
    '/:id/students/:student',
    action(async (q, s) => {
        await service.removeStudent(q.user.id_usuario, q.params.id, q.params.student);
        s.json({ message: 'Acesso removido apenas desta disciplina.' });
    })
);
router.put(
    '/:id/posts/:post',
    action(async (q, s) =>
        s.json(await service.savePost(q.user.id_usuario, q.params.id, q.body || {}, q.params.post))
    )
);
router.delete(
    '/:id/posts/:post',
    action(async (q, s) => {
        await service.removePost(q.user.id_usuario, q.params.id, q.params.post);
        s.json({ message: 'Publicação excluída.' });
    })
);
router.get(
    '/:id/posts/:post/download',
    action(async (q, s) => {
        const item = await service.download(q.user.id_usuario, q.params.id, q.params.post);
        s.set({
            'Content-Type': 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "sandbox; default-src 'none'",
            'Content-Disposition': `attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(item.nome_arquivo).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))}`
        });
        s.send(item.conteudo);
    })
);
router.use((e, _q, s, _next) => {
    const status =
        e.status || (e.code === 'ER_NO_SUCH_TABLE' ? 503 : e.code === 'ER_DUP_ENTRY' ? 409 : 500);
    if (status === 500) console.error('Classes API:', e.code || e.name);
    s.status(status).json({
        error: e.status
            ? e.message
            : status === 503
              ? 'Turmas precisa ser habilitado no banco. Aplique a migração com a equipe.'
              : status === 409
                ? 'Já existe uma turma ou disciplina com esses dados. Confira os nomes e o ano.'
                : 'Não foi possível concluir a operação de Turmas.'
    });
});
module.exports = router;
