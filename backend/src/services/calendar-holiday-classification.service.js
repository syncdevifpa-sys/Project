/* Nome, data e abrangência precisam coincidir; uma atividade no feriado não vira feriado. */
const { forYear } = require('../../../front/js/calendar-holidays');
const normalize = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
const names = {
    '01-01': /^(confraternizacao universal|ano[- ]novo|reveillon)$/,
    '04-21': /^tiradentes$/,
    '05-01': /^dia (?:mundial )?do trabalh(?:o|ador)$/,
    '08-15': /^adesao (?:do (?:grao-?)?para|a independencia do brasil)$/,
    '09-07': /^independencia do brasil$/,
    '10-12': /^nossa senhora (?:de )?aparecida(?: - padroeira do brasil)?$/,
    '11-02': /^(?:dia de )?finados$/,
    '11-15': /^proclamacao da republica$/,
    '11-20': /^(?:dia (?:nacional )?(?:de zumbi e )?da )?consciencia negra$/,
    '12-08': /^(?:imaculada conceicao|nossa senhora da conceicao)$/,
    '12-25': /^natal$/
};
function classifyHoliday(title, date, region = 'brasil') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    const value = normalize(title).replace(/^feriado (?:de |do |da )?/, '');
    const year = Number(date.slice(0, 4));
    const holiday = forYear(year, region).find((item) => item.data_evento === date);
    if (
        holiday &&
        (names[date.slice(5)]?.test(value) ||
            (holiday.titulo === 'Sexta-feira da Paixão' &&
                /^(sexta[- ]feira (?:da )?(?:paixao|santa)|paixao de cristo)$/.test(value)) ||
            (holiday.titulo === 'Corpus Christi' && /^corpus christi$/.test(value)))
    )
        return { kind: 'sem_aula', categoria: 'feriado' };
    const optional2026 = {
        '2026-02-16': /^carnaval$/,
        '2026-02-17': /^carnaval$/,
        '2026-02-18': /^(?:quarta[- ]feira de )?cinzas$/,
        '2026-10-28': /^dia do servidor publico(?: federal)?$/
    };
    if (optional2026[date]?.test(value))
        return { kind: 'sem_aula', categoria: 'ponto_facultativo' };
    return null;
}
module.exports = { classifyHoliday };
