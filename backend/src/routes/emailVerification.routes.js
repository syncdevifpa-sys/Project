const router = require('express').Router();
const service = require('../services/email-verification.service');
const mail = require('../services/email.service');
const limits = require('../services/security-limits.service');
const generic = {
    message:
        'Se houver uma conta que precise de confirmação, um link será enviado. Confira também o spam.'
};
const action = (fn) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        await fn(req, res);
    } catch (error) {
        res.status(error.status || 503).json({
            error: error.status
                ? error.message
                : 'A confirmação de e-mail está temporariamente indisponível.'
        });
    }
};
router.post(
    '/request',
    action(async (req, res) => {
        const email = service.address(req.body.email);
        if (!mail.recoveryConfigured())
            return res
                .status(503)
                .json({ error: 'A confirmação por e-mail está temporariamente indisponível.' });
        await limits.verification(req, email);
        await service.resend(email);
        res.json(generic);
    })
);
router.post(
    '/confirm',
    action(async (req, res) => {
        if (
            Object.keys(req.body).some((key) => key !== 'token') ||
            typeof req.body.token !== 'string' ||
            !/^[a-f0-9]{64}$/.test(req.body.token)
        )
            return res.status(400).json({ error: 'Link inválido, expirado ou já utilizado.' });
        await limits.confirmation(req);
        res.json(await service.confirm(req.body.token));
    })
);
function change(kind) {
    return action(async (req, res) => {
        if (Object.keys(req.body).some((key) => !['email', 'senhaAtual'].includes(key)))
            return res.status(400).json({ error: 'Dados de solicitação inválidos.' });
        const email = service.address(req.body.email);
        await limits.verification(req, email);
        const id = kind === 'users' ? req.user.id_usuario : req.externalUser.id_externo;
        const result = await service.requestChange(kind, id, email, req.body.senhaAtual);
        if (!result.sent)
            return res
                .status(503)
                .json({
                    error: 'Não foi possível enviar o link. Seu e-mail atual foi mantido. Tente novamente mais tarde.'
                });
        res.status(202).json({
            message:
                'Confira o link no novo endereço. Seu e-mail de acesso só será alterado após a confirmação.'
        });
    });
}
function status(kind) {
    return action(async (req, res) => {
        const external = kind === 'external';
        const id = external ? req.externalUser.id_externo : req.user.id_usuario;
        const model = external
            ? require('../models/externalUsers.model')
            : require('../models/users.model');
        const user = external ? await model.findExternalById(id) : await model.findUserById(id);
        if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
        res.json({ ...(await service.loginStatus(kind, id, user.email)), email: user.email });
    });
}
module.exports = { router, change, status };
