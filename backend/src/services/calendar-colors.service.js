/* Geometria e legendas: a cor só é aplicada quando todos os dias são inequívocos. */
// Reconhece somente células vetoriais e legendas próximas, dentro da modalidade.
const norm = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
const months = [
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
];
const DAY = 86400000;
function fail(message) {
    throw Object.assign(new Error(message), { status: 422 });
}
function filledRectangles(list, OPS) {
    if (list.fnArray.length > 200000) fail('Página com muitos elementos gráficos. Divida o PDF.');
    const shapes = [],
        stack = [];
    let state = { color: '#000000', matrix: [1, 0, 0, 1, 0, 0] };
    const multiply = (a, b) => [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5]
    ];
    const paints = [
        OPS.fill,
        OPS.eoFill,
        OPS.fillStroke,
        OPS.eoFillStroke,
        OPS.closeFillStroke,
        OPS.closeEOFillStroke
    ].filter((value) => value !== undefined);
    for (let index = 0; index < list.fnArray.length; index++) {
        const fn = list.fnArray[index],
            args = list.argsArray[index];
        if (fn === OPS.save) stack.push({ ...state, matrix: [...state.matrix] });
        else if (fn === OPS.restore) state = stack.pop() || state;
        else if (fn === OPS.transform) state.matrix = multiply(state.matrix, args);
        else if (fn === OPS.setFillRGBColor)
            state.color = typeof args[0] === 'string' ? args[0].toLowerCase() : null;
        else if (fn === OPS.constructPath && paints.includes(args[0])) {
            // Uma bounding box conjunta de vários caminhos pode cobrir células de outras cores.
            for (const p of args[1] || []) {
                if (
                    p.length !== 13 ||
                    p[0] !== 0 ||
                    p[3] !== 1 ||
                    p[6] !== 1 ||
                    p[9] !== 1 ||
                    p[12] !== 4
                )
                    continue;
                const points = [
                    [p[1], p[2]],
                    [p[4], p[5]],
                    [p[7], p[8]],
                    [p[10], p[11]]
                ];
                if (
                    points.some((point, i) => {
                        const next = points[(i + 1) % 4];
                        return (
                            Math.abs(point[0] - next[0]) > 0.01 &&
                            Math.abs(point[1] - next[1]) > 0.01
                        );
                    })
                )
                    continue;
                const m = state.matrix;
                if (
                    Math.abs(m[1]) > 0.01 ||
                    Math.abs(m[2]) > 0.01 ||
                    !/^#[0-9a-f]{6}$/.test(state.color || '')
                )
                    continue;
                const transformed = points.map(([x, y]) => [m[0] * x + m[4], m[3] * y + m[5]]);
                const x = Math.min(...transformed.map((p) => p[0])),
                    y = Math.min(...transformed.map((p) => p[1]));
                const width = Math.max(...transformed.map((p) => p[0])) - x,
                    height = Math.max(...transformed.map((p) => p[1])) - y;
                if (width >= 6 && width <= 80 && height >= 6 && height <= 30)
                    shapes.push({ x, y, width, height, color: state.color });
            }
        }
    }
    return shapes;
}
function classify(text) {
    const value = norm(text);
    if (/feriad|facultativ/.test(value)) return { kind: 'sem_aula', categoria: 'feriado' };
    if (/ferias/.test(value)) return { kind: 'sem_aula', categoria: 'cancelamento' };
    if (/sabados? letivos?/.test(value)) return { kind: 'letivo', categoria: 'evento' };
    if (/inicio.*termino/.test(value)) return { kind: 'limite_letivo', categoria: 'evento' };
    if (/avaliac|bimestra/.test(value)) return { kind: 'avaliacao', categoria: 'evento' };
    if (/encontros? pedagogic|eventos? academic|atividades do campus/.test(value))
        return { kind: 'evento', categoria: 'evento' };
    return null;
}
const contains = (rect, x, y) =>
    x >= rect.x - 0.5 &&
    x <= rect.x + rect.width + 0.5 &&
    y >= rect.y - 0.5 &&
    y <= rect.y + rect.height + 0.5;
function pageLevel(items) {
    const heading = [...items]
        .sort((a, b) => b.y - a.y)
        .find((i) =>
            /^(educacao basica(?: e profissional)?|(?:ensino (?:de )?)?(?:graduacao|superior)|(?:ensino (?:de )?)?pos[- ]graduacao)$/.test(
                norm(i.text)
            )
        );
    return heading
        ? norm(heading.text).includes('basica')
            ? 'basica'
            : norm(heading.text).includes('pos')
              ? 'pos'
              : 'graduacao'
        : null;
}
function extractColoredDays(pages, { year, level }) {
    const legend = new Map(),
        conflicts = new Set(),
        scoped = [];
    let current = 'geral';
    for (const page of pages) {
        current = pageLevel(page.items) || current;
        if (current !== level) continue;
        scoped.push(page);
        for (const marker of page.items.filter((i) => /^legendas?:?$/.test(norm(i.text)))) {
            for (const box of page.fills || []) {
                // Exclui quadros estatísticos: a amostra deve ser curta, junto ao marcador.
                if (
                    box.y >= marker.y ||
                    box.y < marker.y - 125 ||
                    Math.abs(box.x - marker.x) > 12 ||
                    box.width < 12 ||
                    box.width > 40
                )
                    continue;
                const words = page.items
                    .filter(
                        (i) =>
                            i.x >= box.x + box.width - 1 &&
                            Math.abs(i.y + (i.height || 8) / 2 - (box.y + box.height / 2)) < 5
                    )
                    .sort((a, b) => a.x - b.x);
                const text = words
                    .map((i) => i.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                const type = classify(text);
                if (!type || text.length > 500) continue;
                const previous = legend.get(box.color);
                if (
                    previous &&
                    (previous.kind !== type.kind ||
                        previous.categoria !== type.categoria ||
                        norm(previous.text) !== norm(text))
                )
                    conflicts.add(box.color);
                else legend.set(box.color, { text, ...type, page: page.number });
            }
        }
    }
    for (const color of conflicts) legend.delete(color);
    const cellsByDate = new Map();
    let contextYear = year,
        lastMonth = 0;
    for (const page of scoped) {
        const anchors = page.items
            .map((item) => {
                const match = norm(item.text).match(/^([a-z]+)(?:\s*\/\s*(20\d{2}))?$/);
                if (!match || !months.includes(match[1])) return null;
                const right = page.items
                    .filter(
                        (j) =>
                            Math.abs(j.y - item.y) < 2 &&
                            j.x >= item.x + item.width - 1 &&
                            j.x < item.x + item.width + 65
                    )
                    .sort((a, b) => a.x - b.x);
                const suffix = right
                    .map((j) => j.text)
                    .join('')
                    .replace(/\s/g, '')
                    .match(/^\/?(20\d{2})/);
                const explicitYear = Number(match[2] || suffix?.[1]) || null;
                const tail = right.filter((j) => j.text.trim()).at(-1);
                const width =
                    explicitYear && tail
                        ? Math.max(item.width, tail.x + tail.width - item.x)
                        : item.width;
                return {
                    ...item,
                    month: months.indexOf(match[1]) + 1,
                    year: explicitYear,
                    center: item.x + width / 2
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.y - a.y || a.x - b.x);
        for (const anchor of anchors) {
            if (anchor.year) contextYear = anchor.year;
            else if (lastMonth && anchor.month < lastMonth) contextYear = null;
            lastMonth = anchor.month;
            if (!contextYear) continue;
            const peers = anchors.filter((a) => Math.abs(a.y - anchor.y) < 3);
            const spacing =
                peers.length > 1
                    ? Math.min(
                          ...peers
                              .filter((a) => a !== anchor)
                              .map((a) => Math.abs(a.center - anchor.center))
                      )
                    : 180;
            const digits = page.items.filter(
                (i) =>
                    /^\d{1,2}$/.test(i.text.trim()) &&
                    i.y < anchor.y - 12 &&
                    i.y > anchor.y - 110 &&
                    Math.abs(i.x + i.width / 2 - anchor.center) < spacing / 2
            );
            const dayCells = new Map();
            for (const digit of digits) {
                const x = digit.x + digit.width / 2,
                    y = digit.y + (digit.height || 8) / 2;
                const covering = (page.fills || []).filter((r) => contains(r, x, y));
                const cell = covering.at(-1);
                if (!cell) continue;
                const outer =
                    covering
                        .filter((r) => r.width <= spacing / 6)
                        .sort((a, b) => b.width * b.height - a.width * a.height)[0] || cell;
                const key = [outer.x, outer.y, outer.width, outer.height]
                    .map((value) => value.toFixed(2))
                    .join('|');
                if (!dayCells.has(key)) dayCells.set(key, { items: [], colors: new Set(), cell });
                const group = dayCells.get(key);
                group.colors.add(cell.color);
                if (
                    !group.items.some((i) => Math.abs(i.x - digit.x) < 0.1 && i.text === digit.text)
                )
                    group.items.push(digit);
            }
            for (const group of dayCells.values()) {
                // O PDF pode armazenar "22" como dois glifos "2" na mesma célula.
                const number = group.items
                    .sort((a, b) => a.x - b.x)
                    .map((i) => i.text.trim())
                    .join('');
                if (!/^\d{1,2}$/.test(number)) continue;
                const cell = group.cell;
                const iso = `${contextYear}-${String(anchor.month).padStart(2, '0')}-${number.padStart(2, '0')}`;
                if (
                    !Number.isFinite(Date.parse(iso)) ||
                    new Date(iso).toISOString().slice(0, 10) !== iso
                )
                    continue;
                const previous = cellsByDate.get(iso);
                const ambiguous =
                    previous?.ambiguous ||
                    group.colors.size > 1 ||
                    Boolean(previous && previous.color !== cell.color);
                cellsByDate.set(iso, {
                    date: iso,
                    color: cell.color,
                    page: page.number,
                    ambiguous
                });
            }
        }
    }
    const cells = [...cellsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    const days = cells
        .filter((cell) => !cell.ambiguous && legend.has(cell.color))
        .map((cell) => ({ ...cell, ...legend.get(cell.color), page: cell.page }));
    return {
        level,
        days,
        cells,
        legend: [...legend].map(([color, value]) => ({ color, ...value })),
        conflictingColors: [...conflicts]
    };
}
function textMeaning(title, date = '') {
    const value = norm(title);
    const monthDay = date.slice(5);
    if (
        (monthDay === '12-25' && /^(?:natal|feriado de natal)(?:\s*[-–—:(]|$)/.test(value)) ||
        (monthDay === '01-01' &&
            /^(?:confraternizacao universal|ano[- ]novo|reveillon)(?:\s*[-–—:(]|$)/.test(value))
    )
        return { kind: 'sem_aula', categoria: 'feriado' };
    // A portaria federal de 2026 prevê expediente facultativo após as 13h nas vésperas.
    // Não presume que essa regra administrativa se repita em outros anos.
    if (
        date.startsWith('2026-') &&
        ((monthDay === '12-24' && /^vespera (?:de|do) natal\b/.test(value)) ||
            (monthDay === '12-31' &&
                /^(?:vespera (?:de|do) (?:ano[- ]novo|reveillon)|reveillon)(?:\s*[-–—:(]|$)/.test(
                    value
                )))
    )
        return { kind: 'sem_aula', categoria: 'ponto_facultativo' };
    if (/interrupcao.*aulas presenciais/.test(value))
        return { kind: 'interrupcao_presencial', categoria: 'evento' };
    if (/^ferias.*docent/.test(value)) return { kind: 'ferias_docentes', categoria: 'evento' };
    if (/\bferiado\b|\bfacultad[oa]\b|\bfacultativo\b/.test(value))
        return { kind: 'sem_aula', categoria: 'feriado' };
    if (/^ferias\b/.test(value)) return { kind: 'sem_aula', categoria: 'cancelamento' };
    return null;
}
function validRange(candidate) {
    for (const value of [candidate.data_evento, candidate.data_fim || candidate.data_evento]) {
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(value || '') ||
            !Number.isFinite(Date.parse(value)) ||
            new Date(value).toISOString().slice(0, 10) !== value
        )
            return null;
    }
    const start = Date.parse(candidate.data_evento),
        end = Date.parse(candidate.data_fim || candidate.data_evento);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start
        ? { start, end, length: Math.round((end - start) / DAY) + 1 }
        : null;
}
function mergeColorCandidates(parsed, analysis) {
    const candidates = parsed.candidates;
    const note = (candidate, message) => {
        candidate.sourceText = `${message} | ${candidate.sourceText || ''}`;
    };
    const warn = (candidate, message, reason = 'classification') => {
        candidate.warning.push(message);
        candidate.needsIndividualReview = true;
        if (candidate.reviewReason !== 'classification') candidate.reviewReason = reason;
    };
    for (const candidate of candidates) {
        candidate.warning = candidate.warning || [];
        candidate.sourcePages = candidate.sourcePages || [candidate.page];
        const meaning = textMeaning(
            candidate.titulo,
            !candidate.data_fim || candidate.data_fim === candidate.data_evento
                ? candidate.data_evento
                : ''
        );
        if (meaning) {
            candidate.natureza = meaning.kind;
            candidate.categoria = meaning.categoria;
            note(
                candidate,
                meaning.kind === 'interrupcao_presencial'
                    ? 'O texto informa interrupção das aulas presenciais, sem comprovar suspensão de todas as atividades.'
                    : meaning.kind === 'ferias_docentes'
                      ? 'O texto informa férias de docentes, sem comprovar suspensão de todas as aulas.'
                      : 'Sem aula conforme a descrição do evento; confira o alcance no PDF.'
            );
            if (meaning.categoria === 'ponto_facultativo')
                note(
                    candidate,
                    'Véspera em 2026: ponto facultativo federal após as 13h, conforme Portaria MGI nº 11.460/2025; confira a aplicação no Campus.'
                );
        }
        const range = validRange(candidate);
        if (!range) {
            candidate.needsIndividualReview = true;
            candidate.reviewReason = 'date';
            continue;
        }
        const matching = analysis.days.filter(
            (d) =>
                d.date >= candidate.data_evento &&
                d.date <= (candidate.data_fim || candidate.data_evento)
        );
        const unique = [...new Set(matching.map((d) => d.color))];
        const full =
            unique.length === 1 && new Set(matching.map((d) => d.date)).size === range.length;
        const uncertainCells = (analysis.cells || []).some((cell) => {
            if (
                cell.date < candidate.data_evento ||
                cell.date > (candidate.data_fim || candidate.data_evento)
            )
                return false;
            if (cell.ambiguous) return true;
            if (analysis.legend.some((item) => item.color === cell.color)) return false;
            const rgb = /^#[0-9a-f]{6}$/i.test(cell.color)
                ? [1, 3, 5].map((index) => parseInt(cell.color.slice(index, index + 2), 16))
                : [];
            return rgb.length && Math.max(...rgb) - Math.min(...rgb) > 15;
        });
        const day = matching[0];
        const conflict =
            full && meaning && (meaning.kind !== day.kind || meaning.categoria !== day.categoria);
        if (full && !conflict) {
            candidate.cor = day.color;
            candidate.natureza = day.kind;
            candidate.legenda = day.text;
            candidate.categoria = day.categoria;
            note(
                candidate,
                `Legenda de cor em todos os dias do período: ${day.text} (${day.color}). ${day.kind === 'sem_aula' ? 'Sem aula conforme a legenda.' : 'A cor não indica suspensão das aulas.'}`
            );
        } else if (
            matching.length ||
            uncertainCells ||
            ['interrupcao_presencial', 'ferias_docentes'].includes(meaning?.kind)
        ) {
            warn(
                candidate,
                conflict
                    ? 'A cor conflita com a descrição. Confira o evento individualmente.'
                    : 'Cores diferentes, ausentes ou sem legenda em parte do período. Não foi aplicada uma cor ao evento inteiro; confira a cor separadamente.',
                conflict || ['interrupcao_presencial', 'ferias_docentes'].includes(meaning?.kind)
                    ? 'classification'
                    : 'color'
            );
        }
    }
    const runs = [];
    for (const day of analysis.days) {
        // Não cria outra ocorrência genérica quando uma descrição compatível já cobre o dia.
        const covered = candidates.some(
            (c) =>
                c.data_evento <= day.date &&
                (c.data_fim || c.data_evento) >= day.date &&
                (c.cor === day.color ||
                    (textMeaning(c.titulo)?.kind === day.kind && c.categoria === day.categoria) ||
                    (c.natureza === 'ferias_docentes' && day.categoria === 'cancelamento'))
        );
        if (covered) continue;
        const previous = runs.at(-1);
        if (
            previous &&
            previous.color === day.color &&
            previous.kind === day.kind &&
            Date.parse(day.date) - Date.parse(previous.end) === DAY
        ) {
            previous.end = day.date;
            previous.pages.add(day.page);
        } else runs.push({ ...day, start: day.date, end: day.date, pages: new Set([day.page]) });
    }
    for (const run of runs) {
        const title =
            run.text.length > 125
                ? run.kind === 'avaliacao'
                    ? 'Período de avaliações'
                    : 'Eventos e atividades do campus'
                : run.text;
        candidates.push({
            titulo: (run.kind === 'sem_aula' ? 'Sem aula · ' : '') + title,
            data_evento: run.start,
            data_fim: run.end === run.start ? null : run.end,
            requiresEnd: false,
            warning: ['Datas identificadas pela cor das células e pela legenda. Confira o PDF.'],
            page: run.page,
            sourcePages: [...run.pages],
            level: analysis.level,
            sourceText: `Legenda de cor: ${run.text} (${run.color}). ${run.kind === 'sem_aula' ? 'Sem aula conforme a legenda.' : 'Esta marcação não implica suspensão das aulas.'}`,
            reviewed: false,
            cor: run.color,
            natureza: run.kind,
            legenda: run.text,
            categoria: run.categoria
        });
    }
    candidates.sort((a, b) => (a.data_evento || '9999').localeCompare(b.data_evento || '9999'));
    const merged = [];
    for (const item of candidates) {
        const prior =
            validRange(item) &&
            merged.find(
                (c) =>
                    validRange(c) &&
                    norm(c.titulo) === norm(item.titulo) &&
                    (c.level || analysis.level) === (item.level || analysis.level) &&
                    c.natureza === item.natureza &&
                    c.categoria === item.categoria &&
                    (c.cor === item.cor || Boolean(textMeaning(c.titulo))) &&
                    Date.parse(item.data_evento) - Date.parse(c.data_fim || c.data_evento) === DAY
            );
        if (prior) {
            prior.data_fim = item.data_fim || item.data_evento;
            prior.sourcePages = [...new Set([...prior.sourcePages, ...item.sourcePages])];
            prior.sourceText += ' | ' + item.sourceText;
            prior.warning = [...new Set([...prior.warning, ...item.warning])];
            prior.needsIndividualReview = prior.needsIndividualReview || item.needsIndividualReview;
            if (item.reviewReason === 'classification' || !prior.reviewReason)
                prior.reviewReason = item.reviewReason;
            if (prior.cor !== item.cor) {
                delete prior.cor;
                delete prior.legenda;
                note(
                    prior,
                    'Período agrupado pelo mesmo evento descrito no texto; cores não uniformes em todo o período.'
                );
                warn(
                    prior,
                    'Agrupamento pelo texto com cores não uniformes. Confira o período individualmente.'
                );
            }
        } else merged.push(item);
    }
    if (merged.length > 300)
        fail(
            'Mais de 300 candidatos após a leitura das cores. Divida o PDF por modalidade ou período.'
        );
    for (const candidate of merged) {
        if (candidate.titulo.length > 150) {
            candidate.fullTitle = candidate.titulo;
            candidate.titulo = candidate.titulo.slice(0, 147).replace(/\s+\S*$/, '') + '…';
            candidate.warning = candidate.warning.filter(
                (message) => !message.startsWith('Título longo:')
            );
            candidate.warning.push(
                'Título abreviado automaticamente; a descrição completa permanece no trecho de origem.'
            );
        }
        if (/^ferias academicas\s+\d{1,2}$/.test(norm(candidate.titulo)))
            warn(
                candidate,
                'Número isolado no fim da descrição de férias. Confira o título antes de agrupar com outro período.'
            );
        candidate.titulo = candidate.titulo.slice(0, 1000);
        if (candidate.sourceText.length > 1900)
            warn(
                candidate,
                'Trecho de origem resumido. Consulte todas as páginas indicadas no PDF.'
            );
        candidate.sourceText = (
            `Páginas: ${candidate.sourcePages.join(', ')}. ` + candidate.sourceText
        ).slice(0, 2000);
        candidate.warning = [...new Set(candidate.warning)];
        candidate.reviewed = false;
    }
    parsed.candidates = merged;
    if (!analysis.legend.length)
        parsed.warnings.push(
            'Legenda vetorial de cores não reconhecida. Dias sem aula não foram inferidos pelas cores.'
        );
    else
        parsed.warnings.push(
            'Cores da legenda só classificam o período inteiro quando todos os dias têm a mesma cor reconhecida. Eventos e avaliações não implicam suspensão das aulas.'
        );
    if (analysis.conflictingColors?.length)
        parsed.warnings.push(
            'Há cores com significados conflitantes nas legendas. Essas cores não foram usadas para inferir eventos.'
        );
    return parsed;
}
module.exports = {
    filledRectangles,
    extractColoredDays,
    classify,
    mergeColorCandidates,
    pageLevel
};
