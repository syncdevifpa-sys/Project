/* Durações do catálogo oficial: consulta local, sem alterar o banco nem inferir pelo nome. */
const catalog = require('../../catalog/belem-courses-2026.json');
const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const index = new Map(catalog.courses.map(course => [key(course.nome), course.duracao]));
function enrich(course) {
    if (!course) return course;
    const duration = index.get(key(course.nome));
    if (!duration) return course;
    const result = { ...course, duracao_fonte: duration.fonte };
    if (duration.meses) {
        const years = Math.floor(duration.meses / 12), months = duration.meses % 12;
        result.duracao_texto = [years ? years + (years === 1 ? ' ano' : ' anos') : '', months ? months + ' meses' : ''].filter(Boolean).join(' e ');
        /* A configuração explícita da administração prevalece sobre a referência do catálogo. */
        if (course.regime_etapas == null && course.total_etapas == null) {
            result.regime_etapas = duration.regime_etapas;
            result.total_etapas = duration.total_etapas;
        }
    } else if (duration.minimo_meses) result.duracao_texto = duration.minimo_meses + ' a ' + duration.maximo_meses + ' meses';
    else result.duracao_texto = 'Duração a confirmar';
    return result;
}
module.exports = { enrich };
