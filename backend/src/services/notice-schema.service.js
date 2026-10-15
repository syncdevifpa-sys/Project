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
module.exports = { hasNoticeType, writableType };
