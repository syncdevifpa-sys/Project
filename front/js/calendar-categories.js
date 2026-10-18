/* Catálogo visual reduzido; os tipos antigos continuam válidos no banco. */
(function (root) {
    'use strict';
    const groups = {
        evento: {
            label: 'Eventos',
            color: '#176b9a',
            description: 'Eventos gerais e compromissos que não pertencem às demais categorias.'
        },
        atividades_campus: {
            label: 'Atividades do Campus',
            color: '#c99a16',
            description:
                'Encontros, eventos acadêmicos, culturais e esportivos, sábados letivos e comemorações.'
        },
        matricula: {
            label: 'Matrículas',
            color: '#3766c0',
            description: 'Matrícula, rematrícula e ajustes de vínculo acadêmico.'
        },
        registro_academico: {
            label: 'Prazos e registros acadêmicos',
            color: '#8652b3',
            description:
                'Disciplinas, notas, editais e datas de início e término dos períodos letivos.'
        },
        avaliacao: {
            label: 'Avaliações',
            color: '#1697a6',
            description: 'Provas, exames e culminância das atividades do bimestre.'
        },
        feriado: {
            label: 'Feriados',
            color: '#c43b3b',
            description:
                'Feriados nacionais, estaduais e municipais, conforme a abrangência escolhida.'
        },
        ponto_facultativo: {
            label: 'Pontos facultativos',
            color: '#b84a52',
            description:
                'Dispensa de expediente definida em ato específico; não equivale automaticamente a feriado.'
        },
        ferias: {
            label: 'Férias e recessos',
            color: '#ce7927',
            description:
                'Férias acadêmicas, férias docentes e recessos. Confira no evento a quem se aplica.'
        },
        cancelamento: {
            label: 'Alterações e cancelamentos',
            color: '#65778d',
            description:
                'Mudanças, cancelamentos e interrupções presenciais. Confira quais atividades são afetadas.'
        }
    };
    const aliases = {
        sabado_letivo: 'atividades_campus',
        aniversario: 'atividades_campus',
        edital: 'registro_academico',
        periodo_academico: 'registro_academico',
        culminancia_bimestral: 'avaliacao',
        recesso: 'ferias',
        ferias_docentes: 'ferias',
        interrupcao_presencial: 'cancelamento'
    };
    const canonical = (value) =>
        Object.hasOwn(groups, value) ? value : aliases[value] || 'evento';
    const options = Object.fromEntries(
        Object.entries(groups).map(([key, value]) => [key, value.label])
    );
    const api = { groups, aliases, canonical, options };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.Arcadia = root.Arcadia || {}).calendarCategories = api;
})(typeof window === 'undefined' ? {} : window);
