/* Autoriza somente a conta dedicada, no ambiente de teste. */
const router = require('express').Router();
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');
const db = require('../config/database');
const cookie = 'arcadia_drive_oauth';
const callbackPath = '/api/google-drive/callback';
const account = 'portalarcadia.contato@gmail.com';

function config() {
    if (process.env.VERCEL_ENV !== 'preview') return null;
    const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: secret, GOOGLE_DRIVE_REDIRECT_URI: uri,
        GOOGLE_DRIVE_ENCRYPTION_KEY: rawKey } = process.env;
    if (!clientId || !secret || !uri || !/^[a-f0-9]{64}$/i.test(rawKey || '')) return null;
    const url = new URL(uri);
    if (url.protocol !== 'https:' || url.pathname !== callbackPath || url.search || url.hash ||
        url.hostname === 'portalarcadia.vercel.app') return null;
    return { clientId, secret, uri, key: Buffer.from(rawKey, 'hex') };
}

router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    next();
});

router.post('/authorize', authenticateToken, authorizeAdmin, (req, res) => {
    try {
        const settings = config();
        if (!settings || new URL(settings.uri).host !== req.get('host'))
            return res.status(503).json({ error: 'Configure o endereço do Preview e as credenciais do Drive.' });
        const nonce = crypto.randomBytes(32).toString('base64url');
        const verifier = crypto.randomBytes(48).toString('base64url');
        const state = jwt.sign({ nonce, verifier }, settings.key, { expiresIn: '5m', audience: 'arcadia-drive' });
        res.cookie(cookie, state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300000, path: callbackPath });
        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        url.search = new URLSearchParams({
            client_id: settings.clientId, redirect_uri: settings.uri, response_type: 'code',
            scope: 'openid email https://www.googleapis.com/auth/drive.file', login_hint: account,
            access_type: 'offline', prompt: 'consent', state: nonce, code_challenge_method: 'S256',
            code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url')
        });
        res.json({ url: url.href });
    } catch {
        res.status(503).json({ error: 'A configuração do Google Drive está incompleta.' });
    }
});

router.get('/callback', async (req, res) => {
    const signed = (req.headers.cookie || '').split(';').map(value => value.trim())
        .find(value => value.startsWith(cookie + '='))?.slice(cookie.length + 1);
    res.clearCookie(cookie, { httpOnly: true, secure: true, sameSite: 'lax', path: callbackPath });
    try {
        const settings = config();
        if (!settings || new URL(settings.uri).host !== req.get('host')) return res.sendStatus(404);
        const state = jwt.verify(signed, settings.key, { algorithms: ['HS256'], audience: 'arcadia-drive' });
        if (req.query.state !== state.nonce || typeof req.query.code !== 'string') throw Error();
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST', signal: AbortSignal.timeout(10000),
            body: new URLSearchParams({
                code: req.query.code, client_id: settings.clientId, client_secret: settings.secret,
                redirect_uri: settings.uri, grant_type: 'authorization_code', code_verifier: state.verifier
            })
        });
        if (!response.ok) throw Error();
        const token = await response.json();
        const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: 'Bearer ' + token.access_token }, signal: AbortSignal.timeout(10000)
        });
        if (!profile.ok) throw Error();
        const identity = await profile.json();
        if (identity.email !== account || identity.email_verified !== true || !token.refresh_token ||
            !String(token.scope).split(' ').includes('https://www.googleapis.com/auth/drive.file')) throw Error();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', settings.key, iv);
        const encrypted = Buffer.concat([cipher.update(token.refresh_token, 'utf8'), cipher.final()]);
        const credential = [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
        await db.execute(
            'INSERT INTO google_drive_conexao (id, credencial) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET credencial = EXCLUDED.credencial',
            [credential]
        );
        res.redirect(303, '/admin.html?drive=connected');
    } catch {
        res.redirect(303, '/admin.html?drive=error');
    }
});
module.exports = router;
