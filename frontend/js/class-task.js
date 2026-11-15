/* Preenche a tarefa pessoal a partir de uma atividade já acessível na turma. */
(function (root, factory) {
    const value = factory();
    if (typeof module === 'object' && module.exports) module.exports = value;
    else (root.Arcadia = root.Arcadia || {}).classTask = value;
})(typeof window === 'undefined' ? globalThis : window, function () {
    function draft(post, subject, origin) {
        if (!post || post.situacao === 'cancelado')
            throw Error('Atividades canceladas não criam uma tarefa.');
        const id = Number(post.id_disciplina || subject?.id_disciplina);
        if (!Number.isSafeInteger(id) || id < 1) throw Error('Disciplina indisponível.');
        const link = new URL('/classes.html?disciplina=' + id, origin).href;
        const raw = post.fim || post.inicio;
        let date = String(raw || '').slice(0, 10);
        if (typeof raw === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(raw)) {
            const local = new Date(raw);
            if (Number.isFinite(local.getTime()))
                date =
                    local.getFullYear() +
                    '-' +
                    String(local.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(local.getDate()).padStart(2, '0');
        }
        const parsed = new Date(date + 'T12:00:00Z');
        const valid =
            /^\d{4}-\d\d-\d\d$/.test(date) &&
            Number.isFinite(parsed.getTime()) &&
            parsed.toISOString().slice(0, 10) === date;
        const footer =
            '\n\nOrigem: ' +
            (subject?.nome || post.disciplina || 'Turmas') +
            '\n' +
            link +
            (raw ? '\nData da atividade: ' + raw : '');
        const description = String(post.descricao || '');
        return {
            fields: {
                titulo: String(post.titulo || 'Atividade da turma').slice(0, 150),
                categoria: 'Acadêmico',
                prioridade: 'media',
                status: 'aberta',
                data_entrega: valid ? date : null,
                observacao: description.slice(0, Math.max(0, 5000 - footer.length)) + footer
            },
            link,
            truncated: description.length + footer.length > 5000
        };
    }
    return { draft };
});
