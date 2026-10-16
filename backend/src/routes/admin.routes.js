const router = require('express').Router();
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');
const service = require('../services/admin.service');
router.use(authenticateToken, authorizeAdmin);
const action = (fn) => async (req, res) => {
    try {
        const result = await fn(req);
        res.json(result || { message: 'Operação concluída.' });
    } catch (error) {
        res.status(
            error.status ||
                (error.code === 'ER_DUP_ENTRY'
                    ? 409
                    : error.code === 'ER_NO_REFERENCED_ROW_2'
                      ? 400
                      : 500)
        ).json({
            error: error.status
                ? error.message
                : 'Não foi possível concluir a operação. Confira os dados e suas relações.'
        });
    }
};
function id(req) {
    const value = Number(req.params.id);
    if (!Number.isInteger(value) || value <= 0) {
        const error = new Error('Identificador inválido.');
        error.status = 400;
        throw error;
    }
    return value;
}
router.get(
    '/resources',
    action(() => service.catalog())
);
router.get(
    '/registrations',
    action(() => service.registrations())
);
router.post(
    '/registrations',
    action((req) => {
        const project = Number(req.body.id_projeto),
            person = Number(req.body.id_usuario);
        if (
            !Number.isInteger(project) ||
            project <= 0 ||
            !Number.isInteger(person) ||
            person <= 0
        ) {
            const error = new Error('Projeto e pessoa inválidos.');
            error.status = 400;
            throw error;
        }
        return service.registrations(project, person, req.body);
    })
);
router.patch(
    '/registrations/:project/:id',
    action((req) => {
        const project = Number(req.params.project);
        if (!Number.isInteger(project) || project <= 0) {
            const error = new Error('Projeto inválido.');
            error.status = 400;
            throw error;
        }
        return service.registrations(project, id(req), req.body);
    })
);
router.delete(
    '/registrations/:project/:id',
    action((req) => {
        const project = Number(req.params.project);
        if (!Number.isInteger(project) || project <= 0) {
            const error = new Error('Projeto inválido.');
            error.status = 400;
            throw error;
        }
        return service.registrations(project, id(req), {}, true);
    })
);
router.get(
    '/people/:kind',
    action((req) => service.people(req.params.kind))
);
router.patch(
    '/people/:kind/:id',
    action((req) => service.changePerson(req.params.kind, id(req), req.body, req.user.id_usuario))
);
router.delete(
    '/people/:kind/:id',
    action((req) => service.changePerson(req.params.kind, id(req), {}, req.user.id_usuario, true))
);
router.get(
    '/content/:resource',
    action((req) => service.list(req.params.resource))
);
router.post(
    '/content/:resource',
    action((req) => service.save(req.params.resource, null, req.body, req.user.id_usuario))
);
router.patch(
    '/content/:resource/:id',
    action((req) => service.save(req.params.resource, id(req), req.body, req.user.id_usuario))
);
router.delete(
    '/content/:resource/:id',
    action((req) => service.remove(req.params.resource, id(req)))
);
module.exports = router;
