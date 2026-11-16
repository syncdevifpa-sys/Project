/* Página pública com metadados próprios para leitores e compartilhamento. */
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { canReadNotice } = require('../services/notice-visibility.service');
const links = require('../../../frontend/js/notice-links');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const text = links.plainText;
/* Lista somente URLs que podem ser abertas pelo visitante. */
function renderSitemap(rows, origin = 'https://portalarcadia.vercel.app', projects = []) {
    const urls = ['<url><loc>' + escape(origin + '/') + '</loc></url>'];
    function add(url, row) {
        const updated = row.atualizado_em || row.data_publicacao || row.criado_em;
        const date = updated instanceof Date ? updated :
            typeof updated === 'string' && /^\d{4}-\d{2}-\d{2}/.test(updated) ? new Date(updated) : null;
        const lastmod = date && Number.isFinite(date.getTime())
            ? '<lastmod>' + date.toISOString() + '</lastmod>' : '';
        urls.push('<url><loc>' + escape(origin + url) + '</loc>' + lastmod + '</url>');
    }
    for (const row of rows) {
        if (canReadNotice(row, null) && /^[1-9]\d*$/.test(String(row.id_aviso)))
            add(links.path(row), row);
    }
    for (const project of projects) {
        if (project.aprovacao === 'aprovado' && project.visibilidade === 'publico' &&
            /^[1-9]\d*$/.test(String(project.id_projeto)))
            add('/project.html?id=' + project.id_projeto, project);
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.join('\n') + '\n</urlset>\n';
}
function createPublicNoticeRouter(model, origin = 'https://portalarcadia.vercel.app', projectsModel = null) {
    const router = express.Router();
    const template = fs.readFileSync(path.join(__dirname, '../../../frontend/notice.html'), 'utf8');
    router.get('/sitemap.xml', async (_req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            const [rows, projects] = await Promise.all([
                model.listNotices(),
                projectsModel ? projectsModel.listProjects() : []
            ]);
            res.type('application/xml').send(renderSitemap(rows, origin, projects));
        } catch {
            res.status(503).type('text/plain').send('Sitemap temporariamente indisponível.');
        }
    });
    router.get('/noticias/:id/capa', async (req, res, next) => {
        try {
            res.set('Cache-Control', 'no-store');
            const row = await model.findNoticeById(req.params.id);
            if (!row || !canReadNotice(row, null)) return res.sendStatus(404);
            const image = typeof row.capa === 'string' && row.capa.length <= 750000
                ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(row.capa) : null;
            if (!image) return res.sendStatus(404);
            res.type('image/' + image[1]).send(Buffer.from(image[2], 'base64'));
        } catch (error) { next(error); }
    });
    router.get(['/noticias/:id', '/noticias/:id/:slug'], async (req, res, next) => {
        try {
            res.set('Cache-Control', 'no-store');
            if (!/^[1-9]\d*$/.test(req.params.id)) return res.sendStatus(404);
            const row = await model.findNoticeById(req.params.id);
            const readable = row && canReadNotice(row, null);
            let head = '<base href="/">';
            const title = readable ? text(row.titulo) + ' · Arcádia' : 'Publicação · Arcádia';
            if (readable) {
                const canonical = origin + links.path(row);
                if (req.path !== links.path(row)) return res.redirect(302, links.path(row));
                const description = text(row.resumo || row.descricao).slice(0, 220);
                const image = row.capa ? origin + '/noticias/' + row.id_aviso + '/capa' : origin + '/assets/arcadia-emblem.png';
                head += '<link rel="canonical" href="' + escape(canonical) + '">' +
                    '<meta name="description" content="' + escape(description) + '">' +
                    '<meta property="og:type" content="article">' +
                    '<meta property="og:site_name" content="Arcádia">' +
                    '<meta property="og:title" content="' + escape(text(row.titulo)) + '">' +
                    '<meta property="og:description" content="' + escape(description) + '">' +
                    '<meta property="og:url" content="' + escape(canonical) + '">' +
                    '<meta property="og:image" content="' + escape(image) + '">' +
                    '<meta name="twitter:card" content="summary_large_image">';
            } else {
                head += '<meta name="robots" content="noindex,nofollow">';
            }
            let html = template.replace('<head>', '<head>' + head)
                .replace('<html ', '<html data-notice-id="' + escape(req.params.id) + '" ')
                .replace(/<title>[^<]*<\/title>/, '<title>' + escape(title) + '</title>');
            if (readable) html = html.replace('</body>', '<noscript><article><h1>' + escape(row.titulo) +
                '</h1><p>' + escape(text(row.descricao || row.resumo)) + '</p></article></noscript></body>');
            if (!row) res.status(404);
            res.type('html').send(html);
        } catch (error) { next(error); }
    });
    return router;
}
module.exports = { createPublicNoticeRouter, renderSitemap };
