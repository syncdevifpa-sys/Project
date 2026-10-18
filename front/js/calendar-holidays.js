/* Datas anuais calculadas na consulta, sem criar cópias no banco. */
(function (root) {
    'use strict';
    const source = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm';
    const fixed = [
        ['01-01', 'Confraternização Universal', source],
        ['04-21', 'Tiradentes', source],
        ['05-01', 'Dia do Trabalho', source],
        ['09-07', 'Independência do Brasil', source],
        [
            '10-12',
            'Nossa Senhora Aparecida',
            'https://www.planalto.gov.br/ccivil_03/leis/l6802.htm'
        ],
        ['11-02', 'Finados', source],
        ['11-15', 'Proclamação da República', source],
        [
            '11-20',
            'Dia Nacional de Zumbi e da Consciência Negra',
            'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm'
        ],
        ['12-25', 'Natal', source]
    ];
    function easter(year) {
        const a = year % 19,
            b = Math.floor(year / 100),
            c = year % 100;
        const d = Math.floor(b / 4),
            e = b % 4,
            f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3),
            h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4),
            k = c % 4,
            l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451),
            n = h + l - 7 * m + 114;
        return new Date(Date.UTC(year, Math.floor(n / 31) - 1, (n % 31) + 1));
    }
    function forYear(year, region = 'brasil') {
        year = Number(year);
        if (!Number.isInteger(year) || year < 2024 || year > 2099) return [];
        const entries = fixed.map(([day, title, url]) => [year + '-' + day, title, url, 'Brasil']);
        const passion = easter(year);
        passion.setUTCDate(passion.getUTCDate() - 2);
        entries.push([
            passion.toISOString().slice(0, 10),
            'Sexta-feira da Paixão',
            'https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026',
            'Calendário federal · data religiosa'
        ]);
        if (['para', 'belem'].includes(region))
            entries.push([
                year + '-08-15',
                'Adesão do Pará',
                'https://alepa.pa.gov.br/Comunicacao/Noticia/8982',
                'Pará'
            ]);
        if (region === 'belem')
            entries.push([
                year + '-12-08',
                'Nossa Senhora da Conceição',
                'https://www.gov.br/ans/pt-br/assuntos/noticias/periodo-eleitoral/ponto-facultativo-em-belem-pa/dom_140222FeriadosePontosFacultativosde2022.pdf',
                'Belém'
            ]);
        if (region === 'belem') {
            const corpus = easter(year);
            corpus.setUTCDate(corpus.getUTCDate() + 60);
            entries.push([
                corpus.toISOString().slice(0, 10),
                'Corpus Christi',
                'https://licitacao.infraero.gov.br/arquivos_licitacao/2012/SRSP/012_ADSP-4_SRSP_2012_PG-e/Recurso%20Paleta%20Manual%20Feriado-08-03.pdf',
                'Belém · feriado municipal'
            ]);
        }
        return entries
            .map(([date, title, url, area]) => ({
                id_evento: 'feriado-' + date,
                titulo: title,
                categoria: 'feriado',
                data_evento: date,
                periodo_letivo: 'Feriados anuais',
                automatico: true,
                descricao:
                    area +
                    ' · Exibição automática anual. Conferência das regras: 18/10/2026. Fonte: ' +
                    url
            }))
            .sort((a, b) => a.data_evento.localeCompare(b.data_evento));
    }
    const normalized = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    function sameHoliday(event, holiday) {
        const title = normalized(event.titulo);
        const aliases = {
            '05-01': /dia do trabalh(?:o|ador)/,
            '10-12': /aparecida/,
            '11-20': /consciencia negra/,
            '12-08': /conceicao/
        };
        return (
            event.categoria === 'feriado' ||
            title.includes(normalized(holiday.titulo)) ||
            Boolean(aliases[holiday.data_evento.slice(5)]?.test(title))
        );
    }
    function merge(saved, year, region) {
        return [
            ...saved,
            ...forYear(year, region).filter(
                (holiday) =>
                    !saved.some(
                        (event) =>
                            sameHoliday(event, holiday) &&
                            String(event.data_evento).slice(0, 10) <= holiday.data_evento &&
                            String(event.data_fim || event.data_evento).slice(0, 10) >=
                                holiday.data_evento
                    )
            )
        ].sort((a, b) => String(a.data_evento).localeCompare(String(b.data_evento)));
    }
    const api = { forYear, merge, easter };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.Arcadia = root.Arcadia || {}).calendarHolidays = api;
})(typeof window === 'undefined' ? {} : window);
