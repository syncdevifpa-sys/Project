const db = require('../config/database');
async function hasNoticeType() {
    const [columns] = await db.execute("SHOW COLUMNS FROM avisos LIKE 'tipo_publicacao'");
    return columns.some(column => column.Field === 'tipo_publicacao');
}
async function writableType(type = 'aviso') {
    const available = await hasNoticeType();
    if (!available && type !== 'aviso') throw Object.assign(new Error('O tipo Notícia ainda não está habilitado neste ambiente. Solicite a atualização à administração; seus dados não foram alterados.'), { status: 409 });
    return available;
}
async function hasNoticeCover() {
    const [columns] = await db.execute("SHOW COLUMNS FROM avisos LIKE 'capa'");
    return columns.some(column => column.Field === 'capa');
}
async function writableCover(cover) {
    const available = await hasNoticeCover();
    if (!available && cover) throw Object.assign(new Error('Execute add-notice-cover.sql no banco para habilitar imagens de capa.'), { status: 409 });
    return available;
}
module.exports = { hasNoticeType, writableType, hasNoticeCover, writableCover };
