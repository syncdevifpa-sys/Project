// dashboard.js: "Meu painel" v3 (depende de api.js, auth.js, portal.js, tasks.js e calendar-categories.js).
// Segue "Arcadia Meu Painel - Especificação v3": moldura (menu, topo, barra inferior, gaveta),
// cartões com dados reais, busca Ctrl K, menu de conta e toast. Só usa rotas que já existem no backend.
// Referências de design de cada bloco: docs/referencias-design.md
(function (A) {
    'use strict';
    const api = A.api;
    const doc = document;
    const $ = (id) => doc.getElementById(id);
    const esc = (v) =>
        String(v ?? '').replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
        );
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const norm = (v) =>
        String(v ?? '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim();
    const store = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw == null ? fallback : JSON.parse(raw);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {}
        }
    };
    const reducedMotion = () =>
        doc.documentElement?.getAttribute?.('data-motion') === 'reduced' ||
        !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const ICON = {
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
        bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
        download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
    };

    // ---------- Datas (o MySQL devolve DATE como ISO; usamos só AAAA-MM-DD) ----------
    const ymd = (v) => (v ? String(v).slice(0, 10) : '');
    const localYmd = (d) => d.toLocaleDateString('sv-SE');
    const today = () => localYmd(new Date());
    const addDays = (base, n) => {
        const d = new Date(base + 'T12:00:00');
        d.setDate(d.getDate() + n);
        return localYmd(d);
    };
    const daysUntil = (day) =>
        Math.round((new Date(day + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);
    const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const dayMonth = (day) => {
        const [, m, d] = day.split('-');
        return { d: Number(d), m: MONTHS[Number(m) - 1] };
    };
    const ddmm = (day) => day.split('-').reverse().slice(0, 2).join('/');
    const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
    const weekday = (day) => new Date(day + 'T12:00:00').getDay();
    const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
    // "hoje", "amanhã", "quinta" (até 6 dias) ou "15/11"
    function dayWord(day) {
        const n = daysUntil(day);
        if (n === 0) return 'hoje';
        if (n === 1) return 'amanhã';
        if (n === -1) return 'ontem';
        if (n > 1 && n < 7) return WEEKDAYS_LONG[weekday(day)];
        return ddmm(day);
    }
    // Segunda a domingo da semana atual.
    function weekRange() {
        const t = today();
        const dow = weekday(t);
        const monday = addDays(t, dow === 0 ? -6 : 1 - dow);
        return { monday, sunday: addDays(monday, 6), days: [0, 1, 2, 3, 4].map((i) => addDays(monday, i)) };
    }

    // ---------- Estado ----------
    const state = {
        tasks: [],
        events: [],
        notices: [],
        docs: [],
        subjects: [],
        readIds: new Set(),
        unread: 0,
        filter: 'all',
        loaded: false
    };
    const openTasks = () => state.tasks.filter((t) => t.status !== 'concluida');
    function bucket(t) {
        const due = ymd(t.data_entrega);
        if (!due) return 'none';
        const n = daysUntil(due);
        if (n < 0) return 'late';
        if (n === 0) return 'today';
        return n <= 7 ? 'week' : 'later';
    }
    const GROUPS = [
        ['late', 'Atrasadas'],
        ['today', 'Hoje'],
        ['week', 'Esta semana'],
        ['later', 'Mais tarde'],
        ['none', 'Sem data']
    ];
    const isUnread = (n) => !state.readIds.has(String(n.id_aviso));

    // ---------- Toast: pílula marinho centralizada na base, some em 5 s ----------
    let toastTimer = null;
    function toast(message, actionLabel, onAction, duration = 5000) {
        const dock = $('dbToastDock');
        if (!dock || !doc.createElement) return;
        clearTimeout(toastTimer);
        dock.replaceChildren();
        const box = doc.createElement('div');
        box.className = 'db-toast' + (actionLabel ? ' has-action' : '');
        const text = doc.createElement('span');
        text.textContent = message;
        box.append(text);
        if (actionLabel && onAction) {
            const button = doc.createElement('button');
            button.type = 'button';
            button.textContent = actionLabel;
            button.addEventListener('click', () => {
                clearTimeout(toastTimer);
                box.remove();
                onAction();
            });
            box.append(button);
        }
        dock.append(box);
        toastTimer = setTimeout(() => box.remove(), duration);
    }
    // Outros módulos do portal chamam A.showToast com HTML escapado: mostramos só o texto.
    const plainText = (html) => {
        const t = doc.createElement?.('template');
        if (!t) return String(html ?? '');
        t.innerHTML = String(html ?? '');
        return t.content.textContent;
    };
    const showError = (e, fallback) => toast(e?.message || fallback);

    // ---------- Ir para uma seção: rolagem suave, folga de 88, destaque de 1,8 s ----------
    function jump(id) {
        const target = $(id);
        if (!target) return;
        target.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        target.classList.add('is-flash');
        setTimeout(() => target.classList.remove('is-flash'), 1800);
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus?.({ preventScroll: true });
    }

    // ---------- Conta e saudação ----------
    function renderAccount() {
        const s = A.auth.getSessao() || {};
        const name = s.nome || 'Minha conta';
        const first = name.split(' ')[0];
        const initials =
            name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase() || 'EU';
        $('dbUserName').textContent = name;
        $('dbUserRole').textContent = s.is_admin
            ? 'Administrador'
            : s.vinculo || A.auth.paraVinculo?.(s.tipo_usuario) || '';
        $('painelUserGreeting').textContent = s.nome ? first : 'você';
        const avatar = $('dbAvatar');
        if (s.foto && /^(https?:|data:image\/|\/|[\w-]+\/)/.test(s.foto) && doc.createElement) {
            const img = doc.createElement('img');
            img.src = s.foto;
            img.alt = '';
            avatar.replaceChildren(img);
        } else avatar.textContent = initials;
        const admin = $('adminAccess');
        if (admin) admin.hidden = !s.is_admin;
    }

    function renderGreeting() {
        $('dbToday').textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        const open = openTasks();
        const late = open.filter((t) => bucket(t) === 'late').length;
        const due = open.filter((t) => bucket(t) === 'today').length;
        const events = upcoming().filter((e) => e.day === today()).length;
        const link = (target, text, filter) =>
            '<a href="#' + target + '" data-jump="' + target + '"' +
            (filter ? ' data-set-filter="' + filter + '"' : '') + '>' + text + '</a>';
        const parts = [];
        if (events) parts.push(link('dbNowCard', plural(events, 'compromisso', 'compromissos')) + ' no calendário');
        if (due) parts.push(link('dbTodo', plural(due, 'entrega', 'entregas'), 'all') + ' pra hoje');
        if (late) parts.push(link('dbTodo', plural(late, 'tarefa atrasada', 'tarefas atrasadas'), 'late'));
        let text = parts.length
            ? 'Hoje você tem ' + parts.join(', ').replace(/, ([^,]*)$/, ' e $1') + '.'
            : open.length
              ? 'Nada vence hoje. Bom momento pra adiantar o que vem pela frente.'
              : 'Tudo em dia por aqui. Aproveite o dia!';
        if (state.unread)
            text +=
                ' ' + link('dbNoticesCard', state.unread === 1 ? '1 aviso novo' : state.unread + ' avisos novos') +
                ' te esperando.';
        $('dbSummary').innerHTML = text;
    }

    // ---------- Indicadores ----------
    // Sequência: entregas concluídas até o prazo, contadas da mais recente para trás.
    function streaks() {
        const done = state.tasks
            .filter((t) => t.status === 'concluida' && t.concluida_em && t.data_entrega)
            .sort((a, b) => String(a.concluida_em).localeCompare(String(b.concluida_em)));
        let run = 0;
        let best = 0;
        done.forEach((t) => {
            run = ymd(t.concluida_em) <= ymd(t.data_entrega) ? run + 1 : 0;
            best = Math.max(best, run);
        });
        return { current: run, best };
    }
    function renderProgress() {
        const { monday, sunday, days } = weekRange();
        const weekTasks = state.tasks.filter((t) => {
            const due = ymd(t.data_entrega);
            return due && due >= monday && due <= sunday;
        });
        const weekDone = weekTasks.filter((t) => t.status === 'concluida').length;
        $('dbWeekValue').innerHTML = weekDone + '<small>de ' + weekTasks.length + ' concluídas</small>';
        $('dbWeekBar').style.width = weekTasks.length ? (weekDone / weekTasks.length) * 100 + '%' : '0';

        const s = streaks();
        $('dbStreak').innerHTML = s.current + '<small>' + (s.current === 1 ? 'seguida' : 'seguidas') + '</small>';
        $('dbStreakHint').textContent = !s.best ? '' : s.current >= s.best ? 'seu recorde!' : 'recorde: ' + s.best;
        const doneDays = new Set(
            state.tasks.filter((t) => t.status === 'concluida' && t.concluida_em).map((t) => ymd(t.concluida_em))
        );
        const t = today();
        $('dbWeek').innerHTML = days
            .map((d, i) => {
                const label = cap(WEEKDAYS_LONG[i + 1]) + (doneDays.has(d) ? ': entregou' : d === t ? ': hoje' : '');
                return (
                    '<li class="' + (doneDays.has(d) ? 'is-done ' : '') + (d === t ? 'is-today' : '') +
                    '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' + 'STQQS'[i] + '</li>'
                );
            })
            .join('');
    }

    // ---------- Próximo compromisso (só eventos do calendário) ----------
    function upcoming() {
        const t = today();
        const now = new Date();
        const minutesNow = now.getHours() * 60 + now.getMinutes();
        const toMin = (v) => {
            const [h, m] = hhmm(v).split(':').map(Number);
            return h * 60 + m;
        };
        return state.events
            .map((e) => {
                const start = ymd(e.data_evento);
                const end = ymd(e.data_fim) || start;
                if (!start || end < t) return null;
                if (start === t && end === t && e.hora_fim && minutesNow > toMin(e.hora_fim)) return null;
                const category = A.calendarCategories?.canonical(e.categoria);
                const day = start < t ? t : start;
                return {
                    key: String(e.id_evento ?? e.titulo) + '@' + day + 'T' + hhmm(e.hora_inicio),
                    day,
                    end,
                    time: start < t ? '' : hhmm(e.hora_inicio),
                    title: e.titulo,
                    category,
                    categoryLabel: A.calendarCategories?.options[category] || '',
                    place: e.local || ''
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.day + (a.time || '99')).localeCompare(b.day + (b.time || '99')));
    }
    const startOf = (item) => (item.time ? new Date(item.day + 'T' + item.time + ':00') : null);
    function countdown(item) {
        const n = daysUntil(item.day);
        if (n === 0 && item.time) {
            const mins = Math.ceil((startOf(item) - new Date()) / 6e4);
            if (mins <= 0) return mins > -30 ? 'começando agora' : 'acontecendo agora';
            if (mins < 60) return 'começa em ' + mins + ' min';
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return 'começa em ' + h + ' h' + (m ? ' ' + m + ' min' : '');
        }
        if (n === 0) return item.end > item.day ? 'em andamento' : 'hoje';
        if (n === 1) return 'amanhã';
        return 'em ' + n + ' dias';
    }
    function whenText(item) {
        const n = daysUntil(item.day);
        const { d, m } = dayMonth(item.day);
        const day =
            n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : cap(WEEKDAYS_LONG[weekday(item.day)]) + ', ' + d + ' ' + m.toLowerCase();
        return day + (item.time ? ' às ' + item.time : item.end > item.day ? ', até ' + ddmm(item.end) : ', dia todo');
    }

    // Lembretes ficam neste navegador (localStorage); sem rota nova no backend.
    const REMINDER_KEY = 'arcadia-dashboard-reminders';
    const reminderTimers = new Map();
    const reminders = () => store.get(REMINDER_KEY, {}) || {};
    function scheduleReminder(key, info) {
        clearTimeout(reminderTimers.get(key));
        const wait = info.at - 10 * 6e4 - Date.now();
        if (wait > 2 ** 31 - 1) return;
        reminderTimers.set(
            key,
            setTimeout(() => {
                const msg = 'Em 10 min: ' + info.title;
                toast(msg, null, null, 10000);
                try {
                    if (window.Notification && Notification.permission === 'granted')
                        new Notification('Arcádia', { body: msg, icon: 'public/arcadia-logo-64.png' });
                } catch {}
                const all = reminders();
                delete all[key];
                store.set(REMINDER_KEY, all);
                renderNow();
            }, Math.max(0, wait))
        );
    }
    function restoreReminders() {
        const all = reminders();
        let changed = false;
        Object.entries(all).forEach(([key, info]) => {
            if (!info || !info.at || info.at < Date.now()) {
                delete all[key];
                changed = true;
            } else scheduleReminder(key, info);
        });
        if (changed) store.set(REMINDER_KEY, all);
    }
    function toggleReminder(item) {
        const all = reminders();
        const at = startOf(item)?.getTime();
        if (!at) return;
        if (all[item.key]) {
            delete all[item.key];
            clearTimeout(reminderTimers.get(item.key));
            store.set(REMINDER_KEY, all);
            toast('Lembrete desativado.');
        } else {
            all[item.key] = { at, title: item.title };
            store.set(REMINDER_KEY, all);
            scheduleReminder(item.key, all[item.key]);
            const when = new Date(Math.max(Date.now(), at - 10 * 6e4)).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            toast('Lembrete ativado para ' + when + '.');
            try {
                if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
            } catch {}
        }
        renderNow();
    }

    let nowItem = null;
    function renderNow() {
        const box = $('dbNow');
        if (!state.loaded) return;
        const [first] = upcoming();
        nowItem = first || null;
        if (!first) {
            box.innerHTML =
                '<h3 class="db-now-title">Agenda livre</h3>' +
                '<p class="db-now-free">Nenhum evento no calendário nos próximos dias.</p>' +
                '<div class="db-now-actions"><a class="db-btn db-btn--ghost-blue" href="calendar.html">Abrir calendário</a></div>';
            return;
        }
        const start = startOf(first);
        const canRemind = start && start.getTime() > Date.now();
        const on = !!reminders()[first.key];
        box.innerHTML =
            '<div><h3 class="db-now-title"><a href="calendar.html">' + esc(first.title) + '</a></h3>' +
            (first.categoryLabel || first.place
                ? '<p class="db-now-place">' + esc([first.categoryLabel, first.place].filter(Boolean).join(' no ')) + '</p>'
                : '') +
            '</div>' +
            '<p class="db-now-when"><span class="db-countdown" id="dbCountdown">' + esc(countdown(first)) + '</span>' +
            '<span>' + esc(whenText(first)) + '</span></p>' +
            '<div class="db-now-actions">' +
            (canRemind
                ? '<button type="button" class="db-btn db-btn--on-blue' + (on ? ' is-on' : '') + '" id="dbRemind" aria-pressed="' + on + '">' +
                  (on ? ICON.check + 'Lembrete ativado' : ICON.bell + 'Lembrar 10 min antes') + '</button>'
                : '') +
            '<a class="db-btn db-btn--ghost-blue" href="calendar.html">Abrir calendário</a></div>';
    }
    // A contagem atualiza a cada 15 s sem redesenhar o cartão.
    function tickCountdown() {
        const pill = $('dbCountdown');
        if (!nowItem || !pill) return renderNow();
        const [first] = upcoming();
        if (!first || first.key !== nowItem.key) return renderNow();
        pill.textContent = countdown(first);
    }

    // ---------- A fazer ----------
    function pill(t) {
        const b = bucket(t);
        const due = ymd(t.data_entrega);
        if (b === 'late') {
            const n = -daysUntil(due);
            return '<span class="db-pill db-pill--late">Atrasada ' + (n === 1 ? 'desde ontem' : 'há ' + n + ' dias') + '</span>';
        }
        if (b === 'today') return '<span class="db-pill db-pill--today">Hoje</span>';
        if (b === 'week') return '<span class="db-pill">' + (daysUntil(due) === 1 ? 'Amanhã' : WEEKDAYS[weekday(due)]) + '</span>';
        if (b === 'later') {
            const { d, m } = dayMonth(due);
            return '<span class="db-pill">' + d + ' ' + m.toLowerCase() + '</span>';
        }
        return t.prioridade === 'alta' ? '<span class="db-pill db-pill--high">Prioridade alta</span>' : '';
    }
    const matchesFilter = (t, filter) =>
        filter === 'late' ? bucket(t) === 'late' : filter === 'week' ? ['today', 'week'].includes(bucket(t)) : true;
    const sortTasks = (list) => {
        const order = { late: 0, today: 1, week: 2, later: 3, none: 4 };
        return list.sort(
            (a, b) =>
                order[bucket(a)] - order[bucket(b)] ||
                ymd(a.data_entrega).localeCompare(ymd(b.data_entrega)) ||
                Number(a.id_tarefa) - Number(b.id_tarefa)
        );
    };
    const MAX_TASKS = 8;
    function taskRow(t) {
        const meta = [t.categoria, t.status === 'em_andamento' ? 'em andamento' : ''].filter(Boolean).join(', ');
        return (
            '<li class="db-task" id="dbTask-' + esc(t.id_tarefa) + '" data-id="' + esc(t.id_tarefa) + '">' +
            '<button class="db-check" type="button" role="checkbox" aria-checked="false" aria-label="Concluir: ' +
            esc(t.titulo) + '">' + ICON.check + '</button>' +
            '<div class="db-task-body"><div class="db-task-text"><a class="db-task-title" href="tasks.html">' +
            esc(t.titulo) + '</a>' + (meta ? '<div class="db-task-meta">' + esc(meta) + '</div>' : '') +
            '</div>' + pill(t) + '</div></li>'
        );
    }
    function renderTasks() {
        const open = sortTasks(openTasks());
        const counts = {
            all: open.length,
            late: open.filter((t) => matchesFilter(t, 'late')).length,
            week: open.filter((t) => matchesFilter(t, 'week')).length
        };
        $('dbTaskCount').textContent = open.length;
        $('dbTaskCount').classList.toggle('is-zero', !open.length);
        doc.querySelectorAll('[data-count]').forEach((el) => (el.textContent = counts[el.dataset.count]));
        doc.querySelectorAll('.db-chip[data-filter]').forEach((chip) =>
            chip.setAttribute('aria-pressed', String(chip.dataset.filter === state.filter))
        );
        const target = $('dbTasks');
        if (!open.length) {
            target.innerHTML =
                '<div class="db-empty"><div><h3>Zerou tudo por aqui!</h3>' +
                '<p>Nenhuma tarefa pendente. Que tal planejar a próxima semana?</p></div>' +
                '<button type="button" class="db-btn db-btn--outline" data-focus-add>Criar tarefa</button></div>';
            return;
        }
        const list = open.filter((t) => matchesFilter(t, state.filter));
        if (!list.length) {
            target.innerHTML = '<p class="db-muted">Nada por aqui neste filtro.</p>';
            return;
        }
        const shown = list.slice(0, MAX_TASKS);
        target.innerHTML =
            GROUPS.map(([key, label]) => {
                const items = shown.filter((t) => bucket(t) === key);
                if (!items.length) return '';
                const total = list.filter((t) => bucket(t) === key).length;
                return (
                    '<section class="db-group db-group--' + key + '" aria-label="' + label + '">' +
                    '<h3 class="db-group-label">' + label + ' <span>' + total + '</span></h3><ul>' +
                    items.map(taskRow).join('') + '</ul></section>'
                );
            }).join('') +
            (list.length > MAX_TASKS
                ? '<p class="db-tasks-more"><a class="db-link" href="tasks.html">Ver mais ' +
                  plural(list.length - MAX_TASKS, 'tarefa', 'tarefas') + ' em Tarefas</a></p>'
                : '');
    }
    function setFilter(filter) {
        state.filter = filter;
        renderTasks();
    }
    async function complete(id, row, button) {
        const task = state.tasks.find((t) => String(t.id_tarefa) === String(id));
        if (!task || button.disabled) return;
        button.disabled = true;
        button.setAttribute('aria-checked', 'true');
        row.classList.add('is-done');
        const before = { status: task.status, concluida_em: task.concluida_em };
        const wait = new Promise((r) => setTimeout(r, 650));
        try {
            await A.tasks.concluir(task.id_tarefa);
        } catch (e) {
            button.disabled = false;
            button.setAttribute('aria-checked', 'false');
            row.classList.remove('is-done');
            return showError(e, 'Não foi possível concluir a tarefa.');
        }
        task.status = 'concluida';
        task.concluida_em = today();
        await wait;
        row.classList.add('is-leaving');
        setTimeout(() => {
            renderAll();
            const s = streaks().current;
            toast(
                'Tarefa concluída' + (s > 1 && bucket({ data_entrega: task.data_entrega }) !== 'late' ? '. Sequência: ' + s : ''),
                'Desfazer',
                async () => {
                    try {
                        await A.tasks.patch(task.id_tarefa, { status: before.status === 'concluida' ? 'aberta' : before.status });
                        task.status = before.status === 'concluida' ? 'aberta' : before.status;
                        task.concluida_em = null;
                        renderAll();
                    } catch (e) {
                        showError(e, 'Não foi possível reabrir a tarefa.');
                    }
                }
            );
        }, reducedMotion() ? 0 : 300);
    }
    async function addTask(event) {
        event.preventDefault();
        const input = $('dbAddInput');
        const titulo = input.value.trim();
        if (!titulo) return input.focus();
        const button = event.target.querySelector?.('button[type="submit"]');
        if (button) button.disabled = true;
        try {
            await api.expect(api.post('/api/tasks', { titulo, prioridade: 'media', status: 'aberta' }));
            input.value = '';
            state.tasks = await api.expect(api.get('/api/tasks'));
            state.filter = 'all';
            renderAll();
            toast('Tarefa adicionada em Sem data.');
        } catch (e) {
            showError(e, 'Não foi possível adicionar a tarefa.');
        } finally {
            if (button) button.disabled = false;
            input.focus();
        }
    }

    // ---------- Minhas disciplinas ----------
    function subjectStatus(subject) {
        const name = norm(subject.nome);
        const tasks = openTasks().filter((t) => norm(t.categoria) === name);
        const late = tasks.filter((t) => bucket(t) === 'late').length;
        if (late) return '<span class="db-pill db-pill--navy">' + plural(late, 'atrasada', 'atrasadas') + '</span>';
        const next = sortTasks(tasks.filter((t) => ['today', 'week'].includes(bucket(t))))[0];
        if (next) {
            const due = ymd(next.data_entrega);
            const n = daysUntil(due);
            return '<span class="db-pill db-pill--white">Entrega ' + (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : WEEKDAYS_LONG[weekday(due)]) + '</span>';
        }
        return '<span class="db-pill db-pill--white">Em dia</span>';
    }
    function renderClasses(error) {
        const box = $('dbClasses');
        const sub = $('dbSubClasses');
        if (sub)
            sub.innerHTML =
                state.subjects
                    .slice(0, 6)
                    .map((s) => '<a href="classes.html" title="' + esc(s.nome) + '">' + esc(s.nome) + '</a>')
                    .join('') + '<a href="classes.html">' + (state.subjects.length ? 'Ver todas' : 'Minhas turmas') + '</a>';
        if (error) {
            box.innerHTML = '<p class="db-muted">Não foi possível carregar as disciplinas.</p>';
            return;
        }
        if (!state.subjects.length) {
            box.className = '';
            box.innerHTML =
                '<div class="db-classes-empty"><p>' +
                (state.role === 'docente'
                    ? 'Você ainda não tem disciplinas neste semestre. Crie a primeira em Turmas.'
                    : 'Você ainda não está matriculado em nenhuma disciplina. Convites aparecem em Turmas.') +
                '</p><a class="db-btn db-btn--primary db-btn--sm" href="classes.html">Ver turmas</a></div>';
            return;
        }
        box.className = 'db-classes';
        box.innerHTML = state.subjects
            .slice(0, 8)
            .map(
                (s) =>
                    '<a class="db-class" href="classes.html">' +
                    '<span><span class="db-class-name">' + esc(s.nome) + '</span>' +
                    (s.professor ? '<span class="db-class-prof">' + esc(s.professor) + '</span>' : '') + '</span>' +
                    '<span class="db-class-go" aria-hidden="true">' + ICON.arrow + '</span>' +
                    '<span class="db-class-foot"><span>' + esc(s.turma || '') + '</span>' + subjectStatus(s) + '</span></a>'
            )
            .join('');
    }

    // ---------- Avisos e notícias ----------
    const MAX_NOTICES = 4;
    function noticeMeta(n) {
        const type = n.tipo_publicacao === 'noticia' ? 'Notícia' : 'Aviso';
        const day = ymd(n.data_publicacao);
        const when = day ? (['hoje', 'ontem'].includes(dayWord(day)) ? ' de ' + dayWord(day) : ' de ' + ddmm(day)) : '';
        return [type + when, n.referencia].filter(Boolean).join(', ');
    }
    function renderCounters() {
        const open = openTasks().length;
        const ready = state.docs.filter((d) => d.status === 'pronto').length;
        const set = (id, value) => {
            const el = $(id);
            if (!el) return;
            el.textContent = value || '';
            el.hidden = !value;
        };
        set('dbNavTasks', open);
        set('dbBottomTasks', open);
        set('dbNavNotices', state.unread);
        set('dbBottomNotices', state.unread);
        set('dbNavDocs', ready ? plural(ready, 'pronto', 'prontos') : '');
        const count = $('dbNoticeCount');
        count.textContent = state.unread;
        count.classList.toggle('is-zero', !state.unread);
    }
    function renderNotices() {
        renderCounters();
        const list = state.notices.slice(0, MAX_NOTICES);
        $('dbReadAll').disabled = !state.notices.some(isUnread);
        $('dbNotices').innerHTML = list.length
            ? list
                  .map((n) => {
                      const read = !isUnread(n);
                      return (
                          '<li><a class="db-notice' + (read ? ' is-read' : '') + '" data-notice="' + esc(n.id_aviso) +
                          '" href="notice.html?id=' + encodeURIComponent(n.id_aviso) + '">' +
                          '<p class="db-notice-title">' + (read ? '' : '<span class="db-sr-only">Não lido: </span>') +
                          esc(n.titulo) + '</p><p class="db-notice-meta">' +
                          (Number(n.urgente) ? '<span class="db-pill db-pill--urgent">Urgente</span>' : '') +
                          '<span>' + esc(noticeMeta(n)) + '</span></p></a></li>'
                      );
                  })
                  .join('')
            : '<li class="db-muted">Nenhum aviso publicado.</li>';
    }
    async function markRead(ids) {
        const results = await Promise.allSettled(
            ids.map((id) => api.expect(api.post('/api/read-notices/' + encodeURIComponent(id))))
        );
        results.forEach((r, i) => {
            if (r.status === 'fulfilled') state.readIds.add(String(ids[i]));
        });
        try {
            state.unread = Number((await api.expect(api.get('/api/read-notices/unread/count'))).unread) || 0;
        } catch {
            state.unread = Math.max(0, state.unread - results.filter((r) => r.status === 'fulfilled').length);
        }
        return results;
    }
    async function readAll() {
        const button = $('dbReadAll');
        const pending = state.notices.filter(isUnread).map((n) => n.id_aviso);
        if (!pending.length) return;
        button.disabled = true;
        // O título passa para lido na hora; o servidor confirma em seguida.
        pending.forEach((id) => state.readIds.add(String(id)));
        state.unread = Math.max(0, state.unread - pending.length);
        renderNotices();
        renderGreeting();
        pending.forEach((id) => state.readIds.delete(String(id)));
        const results = await markRead(pending);
        renderNotices();
        renderGreeting();
        if (results.some((r) => r.status === 'rejected')) toast('Alguns avisos não puderam ser marcados como lidos.');
        else toast(plural(pending.length, 'aviso marcado', 'avisos marcados') + ' como lido' + (pending.length === 1 ? '' : 's') + '.');
    }
    async function openNotice(id, href) {
        if (state.readIds.has(String(id))) return (location.href = href);
        state.readIds.add(String(id));
        state.unread = Math.max(0, state.unread - 1);
        renderNotices();
        renderGreeting();
        state.readIds.delete(String(id));
        await Promise.race([markRead([id]), new Promise((r) => setTimeout(r, 600))]);
        location.href = href;
    }

    // ---------- Próximas datas ----------
    function renderDates() {
        const t = today();
        const list = state.events
            .filter((e) => (ymd(e.data_fim) || ymd(e.data_evento)) >= t)
            .sort((a, b) =>
                (ymd(a.data_evento) + hhmm(a.hora_inicio)).localeCompare(ymd(b.data_evento) + hhmm(b.hora_inicio))
            )
            .slice(0, 4);
        $('dbDates').innerHTML = list.length
            ? list
                  .map((e) => {
                      const start = ymd(e.data_evento);
                      const day = start < t ? t : start;
                      const end = ymd(e.data_fim);
                      const { d, m } = dayMonth(day);
                      const category = A.calendarCategories?.canonical(e.categoria);
                      const when =
                          end && end !== start
                              ? 'até ' + ddmm(end)
                              : e.hora_inicio
                                ? dayWord(day) + ' às ' + hhmm(e.hora_inicio)
                                : '';
                      const sub = [A.calendarCategories?.options[category], when].filter(Boolean).join(', ');
                      return (
                          '<li><a class="db-date" href="calendar.html"' +
                          (category ? ' data-event-category="' + esc(category) + '"' : '') +
                          '><span class="db-date-box"><b>' + d + '</b><span>' + m + '</span></span>' +
                          '<span><span class="db-date-title">' + esc(e.titulo) + '</span>' +
                          (sub ? '<span class="db-date-sub" style="display:block">' + esc(sub) + '</span>' : '') +
                          '</span></a></li>'
                      );
                  })
                  .join('')
            : '<li class="db-muted">Nenhuma data próxima no calendário.</li>';
    }

    // ---------- Documentos solicitados ----------
    const DOWNLOADED_KEY = 'arcadia-dashboard-downloads';
    const DOC_STATUS = { solicitado: 'Solicitado', em_analise: 'Em análise', pendente: 'Pendente', pronto: 'Pronto' };
    const safeUrl = (v) => {
        try {
            const u = new URL(v, api.BASE || location.href);
            return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
        } catch {
            return '';
        }
    };
    function renderDocuments(error) {
        if (error) {
            $('dbDocsValue').textContent = '—';
            $('dbDocs').innerHTML = '<li class="db-muted">Não foi possível carregar os documentos.</li>';
            return;
        }
        const docs = state.docs;
        const ready = docs.filter((d) => d.status === 'pronto');
        const pending = docs.length - ready.length;
        const downloaded = new Set(store.get(DOWNLOADED_KEY, []) || []);
        $('dbDocsValue').innerHTML = pending + '<small>em andamento</small>';
        $('dbDocsHint').textContent = ready.length ? plural(ready.length, 'pronto', 'prontos') : '';
        $('dbDocsBar').style.width = docs.length ? (ready.length / docs.length) * 100 + '%' : '0';
        const list = [...docs]
            .sort(
                (a, b) =>
                    (b.status === 'pronto') - (a.status === 'pronto') ||
                    String(b.criado_em || '').localeCompare(String(a.criado_em || ''))
            )
            .slice(0, 3);
        $('dbDocs').innerHTML = list.length
            ? list
                  .map((d) => {
                      const url = d.status === 'pronto' && d.arquivo ? safeUrl(d.arquivo) : '';
                      const again = downloaded.has(String(d.id_documento));
                      const sub = url
                          ? again
                              ? 'Baixado anteriormente'
                              : 'Pronto para baixar'
                          : d.status === 'pronto'
                            ? 'Pronto na secretaria'
                            : d.criado_em
                              ? 'Solicitado em ' + ddmm(ymd(d.criado_em))
                              : 'Solicitado';
                      const action = url
                          ? '<a class="db-btn db-btn--primary db-btn--sm" data-download="' + esc(d.id_documento) +
                            '" href="' + esc(url) + '" target="_blank" rel="noopener">' + ICON.download +
                            (again ? 'Baixar de novo' : 'Baixar') + '</a>'
                          : '<span class="db-pill">' + esc(DOC_STATUS[d.status] || d.status || '') + '</span>';
                      return (
                          '<li class="db-doc"><div class="db-doc-text"><p class="db-doc-title">' + esc(d.titulo) +
                          '</p><p class="db-doc-sub">' + esc(sub) + '</p></div>' + action + '</li>'
                      );
                  })
                  .join('')
            : '<li class="db-muted" style="padding-inline:0">Nenhum documento solicitado ainda.</li>';
    }
    function downloaded(link) {
        const all = new Set(store.get(DOWNLOADED_KEY, []) || []);
        all.add(String(link.dataset.download));
        store.set(DOWNLOADED_KEY, [...all]);
        // Deixa o navegador abrir o arquivo antes de trocar o botão.
        setTimeout(() => {
            link.innerHTML = ICON.download + 'Baixar de novo';
            const sub = link.closest('.db-doc')?.querySelector('.db-doc-sub');
            if (sub) sub.textContent = 'Baixado agora há pouco';
        }, 0);
        toast('Download iniciado.');
    }

    // ---------- Busca (Ctrl K) ----------
    const PAGES = [
        ['Início', 'index.html'],
        ['Tarefas', 'tasks.html'],
        ['Documentos', 'documents.html'],
        ['Turmas', 'classes.html'],
        ['Avisos e notícias', 'notices.html'],
        ['Calendário', 'calendar.html'],
        ['Pessoas', 'people.html'],
        ['Projetos', 'projects.html'],
        ['Configurações', 'settings.html'],
        ['Meu perfil', 'profile.html']
    ];
    const search = { items: [], active: 0, trigger: null };
    function searchGroups(query) {
        const q = norm(query);
        const has = (...values) => values.some((v) => norm(v).includes(q));
        const taskItem = (t) => ({ label: t.titulo, hint: t.categoria || '', run: () => openTask(t.id_tarefa) });
        const noticeItem = (n) => ({
            label: n.titulo,
            hint: noticeMeta(n).split(',')[0],
            run: () => openNotice(n.id_aviso, 'notice.html?id=' + encodeURIComponent(n.id_aviso))
        });
        if (!q) {
            const now = sortTasks(openTasks().filter((t) => ['late', 'today'].includes(bucket(t))));
            return [
                ['Para agora', (now.length ? now : sortTasks(openTasks())).slice(0, 4).map(taskItem)],
                ['Avisos não lidos', state.notices.filter(isUnread).slice(0, 3).map(noticeItem)]
            ];
        }
        return [
            ['Tarefas', sortTasks(openTasks().filter((t) => has(t.titulo, t.categoria))).slice(0, 5).map(taskItem)],
            ['Avisos', state.notices.filter((n) => has(n.titulo, n.referencia)).slice(0, 5).map(noticeItem)],
            [
                'Disciplinas',
                state.subjects
                    .filter((s) => has(s.nome, s.professor, s.turma))
                    .slice(0, 5)
                    .map((s) => ({ label: s.nome, hint: s.professor || s.turma || '', run: () => (location.href = 'classes.html') }))
            ],
            [
                'Datas',
                upcoming()
                    .filter((e) => has(e.title, e.categoryLabel, e.place))
                    .slice(0, 5)
                    .map((e) => ({ label: e.title, hint: whenText(e), run: () => (location.href = 'calendar.html') }))
            ],
            [
                'Documentos',
                state.docs
                    .filter((d) => has(d.titulo, d.protocolo))
                    .slice(0, 5)
                    .map((d) => ({ label: d.titulo, hint: DOC_STATUS[d.status] || '', run: () => (location.href = 'documents.html') }))
            ],
            ['Páginas', PAGES.filter(([label]) => has(label)).map(([label, href]) => ({ label, hint: 'Página', run: () => (location.href = href) }))]
        ];
    }
    function renderSearch() {
        const input = $('dbSearchInput');
        const box = $('dbSearchResults');
        const groups = searchGroups(input.value).filter(([, items]) => items.length);
        search.items = groups.flatMap(([, items]) => items);
        search.active = Math.min(search.active, Math.max(0, search.items.length - 1));
        let i = 0;
        box.innerHTML = groups.length
            ? groups
                  .map(
                      ([name, items]) =>
                          '<div class="db-search-group" role="presentation">' + esc(name) + '</div>' +
                          items
                              .map((item) => {
                                  const idx = i++;
                                  return (
                                      '<div class="db-search-item" role="option" id="dbOpt' + idx + '" data-index="' + idx +
                                      '" aria-selected="' + (idx === search.active) + '"><span>' + esc(item.label) +
                                      '</span>' + (item.hint ? '<small>' + esc(item.hint) + '</small>' : '') + '</div>'
                                  );
                              })
                              .join('')
                  )
                  .join('')
            : '<p class="db-search-empty">' +
              (input.value.trim() ? 'Nada encontrado para “' + esc(input.value.trim()) + '”.' : 'Nada pendente agora.') +
              '</p>';
        input.setAttribute('aria-activedescendant', search.items.length ? 'dbOpt' + search.active : '');
    }
    function setActive(index) {
        if (!search.items.length) return;
        search.active = (index + search.items.length) % search.items.length;
        doc.querySelectorAll('.db-search-item').forEach((el) =>
            el.setAttribute('aria-selected', String(Number(el.dataset.index) === search.active))
        );
        const el = $('dbOpt' + search.active);
        el?.scrollIntoView?.({ block: 'nearest' });
        $('dbSearchInput').setAttribute('aria-activedescendant', 'dbOpt' + search.active);
    }
    function openSearch(trigger) {
        const layer = $('dbSearch');
        if (!layer.hidden) return;
        closeAccount(false);
        search.trigger = trigger || doc.activeElement;
        search.active = 0;
        $('dbSearchInput').value = '';
        layer.hidden = false;
        renderSearch();
        $('dbSearchInput').focus();
    }
    function closeSearch(restore = true) {
        const layer = $('dbSearch');
        if (layer.hidden) return;
        layer.hidden = true;
        if (restore) search.trigger?.focus?.();
    }
    function runActive(index = search.active) {
        const item = search.items[index];
        if (!item) return;
        closeSearch(false);
        item.run();
    }
    function openTask(id) {
        const show = () => $('dbTask-' + id);
        if (!show()) setFilter('all');
        const row = show();
        if (!row) return (location.href = 'tasks.html');
        jump('dbTodo');
        row.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
        row.classList.add('is-flash');
        setTimeout(() => row.classList.remove('is-flash'), 1800);
        row.querySelector('.db-check')?.focus({ preventScroll: true });
    }

    // ---------- Menu de conta ----------
    function openAccount() {
        $('dbAccountMenu').hidden = false;
        $('dbAccountBtn').setAttribute('aria-expanded', 'true');
        $('dbAccountMenu').querySelector('[role="menuitem"]')?.focus();
    }
    function closeAccount(restore = true) {
        const menu = $('dbAccountMenu');
        if (!menu || menu.hidden) return;
        menu.hidden = true;
        $('dbAccountBtn').setAttribute('aria-expanded', 'false');
        if (restore) $('dbAccountBtn').focus();
    }

    // ---------- Menu lateral, recolher, submenus e gaveta ----------
    const media = (q) => window.matchMedia?.(q) || { matches: false, addEventListener() {} };
    const mqMobile = media('(max-width: 899px)');
    const mqNotebook = media('(min-width: 900px) and (max-width: 1199px)');
    const side = { collapsed: false, notebookOpen: false, drawer: false };
    function layoutSide() {
        const body = doc.body;
        const mobile = mqMobile.matches;
        const notebook = mqNotebook.matches;
        const rail = mobile ? false : notebook ? !side.notebookOpen : side.collapsed;
        body.classList.toggle('is-rail', rail);
        body.classList.toggle('is-overlay-side', notebook && side.notebookOpen);
        body.classList.toggle('is-drawer', mobile && side.drawer);
        const sidebar = $('dbSide');
        const button = $('dbCollapse');
        const label = mobile ? 'Fechar menu' : rail ? 'Expandir menu' : 'Recolher menu';
        button.setAttribute('aria-label', label);
        button.title = label;
        button.setAttribute('aria-expanded', String(mobile ? side.drawer : !rail));
        sidebar.inert = mobile && !side.drawer;
        if (mobile && side.drawer) {
            sidebar.setAttribute('role', 'dialog');
            sidebar.setAttribute('aria-modal', 'true');
        } else {
            sidebar.removeAttribute('role');
            sidebar.removeAttribute('aria-modal');
        }
        const shell = doc.querySelector('.db-shell');
        const bottom = doc.querySelector('.db-bottom');
        if (shell) shell.inert = mobile && side.drawer;
        if (bottom) bottom.inert = mobile && side.drawer;
        $('dbDrawerOpen')?.setAttribute('aria-expanded', String(mobile && side.drawer));
        const overlay = $('dbOverlay');
        const showOverlay = mobile && side.drawer;
        if (showOverlay) {
            overlay.hidden = false;
            requestAnimationFrame(() => overlay.classList.add('is-visible'));
        } else if (!overlay.hidden) {
            overlay.classList.remove('is-visible');
            setTimeout(() => {
                if (!doc.body.classList.contains('is-drawer')) overlay.hidden = true;
            }, reducedMotion() ? 0 : 300);
        }
        if (rail)
            doc.querySelectorAll('.db-nav-group > button').forEach((b) => b.setAttribute('aria-expanded', 'false'));
        doc.querySelectorAll('.db-nav-group > button').forEach((b) => {
            const panel = $(b.getAttribute('aria-controls'));
            if (panel) panel.hidden = b.getAttribute('aria-expanded') !== 'true';
        });
    }
    function expandSide() {
        if (mqNotebook.matches) side.notebookOpen = true;
        else {
            side.collapsed = false;
            store.set('arcadia-sidebar-collapsed', 0);
        }
    }
    function openDrawer() {
        side.drawer = true;
        layoutSide();
        $('dbSide').querySelector('a, button')?.focus();
    }
    function closeDrawer(restore = true) {
        if (!side.drawer) return;
        side.drawer = false;
        layoutSide();
        if (restore) $('dbDrawerOpen')?.focus();
    }

    // ---------- Render ----------
    function renderAll() {
        renderGreeting();
        renderNow();
        renderProgress();
        renderTasks();
        renderClasses();
        renderCounters();
    }

    async function load() {
        if (!A.auth.exigirLogin()) return;
        renderAccount();
        const get = (path) => api.expect(api.get(path));
        const [tasks, unread, read, notices, events, docs, classes] = await Promise.allSettled([
            get('/api/tasks'),
            get('/api/read-notices/unread/count'),
            get('/api/read-notices'),
            get('/api/notices'),
            get('/api/calendar'),
            get('/api/documents/my'),
            get('/api/classes')
        ]);
        const value = (r, fallback) => (r.status === 'fulfilled' ? r.value : fallback);
        const failed = [tasks, unread, notices, events].filter((r) => r.status === 'rejected');
        if (failed.length) toast(failed[0].reason?.message || 'Não foi possível carregar parte do painel.');

        state.tasks = Array.isArray(value(tasks)) ? tasks.value : [];
        state.unread = Number(value(unread, {})?.unread) || 0;
        state.readIds = new Set((value(read, []) || []).map((r) => String(r.id_aviso ?? r)));
        state.notices = (Array.isArray(value(notices)) ? notices.value : []).filter(
            (n) => !n.situacao || n.situacao === 'publicado'
        );
        state.events = Array.isArray(value(events)) ? events.value : [];
        state.docs = Array.isArray(value(docs)) ? docs.value : [];
        state.subjects = (value(classes, {}) || {}).subjects || [];
        state.role = (value(classes, {}) || {}).role || A.auth.getSessao()?.tipo_usuario;
        state.loaded = true;

        renderAll();
        renderNotices();
        renderDates();
        renderDocuments(docs.status === 'rejected');
        // Turmas pode não estar habilitado no banco (503): o cartão avisa, sem quebrar o resto.
        if (classes.status === 'rejected') renderClasses(true);
        if (tasks.status === 'rejected') $('dbTasks').innerHTML = '<p class="db-muted">Não foi possível carregar as tarefas.</p>';
        if (notices.status === 'rejected') $('dbNotices').innerHTML = '<li class="db-muted">Não foi possível carregar os avisos.</li>';
        if (events.status === 'rejected') $('dbDates').innerHTML = '<li class="db-muted">Não foi possível carregar o calendário.</li>';
    }

    function wire() {
        const on = (id, event, fn) => $(id)?.addEventListener(event, fn);
        A.showToast = (message, actionLabel, onAction, duration) =>
            toast(plainText(message), actionLabel, onAction, duration);

        // Menu lateral
        side.collapsed = !!store.get('arcadia-sidebar-collapsed', 0);
        layoutSide();
        on('dbCollapse', 'click', () => {
            if (mqMobile.matches) return closeDrawer();
            if (mqNotebook.matches) side.notebookOpen = !side.notebookOpen;
            else {
                side.collapsed = !side.collapsed;
                store.set('arcadia-sidebar-collapsed', side.collapsed ? 1 : 0);
            }
            layoutSide();
        });
        doc.querySelectorAll('.db-nav-group > button').forEach((button) =>
            button.addEventListener('click', () => {
                const rail = doc.body.classList.contains('is-rail');
                if (rail) expandSide();
                button.setAttribute('aria-expanded', String(rail || button.getAttribute('aria-expanded') !== 'true'));
                layoutSide();
            })
        );
        on('dbDrawerOpen', 'click', openDrawer);
        on('dbOverlay', 'click', () => closeDrawer());
        on('dbSide', 'click', (e) => {
            if (mqMobile.matches && e.target.closest('a[href]')) closeDrawer(false);
        });
        on('dbSide', 'keydown', (e) => {
            if (!(mqMobile.matches && side.drawer)) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDrawer();
            } else if (e.key === 'Tab') {
                const items = [...$('dbSide').querySelectorAll('a[href], button')].filter((el) => el.getClientRects().length);
                const first = items[0];
                const last = items[items.length - 1];
                if (e.shiftKey && doc.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && doc.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
        [mqMobile, mqNotebook].forEach((mq) =>
            mq.addEventListener('change', () => {
                side.drawer = false;
                side.notebookOpen = false;
                layoutSide();
            })
        );

        // Atalhos para seções (saudação, barra inferior)
        doc.addEventListener('click', (e) => {
            const link = e.target.closest?.('[data-jump]');
            if (link) {
                e.preventDefault();
                if (link.dataset.setFilter) setFilter(link.dataset.setFilter);
                if (link.closest('.db-bottom')) {
                    doc.querySelectorAll('.db-bottom [data-jump]').forEach((a) => a.removeAttribute('aria-current'));
                    link.setAttribute('aria-current', 'page');
                }
                if (link.dataset.jump === 'dbHello') window.scrollTo?.({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
                jump(link.dataset.jump);
            }
            if (e.target.closest?.('[data-focus-add]')) $('dbAddInput').focus();
            const download = e.target.closest?.('[data-download]');
            if (download) downloaded(download);
            const account = $('dbAccountMenu');
            if (account && !account.hidden && !e.target.closest('.db-account')) closeAccount(false);
        });

        // A fazer
        on('dbTasks', 'click', (e) => {
            const button = e.target.closest('.db-check');
            if (button) complete(button.closest('.db-task').dataset.id, button.closest('.db-task'), button);
        });
        doc.querySelectorAll('.db-chip[data-filter]').forEach((chip) =>
            chip.addEventListener('click', () => setFilter(chip.dataset.filter))
        );
        on('dbAddForm', 'submit', addTask);

        // Avisos
        on('dbReadAll', 'click', readAll);
        on('dbNotices', 'click', (e) => {
            const row = e.target.closest('[data-notice]');
            if (!row || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            openNotice(row.dataset.notice, row.getAttribute('href'));
        });

        // Próximo compromisso
        on('dbNow', 'click', (e) => {
            if (e.target.closest('#dbRemind') && nowItem) toggleReminder(nowItem);
        });

        // Busca: Ctrl K (antes do atalho genérico do portal), campo ou ícone
        window.addEventListener(
            'keydown',
            (e) => {
                if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if ($('dbSearch').hidden) openSearch();
                    else closeSearch();
                }
            },
            true
        );
        on('dbSearchOpen', 'click', (e) => openSearch(e.currentTarget));
        on('dbSearchOpenMobile', 'click', (e) => openSearch(e.currentTarget));
        on('dbSearchInput', 'input', () => {
            search.active = 0;
            renderSearch();
        });
        on('dbSearchInput', 'keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(search.active + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(search.active - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                runActive();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSearch();
            } else if (e.key === 'Tab') e.preventDefault();
        });
        on('dbSearchResults', 'mousemove', (e) => {
            const item = e.target.closest('.db-search-item');
            if (item && Number(item.dataset.index) !== search.active) setActive(Number(item.dataset.index));
        });
        on('dbSearchResults', 'click', (e) => {
            const item = e.target.closest('.db-search-item');
            if (item) runActive(Number(item.dataset.index));
        });
        on('dbSearch', 'mousedown', (e) => {
            if (e.target === e.currentTarget) closeSearch();
        });

        // Menu de conta
        on('dbAccountBtn', 'click', () => ($('dbAccountMenu').hidden ? openAccount() : closeAccount()));
        on('dbAccountMenu', 'keydown', (e) => {
            const items = [...$('dbAccountMenu').querySelectorAll('[role="menuitem"]')];
            const i = items.indexOf(doc.activeElement);
            if (e.key === 'Escape') {
                e.preventDefault();
                closeAccount();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
            } else if (e.key === 'Tab') closeAccount(false);
        });

        restoreReminders();
        setInterval(tickCountdown, 15000);
        load().catch((e) => showError(e, 'Não foi possível conectar ao servidor.'));
    }

    // Exposto para testes e para a busca de outras telas no futuro.
    A.dashboard = { state, bucket, streaks, upcoming, countdown, searchGroups };

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire);
    else wire();
})(window.Arcadia);
