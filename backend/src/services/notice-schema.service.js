const db = require('../config/database');
async function hasNoticeType() {
    const [columns] = await db.execute("SHOW COLUMNS FROM avisos LIKE 'tipo_publicacao'");
    return columns.some((column) => column.Field === 'tipo_publicacao');
}
async function writableType(type = 'aviso') {
    const available = await hasNoticeType();
    if (!available && type !== 'aviso')
        throw Object.assign(
            new Error(
                'O banco ainda não permite salvar Notícias. A administração precisa executar add-notice-type.sql (ou update-notice-publishing.sql). Seus dados continuam no formulário.'
            ),
            { status: 409 }
        );
    return available;
}
async function hasNoticeCover() {
    const [columns] = await db.execute("SHOW COLUMNS FROM avisos LIKE 'capa'");
    return columns.some((column) => column.Field === 'capa');
}
async function writableCover(cover) {
    const available = await hasNoticeCover();
    if (!available && cover)
        throw Object.assign(
            new Error('Execute add-notice-cover.sql no banco para habilitar imagens de capa.'),
            { status: 409 }
        );
    return available;
}
async function writableAudience(value = 'todos') {
    if (!String(value).includes(',')) return;
    const [columns] = await db.execute("SHOW COLUMNS FROM avisos LIKE 'publico_alvo'");
    if (
        !columns.some(
            (column) => column.Field === 'publico_alvo' && /^set\(/i.test(column.Type || '')
        )
    )
        throw Object.assign(
            new Error(
                'Execute update-notice-publishing.sql no banco para permitir mais de um público-alvo. Seus dados continuam no formulário.'
            ),
            { status: 409 }
        );
}
module.exports = { hasNoticeType, writableType, hasNoticeCover, writableCover, writableAudience };
