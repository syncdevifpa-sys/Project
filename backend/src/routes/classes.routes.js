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
const cohortInfo = require('../services/cohort-info.service').createCohortInfo();
const classSchedule = require('../services/class-schedule.service').createClassSchedule();
const academic = require('../services/academic-management.service').createAcademicManagement();
router.get('/academic/features',action(async(q,s)=>s.json(await academic.features(q.user.id_usuario))));
router.get('/academic/catalog',action(async(q,s)=>s.json(await academic.catalog(q.user.id_usuario,q.query.todas==='1'))));
router.post('/academic/catalog',action(async(q,s)=>s.status(201).json(await academic.saveCatalog(q.user.id_usuario,q.body||{}))));
router.put('/academic/catalog/:id',action(async(q,s)=>s.json(await academic.saveCatalog(q.user.id_usuario,q.body||{},q.params.id))));
router.get('/academic/management',action(async(q,s)=>s.json(await academic.adminList(q.user.id_usuario,q.query.estado))));
router.get('/academic/history/:type/:id',action(async(q,s)=>s.json(await academic.history(q.user.id_usuario,q.params.type,q.params.id))));
router.post('/academic/archive/:type/:id',action(async(q,s)=>s.json(await academic.archive(q.user.id_usuario,q.params.type,q.params.id,q.body||{}))));
router.post('/academic/restore/:type/:id',action(async(q,s)=>s.json(await academic.restore(q.user.id_usuario,q.params.type,q.params.id,q.body||{}))));
router.delete('/academic/records/:type/:id',action(async(q,s)=>s.json(await academic.destroy(q.user.id_usuario,q.params.type,q.params.id,q.body||{}))));
router.get('/academic/cohorts',action(async(q,s)=>s.json(await academic.joinCatalog(q.user.id_usuario,q.query.busca))));
router.get('/academic/memberships',action(async(q,s)=>s.json(await academic.myMemberships(q.user.id_usuario))));
router.post('/academic/requests',action(async(q,s)=>s.status(201).json(await academic.joinRequest(q.user.id_usuario,q.body||{}))));
router.get('/academic/requests/review',action(async(q,s)=>s.json(await academic.reviewRequests(q.user.id_usuario))));
router.put('/academic/requests/:id',action(async(q,s)=>s.json(await academic.decision(q.user.id_usuario,q.params.id,q.body||{}))));
router.post('/:id/enroll-cohort',action(async(q,s)=>s.json(await academic.bulkEnroll(q.user.id_usuario,q.params.id,q.body||{}))));
router.patch('/:id/offering',action(async(q,s)=>s.json(await service.updateOwnOffer(q.user.id_usuario,q.params.id,q.body||{}))));
router.put('/:id/period', action(async(q,s)=>s.json(await service.updatePeriod(q.user.id_usuario,q.params.id,q.body||{}))));
router.get('/schedule', action(async(q,s)=>s.json(await classSchedule.agenda(q.user.id_usuario,q.query.from,q.query.to))));
router.get('/:id/schedule', action(async(q,s)=>s.json(await classSchedule.list(q.user.id_usuario,q.params.id))));
router.post('/:id/schedule', action(async(q,s)=>s.status(201).json(await classSchedule.save(q.user.id_usuario,q.params.id,q.body||{}))));
router.put('/:id/schedule/:schedule', action(async(q,s)=>s.json(await classSchedule.save(q.user.id_usuario,q.params.id,q.body||{},q.params.schedule))));
router.delete('/:id/schedule/:schedule', action(async(q,s)=>s.json(await classSchedule.remove(q.user.id_usuario,q.params.id,q.params.schedule,q.body?.versao))));
router.get('/:id/schedule/:schedule/exceptions', action(async(q,s)=>s.json(await classSchedule.exceptions(q.user.id_usuario,q.params.id,q.params.schedule))));
router.put('/:id/schedule/:schedule/exceptions', action(async(q,s)=>s.json(await classSchedule.exception(q.user.id_usuario,q.params.id,q.params.schedule,q.body||{}))));
router.get('/catalog', action(async(q,s)=>s.json(await cohortInfo.catalog(q.user.id_usuario))));
router.get('/cohorts/:id/info', action(async(q,s)=>s.json(await cohortInfo.detail(q.user.id_usuario,q.params.id))));
router.patch('/cohorts/:id/room', action(async(q,s)=>s.json(await cohortInfo.room(q.user.id_usuario,q.params.id,q.body||{}))));
router.get('/cohorts/:id/room/history', action(async(q,s)=>s.json(await cohortInfo.history(q.user.id_usuario,q.params.id))));
router.put('/cohorts/:id/representative', action(async(q,s)=>s.json(await cohortInfo.representative(q.user.id_usuario,q.params.id,q.body||{}))));
router.put('/cohorts/:id/vices', action(async(q,s)=>s.json(await cohortInfo.vices(q.user.id_usuario,q.params.id,q.body||{}))));
router.get('/cohorts/:id/representative/candidates', action(async(q,s)=>s.json(await cohortInfo.candidates(q.user.id_usuario,q.params.id))));
router.put('/cohorts/:id/representative/whatsapp', action(async(q,s)=>s.json(await cohortInfo.whatsapp(q.user.id_usuario,q.params.id,q.body||{}))));
router.delete('/cohorts/:id', action(async (q, s) => s.json(await academic.archive(q.user.id_usuario, 'turma', q.params.id, q.body || {}))));
router.delete('/:id', action(async (q, s) => s.json(await academic.archive(q.user.id_usuario, 'oferta', q.params.id, q.body || {}))));
router.post(
    '/cohorts/:id/leave',
    action(async (q, s) =>
        s.json(await service.leaveCohort(q.user.id_usuario, q.params.id, q.body || {}))
    )
);
router.post(
    '/:id/leave',
    action(async (q, s) =>
        s.json(await service.leaveSubject(q.user.id_usuario, q.params.id, q.body || {}))
    )
);
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
    action(async (q, s) =>
        s.json(await service.cohortFeed(q.user.id_usuario, q.params.id, q.query.periodo))
    )
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
router.use((e, q, s, _next) => {
    const status =
        e.status ||
        (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(e.code)
            ? 503
            : e.code === 'ER_DUP_ENTRY'
              ? 409
              : 500);
    if (status === 500) console.error('Classes API:', e.code || e.name);
    s.status(status).json({
        error: e.status
            ? e.message
            : status === 503
              ? q.path.includes('/schedule')
                  ? 'Horários indisponíveis neste banco. Confira backend/db/checks/1.1.30.sql; a estrutura é preparada por backend/db/migrations/1.1.30.sql. Não reaplique uma migração já confirmada sem revisar o diagnóstico.'
                  : 'Turmas precisa ser habilitado no banco. Aplique a migração com a equipe.'
              : status === 409
                ? /uq_turma_nome_global/.test(e.sqlMessage || e.message || '')
                    ? 'Já existe uma turma com esse nome. Escolha outro nome ou use a turma existente.'
                    : 'Já existe uma oferta desta disciplina no período letivo informado.'
                : 'Não foi possível concluir a operação de Turmas.'
    });
});
module.exports = router;
