/* Transformação e envio explícito: não há sincronização nem exclusão automática. */
(function (root, factory) {
    const value = factory();
    if (typeof module === 'object' && module.exports) module.exports = value;
    else (root.Arcadia = root.Arcadia || {}).googleTransfer = value;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';
    const scopes = {
        calendar: 'https://www.googleapis.com/auth/calendar.app.created',
        tasks: 'https://www.googleapis.com/auth/tasks'
    };
    function day(value) {
        const text = String(value || '').slice(0, 10);
        if (!/^\d{4}-\d\d-\d\d$/.test(text)) return null;
        const d = new Date(text + 'T12:00:00Z');
        return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === text ? text : null;
    }
    function source(origin, id) {
        if (!/^[1-9]\d*$/.test(String(id))) throw Error('Tarefa inválida.');
        return new URL('/tasks.html?tarefa=' + id, origin).href;
    }
    const marker = (origin, id) => 'Origem Arcádia: ' + source(origin, id);
    function taskBody(task, origin) {
        const footer = marker(origin, task.id_tarefa);
        return {
            title: String(task.titulo || '').slice(0, 150),
            notes:
                String(task.observacao || '').slice(0, 8192 - footer.length - 2) + '\n\n' + footer,
            due: day(task.data_entrega) ? day(task.data_entrega) + 'T00:00:00.000Z' : null,
            status: task.status === 'concluida' ? 'completed' : 'needsAction',
            completed: task.status === 'concluida' ? new Date().toISOString() : null
        };
    }
    function eventBody(task, origin) {
        const date = day(task.data_entrega);
        if (!date)
            throw Error(
                'Defina uma data na tarefa para enviá-la ao Google Agenda. No Tasks ela pode ficar sem data.'
            );
        const end = new Date(date + 'T12:00:00Z');
        end.setUTCDate(end.getUTCDate() + 1);
        return {
            summary:
                (task.status === 'concluida' ? '✓ ' : '') + String(task.titulo || '').slice(0, 150),
            description: (String(task.observacao || '') + '\n\n' + marker(origin, task.id_tarefa))
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;'),
            start: { date },
            end: { date: end.toISOString().slice(0, 10) },
            extendedProperties: { private: { arcadiaOrigin: source(origin, task.id_tarefa) } },
            reminders: { useDefault: true }
        };
    }
    async function eventId(task, origin) {
        const bytes = new TextEncoder().encode(source(origin, task.id_tarefa));
        const result = await globalThis.crypto.subtle.digest('SHA-256', bytes);
        return (
            'arcadia' +
            Array.from(new Uint8Array(result), (n) => n.toString(16).padStart(2, '0')).join('')
        );
    }
    async function pages(request, path) {
        let rows = [],
            next;
        for (let i = 0; i < 300; i++) {
            const q = new URLSearchParams({
                maxResults: '100',
                showCompleted: 'true',
                showHidden: 'true',
                ...(next ? { pageToken: next } : {})
            });
            const response = await request('GET', path + '?' + q);
            rows.push(...(response.items || []));
            next = response.nextPageToken;
            if (!next) return rows;
        }
        throw Error('A lista é muito extensa para conferir duplicatas. O envio foi interrompido.');
    }
    function createExporter({ request, metadata, origin, clock = () => Date.now() }) {
        return {
            async send(rows, destination) {
                if (
                    !['calendar', 'tasks', 'both'].includes(destination) ||
                    !Array.isArray(rows) ||
                    !rows.length ||
                    rows.length > 25
                )
                    throw Error('Selecione de 1 a 25 tarefas.');
                const profile = await request('GET', 'profile');
                if (!profile.sub || typeof profile.email !== 'string')
                    throw Error('O Google não confirmou a conta.');
                const reservation = await metadata.claim(profile.sub),
                    lease = reservation.lease,
                    started = clock(),
                    result = [];
                let calendar = reservation.calendar_id,
                    list = reservation.tasklist_id,
                    googleTasks;
                const save = (body) => metadata.save(profile.sub, { ...body, lease });
                try {
                    if (destination !== 'tasks') {
                        if (calendar) {
                            try {
                                await request(
                                    'GET',
                                    'calendar/calendars/' + encodeURIComponent(calendar)
                                );
                            } catch (e) {
                                if (e.status !== 404 && e.status !== 410) throw e;
                                calendar = null;
                            }
                        }
                        if (!calendar) {
                            const created = await request('POST', 'calendar/calendars', {
                                summary: 'Arcádia',
                                description: 'Tarefas enviadas por você a partir do Arcádia.'
                            });
                            calendar = created.id;
                            if (!calendar) throw Error('O Google não confirmou a agenda.');
                            await save({ calendar_id: calendar });
                        }
                    }
                    if (destination !== 'calendar') {
                        if (list) {
                            try {
                                await request(
                                    'GET',
                                    'tasks/users/@me/lists/' + encodeURIComponent(list)
                                );
                            } catch (e) {
                                if (e.status !== 404 && e.status !== 410) throw e;
                                list = null;
                            }
                        }
                        if (!list) {
                            const created = await request('POST', 'tasks/users/@me/lists', {
                                title: 'Arcádia'
                            });
                            list = created.id;
                            if (!list) throw Error('O Google não confirmou a lista.');
                            await save({ tasklist_id: list });
                        }
                        googleTasks = await pages(
                            request,
                            'tasks/lists/' + encodeURIComponent(list) + '/tasks'
                        );
                    }
                    for (const task of rows)
                        for (const target of destination === 'both'
                            ? ['calendar', 'tasks']
                            : [destination]) {
                            const item = {
                                id: task.id_tarefa,
                                title: task.titulo,
                                destination: target
                            };
                            try {
                                if (clock() - started > 90000)
                                    throw Error(
                                        'O lote atingiu o limite de tempo. Envie novamente apenas os itens restantes.'
                                    );
                                if (target === 'calendar') {
                                    const body = eventBody(task, origin),
                                        id = await eventId(task, origin),
                                        path =
                                            'calendar/calendars/' +
                                            encodeURIComponent(calendar) +
                                            '/events';
                                    let previous;
                                    try {
                                        previous = await request('GET', path + '/' + id);
                                    } catch (e) {
                                        if (e.status !== 404 && e.status !== 410) throw e;
                                    }
                                    if (
                                        previous &&
                                        previous.extendedProperties?.private?.arcadiaOrigin !==
                                            source(origin, task.id_tarefa)
                                    )
                                        throw Error(
                                            'O evento encontrado não foi identificado como cópia desta tarefa.'
                                        );
                                    if (previous && previous.status !== 'cancelled')
                                        await request('PATCH', path + '/' + id, body);
                                    else await request('POST', path, { ...body, id });
                                } else {
                                    const body = taskBody(task, origin),
                                        identity = marker(origin, task.id_tarefa);
                                    const matches = googleTasks.filter(
                                        (item) =>
                                            !item.deleted &&
                                            String(item.notes || '')
                                                .split('\n')
                                                .includes(identity)
                                    );
                                    if (matches.length > 1)
                                        throw Error(
                                            'Há mais de uma cópia desta tarefa no Google Tasks. Confira as duplicatas antes de reenviar.'
                                        );
                                    const path =
                                        'tasks/lists/' + encodeURIComponent(list) + '/tasks';
                                    if (matches.length) {
                                        await request(
                                            'PATCH',
                                            path + '/' + encodeURIComponent(matches[0].id),
                                            body
                                        );
                                        Object.assign(matches[0], body);
                                    } else {
                                        const created = await request('POST', path, body);
                                        if (!created.id)
                                            throw Error('O Google não confirmou a criação.');
                                        googleTasks.push(created);
                                    }
                                }
                                result.push({ ...item, ok: true });
                            } catch (error) {
                                result.push({ ...item, ok: false, error: error.message });
                            }
                        }
                    return { email: profile.email, result };
                } finally {
                    try {
                        await metadata.release(profile.sub, lease);
                    } catch {
                        /* A reserva expira; não repetimos gravações externas. */
                    }
                }
            }
        };
    }
    return { scopes, day, source, marker, taskBody, eventBody, eventId, createExporter };
});
