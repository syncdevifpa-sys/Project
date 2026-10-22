const router = require('express').Router();
const crypto = require('node:crypto');
const { createDispatcher } = require('../services/reminder-dispatch.service');
function authorized(header, secret) {
    if (typeof secret !== 'string' || secret.length < 32 || typeof header !== 'string') return false;
    const expected = Buffer.from('Bearer ' + secret), received = Buffer.from(header);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!authorized(req.headers.authorization, process.env.CRON_SECRET)) return res.status(401).json({ error: 'Acesso não autorizado.' });
    try {
        const result = await createDispatcher().run();
        return res.status(result.disabled ? 503 : 200).json(result);
    } catch {
        console.error('[reminders] Falha de processamento.');
        return res.status(503).json({ error: 'Processador de lembretes indisponível. Confira migração e configuração.' });
    }
});
module.exports = { router, authorized };
