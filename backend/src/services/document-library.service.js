const db = require('../config/database');
const LIMITS = Object.freeze({
    file: 2 * 1024 * 1024,
    user: 20 * 1024 * 1024,
    total: 200 * 1024 * 1024,
    items: 500,
    folders: 100
});
const columns =
    'id_item, id_pasta, titulo, descricao, visibilidade, revisao, motivo_revisao, enviado_em, revisado_em, tipo, url, nome_arquivo, mime, tamanho, criado_em, atualizado_em';
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function id(value) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
        fail(400, 'Identificador inválido.');
    return Number(value);
}
function text(value, max, label) {
    if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.trim().length > max ||
        /[\x00-\x1f\x7f]/.test(value)
    )
        fail(400, `${label} inválido.`);
    return value.trim();
}
function folderId(value) {
    return value === null || value === '' || value === undefined ? null : id(value);
}
function url(value) {
    const input = text(value, 2000, 'Link');
    try {
        const parsed = new URL(input);
        if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
            throw Error();
        return parsed.href;
    } catch (_) {
        fail(400, 'Informe um link HTTP ou HTTPS válido, sem usuário ou senha no endereço.');
    }
}
function fileInfo(buffer, filename) {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > LIMITS.file)
        fail(413, 'Envie um arquivo de até 2 MB.');
    const name = text(filename, 150, 'Nome do arquivo');
    if (/[\\/]/.test(name)) fail(400, 'Nome do arquivo inválido.');
    const ext = name.split('.').pop().toLowerCase();
    let mime;
    if (
        ext === 'pdf' &&
        buffer.subarray(0, 5).toString() === '%PDF-' &&
        buffer.subarray(-2048).includes(Buffer.from('%%EOF'))
    )
        mime = 'application/pdf';
    if (
        ext === 'png' &&
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        buffer.length >= 20 &&
        buffer.subarray(-8, -4).toString() === 'IEND'
    )
        mime = 'image/png';
    if (
        ['jpg', 'jpeg'].includes(ext) &&
        buffer[0] === 255 &&
        buffer[1] === 216 &&
        buffer[2] === 255 &&
        buffer[buffer.length - 2] === 255 &&
        buffer[buffer.length - 1] === 217
    )
        mime = 'image/jpeg';
    if (!mime) fail(400, 'Formato inválido. Envie PDF, PNG ou JPEG compatível com a extensão.');
    return { name, mime, size: buffer.length };
}
function publication(body, current = {}) {
    const value = body.visibilidade ?? current.visibilidade ?? 'privado';
    if (!['privado', 'publico'].includes(value)) fail(400, 'Visibilidade inválida.');
    return value;
}
function description(body, current = {}) {
    const value = body.descricao ?? current.descricao ?? '';
    return value === '' || value === null ? null : text(value, 3000, 'Descrição');
}
const publisher = (user) =>
    user.tipo_usuario === 'docente' || user.is_admin === 1 || user.is_admin === true;
const publicAuthor =
    "u.situacao = 'ativo' AND (u.tipo_usuario = 'docente' OR u.is_admin = 1 OR i.revisao = 'aprovado')";
function createLibrary(database = db) {
    async function transaction(owner, action) {
        const connection = await database.getConnection();
        try {
            await connection.beginTransaction();
            const [users] = await connection.execute(
                'SELECT id_usuario, tipo_usuario, is_admin, situacao FROM usuarios WHERE id_usuario = ? FOR UPDATE',
                [owner]
            );
            if (!users.length || users[0].situacao !== 'ativo') fail(403, 'Conta indisponível.');
            const result = await action(connection, users[0]);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    async function ownedFolder(connection, owner, value) {
        const folder = folderId(value);
        if (folder !== null) {
            const [rows] = await connection.execute(
                'SELECT id_pasta FROM documento_pastas WHERE id_pasta = ? AND id_usuario = ?',
                [folder, owner]
            );
            if (!rows.length) fail(404, 'Pasta não encontrada.');
        }
        return folder;
    }
    async function list(owner) {
        const [users] = await database.execute(
            'SELECT tipo_usuario, is_admin FROM usuarios WHERE id_usuario = ?',
            [owner]
        );
        const [folders] = await database.execute(
            'SELECT id_pasta, nome FROM documento_pastas WHERE id_usuario = ? ORDER BY nome, id_pasta',
            [owner]
        );
        const [items] = await database.execute(
            `SELECT ${columns} FROM documento_itens WHERE id_usuario = ? ORDER BY atualizado_em DESC, id_item DESC`,
            [owner]
        );
        return {
            folders,
            items,
            saved: await savedList(owner),
            used: items.reduce((n, item) => n + Number(item.tamanho), 0),
            limits: LIMITS,
            canPublish: publisher(users[0] || {}),
            canReview: users[0]?.is_admin === 1 || users[0]?.is_admin === true
        };
    }
    async function saveFolder(owner, body, key) {
        const name = text(body.nome, 100, 'Nome da pasta');
        return transaction(owner, async (c) => {
            if (key) {
                const folder = await ownedFolder(c, owner, id(key));
                await c.execute(
                    'UPDATE documento_pastas SET nome = ? WHERE id_pasta = ? AND id_usuario = ?',
                    [name, folder, owner]
                );
                return { id_pasta: folder };
            }
            const [[count]] = await c.execute(
                'SELECT COUNT(*) AS count FROM documento_pastas WHERE id_usuario = ?',
                [owner]
            );
            if (Number(count.count) >= LIMITS.folders) fail(409, 'Limite de 100 pastas atingido.');
            const [result] = await c.execute(
                'INSERT INTO documento_pastas (id_usuario, nome) VALUES (?, ?)',
                [owner, name]
            );
            return { id_pasta: result.insertId };
        });
    }
    async function removeFolder(owner, key) {
        return transaction(owner, async (c) => {
            const folder = await ownedFolder(c, owner, id(key));
            const [items] = await c.execute(
                'SELECT id_item FROM documento_itens WHERE id_pasta = ? UNION ALL SELECT id_salvo AS id_item FROM documento_salvos WHERE id_pasta = ? LIMIT 1',
                [folder, folder]
            );
            if (items.length)
                fail(409, 'Mova ou exclua os documentos antes de excluir esta pasta.');
            await c.execute('DELETE FROM documento_pastas WHERE id_pasta = ? AND id_usuario = ?', [
                folder,
                owner
            ]);
        });
    }
    async function create(owner, body, buffer) {
        const title = text(body.titulo, 150, 'Título');
        const info = buffer ? fileInfo(buffer, body.nome_arquivo) : null;
        const link = info ? null : url(body.url);
        const visibility = publication(body),
            details = description(body);
        return transaction(owner, async (c, user) => {
            if (visibility === 'publico' && !publisher(user))
                fail(403, 'Somente professores ou administradores podem publicar materiais.');
            const folder = await ownedFolder(c, owner, body.id_pasta);
            const [[usage]] = await c.execute(
                'SELECT COUNT(*) AS count, COALESCE(SUM(tamanho),0) AS used FROM documento_itens WHERE id_usuario = ?',
                [owner]
            );
            const [[savedCount]] = await c.execute(
                'SELECT COUNT(*) AS count FROM documento_salvos WHERE id_usuario = ?',
                [owner]
            );
            if (Number(usage.count) + Number(savedCount.count) >= LIMITS.items)
                fail(409, 'Limite de 500 documentos atingido.');
            if (info) {
                const [locks] = await c.execute(
                    'SELECT id FROM documento_armazenamento WHERE id = 1 FOR UPDATE'
                );
                if (!locks.length) fail(503, 'O armazenamento precisa ser habilitado.');
                const [sizes] = await c.execute('SELECT tamanho FROM documento_itens FOR UPDATE');
                const total = { used: sizes.reduce((n, row) => n + Number(row.tamanho), 0) };
                if (Number(usage.used) + info.size > LIMITS.user)
                    fail(409, 'Seu espaço de 20 MB está cheio.');
                if (Number(total.used) + info.size > LIMITS.total)
                    fail(
                        409,
                        'O espaço de arquivos do portal está cheio. Entre em contato com a equipe.'
                    );
            }
            const [result] = await c.execute(
                'INSERT INTO documento_itens (id_usuario, id_pasta, titulo, descricao, visibilidade, tipo, url, nome_arquivo, mime, tamanho, conteudo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    owner,
                    folder,
                    title,
                    details,
                    visibility,
                    info ? 'arquivo' : 'link',
                    link,
                    info?.name || null,
                    info?.mime || null,
                    info?.size || 0,
                    buffer || null
                ]
            );
            return { id_item: result.insertId };
        });
    }
    async function item(connection, owner, key, binary = false) {
        const [rows] = await connection.execute(
            `SELECT ${columns}${binary ? ', conteudo' : ''} FROM documento_itens WHERE id_item = ? AND id_usuario = ? FOR UPDATE`,
            [id(key), owner]
        );
        if (!rows.length) fail(404, 'Documento não encontrado.');
        return rows[0];
    }
    async function update(owner, key, body) {
        return transaction(owner, async (c, user) => {
            const current = await item(c, owner, key);
            const visibility = publication(body, current),
                details = description(body, current);
            if (visibility === 'publico' && !publisher(user))
                fail(403, 'Somente professores ou administradores podem publicar materiais.');
            const title = text(body.titulo ?? current.titulo, 150, 'Título');
            const folder = await ownedFolder(
                c,
                owner,
                Object.hasOwn(body, 'id_pasta') ? body.id_pasta : current.id_pasta
            );
            const link = current.tipo === 'link' ? url(body.url ?? current.url) : null;
            await c.execute(
                "UPDATE documento_itens SET titulo = ?, descricao = ?, visibilidade = ?, id_pasta = ?, url = ?, revisao = 'nenhuma', versao_revisao = versao_revisao + 1, motivo_revisao = NULL, enviado_em = NULL, revisado_em = NULL, revisado_por = NULL WHERE id_item = ? AND id_usuario = ?",
                [title, details, visibility, folder, link, id(key), owner]
            );
        });
    }
    async function remove(owner, key) {
        return transaction(owner, async (c) => {
            await item(c, owner, key);
            await c.execute('DELETE FROM documento_itens WHERE id_item = ? AND id_usuario = ?', [
                id(key),
                owner
            ]);
        });
    }
    async function publicList() {
        const [items] = await database.execute(
            `SELECT i.id_item, i.titulo, i.descricao, i.tipo, i.url, i.nome_arquivo, i.mime, i.tamanho, i.criado_em, i.atualizado_em, u.nome AS autor FROM documento_itens i JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE i.visibilidade = 'publico' AND ${publicAuthor} ORDER BY i.atualizado_em DESC, i.id_item DESC`
        );
        return items;
    }
    async function download(owner, key) {
        const [items] = await database.execute(
            `SELECT i.nome_arquivo, i.mime, i.tipo, i.conteudo FROM documento_itens i JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE i.id_item = ? AND (i.id_usuario = ? OR (i.visibilidade = 'publico' AND ${publicAuthor}))`,
            [id(key), owner]
        );
        if (!items.length) fail(404, 'Documento não encontrado.');
        return items[0];
    }
    async function savedList(owner) {
        const [rows] = await database.execute(
            `SELECT s.id_salvo, s.id_pasta, i.id_item, i.titulo, i.descricao, i.tipo, i.url, i.nome_arquivo, i.mime, i.tamanho, u.nome AS autor FROM documento_salvos s LEFT JOIN documento_itens i ON i.id_item = s.id_item AND i.visibilidade = 'publico' AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id_usuario = i.id_usuario AND ${publicAuthor}) LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE s.id_usuario = ? ORDER BY s.criado_em DESC`,
            [owner]
        );
        return rows.map((row) => ({ ...row, reference: true }));
    }
    async function savePublic(owner, key, body = {}) {
        return transaction(owner, async (c) => {
            const folder = await ownedFolder(c, owner, body.id_pasta);
            const [sources] = await c.execute(
                `SELECT i.id_item, i.id_usuario FROM documento_itens i WHERE i.id_item = ? AND i.visibilidade = 'publico' AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id_usuario = i.id_usuario AND ${publicAuthor}) FOR UPDATE`,
                [id(key)]
            );
            if (!sources.length) fail(404, 'Material público indisponível.');
            if (sources[0].id_usuario === owner)
                fail(409, 'Esse material já está na sua biblioteca.');
            const [[count]] = await c.execute(
                'SELECT ((SELECT COUNT(*) FROM documento_itens WHERE id_usuario = ?) + (SELECT COUNT(*) FROM documento_salvos WHERE id_usuario = ?)) AS count',
                [owner, owner]
            );
            if (Number(count.count) >= LIMITS.items)
                fail(409, 'Limite de 500 documentos atingido.');
            await c.execute(
                'INSERT INTO documento_salvos (id_usuario, id_item, id_pasta) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id_pasta = VALUES(id_pasta)',
                [owner, id(key), folder]
            );
        });
    }
    async function changeSaved(owner, key, body) {
        return transaction(owner, async (c) => {
            const [rows] = await c.execute(
                'SELECT id_salvo FROM documento_salvos WHERE id_salvo = ? AND id_usuario = ? FOR UPDATE',
                [id(key), owner]
            );
            if (!rows.length) fail(404, 'Documento salvo não encontrado.');
            if (body === null)
                await c.execute(
                    'DELETE FROM documento_salvos WHERE id_salvo = ? AND id_usuario = ?',
                    [id(key), owner]
                );
            else {
                const folder = await ownedFolder(c, owner, body.id_pasta);
                await c.execute(
                    'UPDATE documento_salvos SET id_pasta = ? WHERE id_salvo = ? AND id_usuario = ?',
                    [folder, id(key), owner]
                );
            }
        });
    }
    async function submit(owner, key) {
        return transaction(owner, async (c) => {
            const current = await item(c, owner, key);
            if (current.visibilidade !== 'privado')
                fail(409, 'Somente documentos privados podem ser enviados para avaliação.');
            if (current.revisao === 'pendente') fail(409, 'O documento já está em avaliação.');
            await c.execute(
                "UPDATE documento_itens SET revisao = 'pendente', versao_revisao = versao_revisao + 1, motivo_revisao = NULL, enviado_em = NOW(), revisado_em = NULL, revisado_por = NULL WHERE id_item = ? AND id_usuario = ?",
                [id(key), owner]
            );
        });
    }
    async function reviewList(owner) {
        const [users] = await database.execute(
            'SELECT is_admin FROM usuarios WHERE id_usuario = ?',
            [owner]
        );
        if (!(users[0]?.is_admin === 1 || users[0]?.is_admin === true))
            fail(403, 'Somente administradores avaliam publicações.');
        const [rows] = await database.execute(
            "SELECT i.id_item, i.titulo, i.descricao, i.tipo, i.url, i.nome_arquivo, i.tamanho, i.enviado_em, i.versao_revisao, u.nome AS autor FROM documento_itens i JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE i.revisao = 'pendente' AND u.situacao = 'ativo' ORDER BY i.enviado_em, i.id_item"
        );
        return rows;
    }
    async function review(owner, key, body) {
        if (!Number.isSafeInteger(body.versao) || body.versao < 1)
            fail(400, 'Atualize a lista antes de avaliar este documento.');
        if (!['aprovar', 'recusar'].includes(body.decisao)) fail(400, 'Decisão inválida.');
        const reason =
            body.decisao === 'recusar' ? text(body.motivo, 1000, 'Motivo da recusa') : null;
        return transaction(owner, async (c, user) => {
            if (!(user.is_admin === 1 || user.is_admin === true))
                fail(403, 'Somente administradores avaliam publicações.');
            const [rows] = await c.execute(
                'SELECT id_item, revisao, versao_revisao FROM documento_itens WHERE id_item = ? FOR UPDATE',
                [id(key)]
            );
            if (!rows.length) fail(404, 'Documento não encontrado.');
            if (rows[0].revisao !== 'pendente' || Number(rows[0].versao_revisao) !== body.versao)
                fail(409, 'O documento não está mais em avaliação.');
            const approved = body.decisao === 'aprovar';
            await c.execute(
                'UPDATE documento_itens SET revisao = ?, visibilidade = ?, motivo_revisao = ?, revisado_por = ?, revisado_em = NOW() WHERE id_item = ?',
                [
                    approved ? 'aprovado' : 'recusado',
                    approved ? 'publico' : 'privado',
                    reason,
                    owner,
                    id(key)
                ]
            );
        });
    }
    async function reviewDownload(owner, key) {
        const [users] = await database.execute(
            'SELECT is_admin FROM usuarios WHERE id_usuario = ?',
            [owner]
        );
        if (!(users[0]?.is_admin === 1 || users[0]?.is_admin === true))
            fail(403, 'Somente administradores avaliam publicações.');
        const [rows] = await database.execute(
            "SELECT nome_arquivo, mime, tipo, conteudo FROM documento_itens WHERE id_item = ? AND revisao = 'pendente'",
            [id(key)]
        );
        if (!rows.length) fail(404, 'Documento não encontrado.');
        return rows[0];
    }
    return {
        list,
        publicList,
        saveFolder,
        removeFolder,
        create,
        update,
        remove,
        download,
        savePublic,
        changeSaved,
        submit,
        reviewList,
        review,
        reviewDownload
    };
}
module.exports = { createLibrary, fileInfo, url, LIMITS };
