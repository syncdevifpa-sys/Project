const express = require('express');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { createLibrary, LIMITS } = require('../services/document-library.service');
const library = createLibrary();
const router = express.Router();
router.use(authenticateToken);
router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
const action = (fn) => async (req, res, next) => {
    try {
        await fn(req, res);
    } catch (error) {
        next(error);
    }
};
router.get(
    '/reviews',
    action(async (q, s) => s.json(await library.reviewList(q.user.id_usuario)))
);
router.post(
    '/items/:id/submit',
    action(async (q, s) => {
        await library.submit(q.user.id_usuario, q.params.id);
        s.json({ message: 'Documento enviado para avaliação da administração.' });
    })
);
router.post(
    '/items/:id/review',
    action(async (q, s) => {
        await library.review(q.user.id_usuario, q.params.id, q.body || {});
        s.json({ message: 'Avaliação registrada.' });
    })
);
router.post(
    '/public/:id/save',
    action(async (q, s) => {
        await library.savePublic(q.user.id_usuario, q.params.id, q.body || {});
        s.status(201).json({ message: 'Material salvo por referência na sua biblioteca.' });
    })
);
router.put(
    '/saved/:id',
    action(async (q, s) => {
        await library.changeSaved(q.user.id_usuario, q.params.id, q.body || {});
        s.json({ message: 'Documento salvo movido.' });
    })
);
router.delete(
    '/saved/:id',
    action(async (q, s) => {
        await library.changeSaved(q.user.id_usuario, q.params.id, null);
        s.json({ message: 'Referência removida da sua biblioteca.' });
    })
);
router.get(
    '/reviews/:id/download',
    action(async (q, s) => {
        const item = await library.reviewDownload(q.user.id_usuario, q.params.id);
        if (item.tipo !== 'arquivo')
            return s.status(400).json({ error: 'Este documento é um link.' });
        const filename = encodeURIComponent(item.nome_arquivo).replace(
            /['()*]/g,
            (c) => '%' + c.charCodeAt(0).toString(16)
        );
        s.set({
            'Content-Type': 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': `attachment; filename="documento"; filename*=UTF-8''${filename}`,
            'Content-Security-Policy': "sandbox; default-src 'none'"
        });
        s.send(item.conteudo);
    })
);
router.get(
    '/public',
    action(async (_q, s) => s.json(await library.publicList()))
);
router.get(
    '/',
    action(async (q, s) => s.json(await library.list(q.user.id_usuario)))
);
router.post(
    '/folders',
    action(async (q, s) => s.status(201).json(await library.saveFolder(q.user.id_usuario, q.body)))
);
router.put(
    '/folders/:id',
    action(async (q, s) => s.json(await library.saveFolder(q.user.id_usuario, q.body, q.params.id)))
);
router.delete(
    '/folders/:id',
    action(async (q, s) => {
        await library.removeFolder(q.user.id_usuario, q.params.id);
        s.json({ message: 'Pasta excluída.' });
    })
);
router.post(
    '/links',
    action(async (q, s) => s.status(201).json(await library.create(q.user.id_usuario, q.body)))
);
router.post(
    '/files',
    express.raw({ type: 'application/octet-stream', limit: LIMITS.file }),
    action(async (q, s) => {
        if (!Buffer.isBuffer(q.body))
            return s.status(400).json({ error: 'Envie o arquivo em formato binário.' });
        s.status(201).json(await library.create(q.user.id_usuario, q.query, q.body));
    })
);
router.put(
    '/items/:id',
    action(async (q, s) => {
        await library.update(q.user.id_usuario, q.params.id, q.body);
        s.json({ message: 'Documento atualizado.' });
    })
);
router.delete(
    '/items/:id',
    action(async (q, s) => {
        await library.remove(q.user.id_usuario, q.params.id);
        s.json({ message: 'Documento excluído.' });
    })
);
router.get(
    '/items/:id/download',
    action(async (q, s) => {
        const item = await library.download(q.user.id_usuario, q.params.id);
        if (item.tipo !== 'arquivo')
            return s.status(400).json({ error: 'Este documento é um link.' });
        const filename = encodeURIComponent(item.nome_arquivo).replace(
            /['()*]/g,
            (c) => '%' + c.charCodeAt(0).toString(16)
        );
        s.set({
            'Content-Type': 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': `attachment; filename="documento"; filename*=UTF-8''${filename}`,
            'Content-Security-Policy': "sandbox; default-src 'none'"
        });
        s.send(item.conteudo);
    })
);
router.use((error, _req, res, _next) => {
    if (['ER_ROW_IS_REFERENCED', 'ER_ROW_IS_REFERENCED_2'].includes(error.code))
        return res
            .status(409)
            .json({
                error: 'Este documento está anexado a uma disciplina. Remova o anexo em Turmas antes de excluir o original.'
            });
    const missing = error.code === 'ER_NO_SUCH_TABLE';
    const tooLarge = error.type === 'entity.too.large';
    if (error.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ error: 'Já existe uma pasta com esse nome.' });
    res.status(missing ? 503 : tooLarge ? 413 : error.status || 500).json({
        error: missing
            ? 'A biblioteca precisa ser habilitada no banco de dados. Fale com a equipe.'
            : tooLarge
              ? 'Envie um arquivo de até 2 MB.'
              : error.status
                ? error.message
                : 'Não foi possível acessar a biblioteca. Tente novamente.'
    });
});
module.exports = router;
