// dashboard.js: "Meu painel" v3 (depende de api.js, auth.js, portal.js, tasks.js e calendar-categories.js).
// Segue "Arcadia Meu Painel - Especificação v3" dentro da moldura existente do portal: o menu lateral
// (navigation.js), a barra superior (topbar.js), a ajuda (page-help.js), a aparência dos banners
// (class-appearance.js) e a navegação progressiva continuam sendo os mesmos; aqui ficam só os cartões,
// a barra inferior e a busca do painel. Só usa rotas que já existem no backend.
// Montado por pages.js (A.pages.mount) tanto no carregamento normal quanto na navegação progressiva.
// Referências de design de cada bloco: docs/referencias-design.md
(function (A) {
    'use strict';
    if (!A) return;
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
    function dayWord(day) {
        const n = daysUntil(day);
        if (n === 0) return 'hoje';
        if (n === 1) return 'amanhã';
        if (n === -1) return 'ontem';
        if (n > 1 && n < 7) return WEEKDAYS_LONG[weekday(day)];
        return ddmm(day);
    }
    function weekRange() {
        const t = today();
        const dow = weekday(t);
        const monday = addDays(t, dow === 0 ? -6 : 1 - dow);
        return { monday, sunday: addDays(monday, 6), days: [0, 1, 2, 3, 4].map((i) => addDays(monday, i)) };
    }

    // ---------- Regras puras (testáveis sem DOM) ----------
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
    const matchesFilter = (t, filter) =>
        filter === 'late' ? bucket(t) === 'late' : filter === 'week' ? ['today', 'week'].includes(bucket(t)) : true;
    function sortTasks(list) {
        const order = { late: 0, today: 1, week: 2, later: 3, none: 4 };
        return list.sort(
            (a, b) =>
                order[bucket(a)] - order[bucket(b)] ||
                ymd(a.data_entrega).localeCompare(ymd(b.data_entrega)) ||
                Number(a.id_tarefa) - Number(b.id_tarefa)
        );
    }
    // Sequência: entregas concluídas até o prazo, contadas da mais recente para trás.
    function streaks(tasks) {
        const done = tasks
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
    // Próximo compromisso: só eventos do calendário que ainda não terminaram.
    function upcoming(events, now = new Date()) {
        const t = localYmd(now);
        const minutesNow = now.getHours() * 60 + now.getMinutes();
        const toMin = (v) => {
            const [h, m] = hhmm(v).split(':').map(Number);
            return h * 60 + m;
        };
        return events
            .map((e) => {
                const start = ymd(e.data_evento);
                const end = ymd(e.data_fim) || start;
                if (!start || end < t) return null;
                if (start === t && end === t && e.hora_fim && minutesNow > toMin(e.hora_fim)) return null;
                const category = A.calendarCategories?.canonical(e.categoria);
                const day = start < t ? t : start;
                return {
                    id: e.id_evento,
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
    function countdown(item, now = new Date()) {
        const n = daysUntil(item.day);
        if (n === 0 && item.time) {
            const mins = Math.ceil((startOf(item) - now) / 6e4);
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
    function noticeMeta(n) {
        const type = n.tipo_publicacao === 'noticia' ? 'Notícia' : 'Aviso';
        const day = ymd(n.data_publicacao);
        const when = day ? ' de ' + (['hoje', 'ontem'].includes(dayWord(day)) ? dayWord(day) : ddmm(day)) : '';
        return [type + when, n.referencia].filter(Boolean).join(', ');
    }

    const DOWNLOADED_KEY = 'arcadia-dashboard-downloads';
    const DOC_STATUS = { solicitado: 'Solicitado', em_analise: 'Em análise', pendente: 'Pendente', pronto: 'Pronto' };
    const PAGES = [
        ['Início', 'index.html'],
        ['Tarefas', 'tasks.html'],
        ['Documentos', 'documents.html'],
        ['Turmas', 'classes.html'],
        ['Avisos e notícias', 'notices.html'],
        ['Calendário', 'calendar.html'],
        ['Pessoas', 'people.html'],
        ['Projetos', 'projects.html'],
        ['Mapa do campus', 'campus-map.html'],
        ['Configurações', 'settings.html']
    ];
    const MAX_TASKS = 8;
    const MAX_NOTICES = 4;

    /**
     * Monta o painel dentro de `root` (o <main> da página).
     * options.api: cliente da API (pages.js passa um que cancela as requisições ao desmontar).
     * Retorna { ready, dispose }.
     */
    function mount(options = {}) {
        const root = options.root || document;
        const doc = document;
        const api = options.api || A.api;
        const $ = (id) => root.querySelector?.('#' + id) || doc.getElementById?.(id) || null;
        const cleanups = [];
        let active = true;
        const listen = (target, type, handler, opts) => {
            if (!target?.addEventListener) return;
            target.addEventListener(type, handler, opts);
            cleanups.push(() => target.removeEventListener?.(type, handler, opts));
        };
        const later = (fn, ms) => {
            const id = setTimeout(() => active && fn(), ms);
            cleanups.push(() => clearTimeout(id));
            return id;
        };
        const reducedMotion = () =>
            doc.documentElement?.getAttribute?.('data-motion') === 'reduced' ||
            !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        // O toast do portal (portal.js) recebe HTML: sempre passamos texto escapado.
        const toast = (message, actionLabel, onAction, duration) =>
            A.showToast?.(esc(message), actionLabel, onAction, duration);
        const showError = (e, fallback) => toast(e?.message || fallback);

        const state = {
            tasks: [],
            events: [],
            notices: [],
            docs: [],
            subjects: [],
            reminders: [],
            readIds: new Set(),
            unread: 0,
            filter: 'all',
            role: '',
            loaded: false
        };
        const openTasks = () => state.tasks.filter((t) => t.status !== 'concluida');
        const isUnread = (n) => !state.readIds.has(String(n.id_aviso));

        // ---------- Ir para uma seção: rolagem suave, folga de 88, destaque de 1,8 s ----------
        function flash(target) {
            target.classList.add('is-flash');
            later(() => target.classList.remove('is-flash'), 1800);
        }
        function jump(id) {
            const target = $(id);
            if (!target) return;
            target.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
            flash(target.matches?.('.db-row') ? target.querySelector('.db-card') || target : target);
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus?.({ preventScroll: true });
        }

        // ---------- Boas-vindas ----------
        function renderGreeting() {
            $('dbToday').textContent = new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            const s = A.auth.getSessao?.() || {};
            const greet = $('painelUserGreeting');
            if (greet && !greet.textContent.trim()) greet.textContent = s.nome ? s.nome.split(' ')[0] : 'você';
            const open = openTasks();
            const late = open.filter((t) => bucket(t) === 'late').length;
            const due = open.filter((t) => bucket(t) === 'today').length;
            const events = upcoming(state.events).filter((e) => e.day === today()).length;
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
                    ' ' +
                    link('dbNoticesCard', state.unread === 1 ? '1 aviso novo' : state.unread + ' avisos novos') +
                    ' te esperando.';
            $('dbSummary').innerHTML = text;
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

            const s = streaks(state.tasks);
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

        // ---------- Próximo compromisso e lembrete (rota /api/reminders) ----------
        let nowItem = null;
        let localAlert = null;
        const reminderFor = (item) =>
            state.reminders.find(
                (r) =>
                    (r.ativo === true || Number(r.ativo) === 1) &&
                    item.id != null &&
                    Number(r.id_evento) === Number(item.id) &&
                    Math.abs(new Date(r.agendado_utc).getTime() - (startOf(item).getTime() - 10 * 6e4)) < 6e4
            );
        // Com a página aberta, também avisa na tela (o sino e o e-mail seguem as regras do portal).
        function scheduleLocalAlert() {
            clearTimeout(localAlert);
            if (!nowItem || !startOf(nowItem) || !reminderFor(nowItem)) return;
            const wait = startOf(nowItem).getTime() - 10 * 6e4 - Date.now();
            if (wait < 0 || wait > 2 ** 31 - 1) return;
            const item = nowItem;
            localAlert = later(() => toast('Em 10 min: ' + item.title, null, null, 10000), wait);
        }
        async function toggleReminder(item, button) {
            const start = startOf(item);
            if (!start || item.id == null) return;
            const current = reminderFor(item);
            button.disabled = true;
            try {
                if (current) {
                    await api.expect(api.put('/api/reminders/' + encodeURIComponent(current.id_lembrete), { ativo: false }));
                    current.ativo = false;
                    toast('Lembrete desativado.');
                } else {
                    const at = new Date(Math.max(start.getTime() - 10 * 6e4, Date.now() + 6e4));
                    at.setSeconds(0, 0);
                    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Belem';
                    const created = await api.expect(
                        api.post('/api/reminders', {
                            titulo: item.title,
                            descricao: [item.categoryLabel, item.place].filter(Boolean).join(', ') || null,
                            tipo: 'evento',
                            id_evento: Number(item.id),
                            fuso_horario: zone,
                            agendado_utc: at.toISOString(),
                            ativo: true,
                            enviar_email: false
                        })
                    );
                    state.reminders.push({
                        ...(created && typeof created === 'object' ? created : {}),
                        id_lembrete: created?.id_lembrete ?? created?.id,
                        id_evento: item.id,
                        agendado_utc: at.toISOString(),
                        ativo: true
                    });
                    toast(
                        'Lembrete ativado para ' +
                            at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) +
                            '. Ele aparece em Notificações.'
                    );
                }
            } catch (e) {
                if (e?.name !== 'AbortError') showError(e, 'Não foi possível salvar o lembrete.');
            }
            if (active) renderNow();
        }
        function renderNow() {
            const box = $('dbNow');
            if (!state.loaded || !box) return;
            const [first] = upcoming(state.events);
            nowItem = first || null;
            if (!first) {
                box.innerHTML =
                    '<h2 class="db-now-title">Agenda livre</h2>' +
                    '<p class="db-now-free">Nenhum evento no calendário nos próximos dias.</p>' +
                    '<div class="db-now-actions"><a class="db-btn db-btn--ghost-blue" href="calendar.html">Abrir calendário</a></div>';
                return;
            }
            const start = startOf(first);
            const canRemind = start && first.id != null && start.getTime() > Date.now();
            const on = canRemind && !!reminderFor(first);
            box.innerHTML =
                '<div><h2 class="db-now-title"><a href="calendar.html">' + esc(first.title) + '</a></h2>' +
                (first.categoryLabel || first.place
                    ? '<p class="db-now-place">' + esc([first.categoryLabel, first.place].filter(Boolean).join(' no ')) + '</p>'
                    : '') +
                '</div>' +
                '<p class="db-now-when"><span class="db-countdown" id="dbCountdown">' + esc(countdown(first)) + '</span>' +
                '<span>' + esc(whenText(first)) + '</span></p>' +
                '<div class="db-now-actions">' +
                (canRemind
                    ? '<button type="button" class="db-btn db-btn--on-blue' + (on ? ' is-on' : '') +
                      '" id="dbRemind" aria-pressed="' + on + '">' +
                      (on ? ICON.check + 'Lembrete ativado' : ICON.bell + 'Lembrar 10 min antes') + '</button>'
                    : '') +
                '<a class="db-btn db-btn--ghost-blue" href="calendar.html">Abrir calendário</a></div>';
            scheduleLocalAlert();
        }
        // A contagem atualiza a cada 15 s sem redesenhar o cartão.
        function tickCountdown() {
            const pill = $('dbCountdown');
            const [first] = upcoming(state.events);
            if (!nowItem || !pill || !first || first.key !== nowItem.key) return renderNow();
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
            root.querySelectorAll?.('[data-count]').forEach((el) => (el.textContent = counts[el.dataset.count]));
            root.querySelectorAll?.('.db-chip[data-filter]').forEach((chip) =>
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
            const before = task.status;
            const wait = new Promise((r) => setTimeout(r, 650));
            try {
                await A.tasks.concluir(task.id_tarefa);
            } catch (e) {
                if (!active) return;
                button.disabled = false;
                button.setAttribute('aria-checked', 'false');
                row.classList.remove('is-done');
                return showError(e, 'Não foi possível concluir a tarefa.');
            }
            const wasLate = bucket(task) === 'late';
            task.status = 'concluida';
            task.concluida_em = today();
            await wait;
            if (!active) return;
            row.classList.add('is-leaving');
            later(() => {
                renderAll();
                const s = streaks(state.tasks).current;
                toast('Tarefa concluída' + (!wasLate && s > 1 ? '. Sequência: ' + s : ''), 'Desfazer', async () => {
                    const status = before === 'concluida' ? 'aberta' : before;
                    try {
                        await A.tasks.patch(task.id_tarefa, { status });
                        task.status = status;
                        task.concluida_em = null;
                        if (active) renderAll();
                    } catch (e) {
                        showError(e, 'Não foi possível reabrir a tarefa.');
                    }
                });
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
                if (e?.name !== 'AbortError') showError(e, 'Não foi possível adicionar a tarefa.');
            } finally {
                if (button) button.disabled = false;
                if (active) input.focus();
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
                return (
                    '<span class="db-pill db-pill--white">Entrega ' +
                    (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : WEEKDAYS_LONG[weekday(due)]) + '</span>'
                );
            }
            return '<span class="db-pill db-pill--white">Em dia</span>';
        }
        function renderClasses(error) {
            const box = $('dbClasses');
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

        // ---------- Contadores (cartões, menu lateral e barra inferior) ----------
        // Os contadores entram no menu existente (navigation.js) e saem quando o painel é desmontado.
        function sideBadge(href, value, soft) {
            const link = doc.querySelector?.('#portalSidebar a[href="' + href + '"]');
            if (!link) return;
            let badge = link.querySelector('.db-nav-count');
            if (!value) return badge?.remove();
            if (!badge) {
                badge = doc.createElement('span');
                badge.className = 'db-nav-count' + (soft ? ' db-nav-count--soft' : '');
                badge.setAttribute('aria-hidden', 'true');
                link.append(badge);
            }
            badge.textContent = value;
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
            set('dbBottomTasks', open);
            set('dbBottomNotices', state.unread);
            sideBadge('tasks.html', open);
            sideBadge('notices.html', state.unread);
            sideBadge('documents.html', ready ? plural(ready, 'pronto', 'prontos') : '', true);
            const count = $('dbNoticeCount');
            count.textContent = state.unread;
            count.classList.toggle('is-zero', !state.unread);
        }

        // ---------- Avisos e notícias ----------
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
            const pending = state.notices.filter(isUnread).map((n) => n.id_aviso);
            if (!pending.length) return;
            $('dbReadAll').disabled = true;
            // O título passa para lido na hora; o servidor confirma em seguida.
            pending.forEach((id) => state.readIds.add(String(id)));
            state.unread = Math.max(0, state.unread - pending.length);
            renderNotices();
            renderGreeting();
            pending.forEach((id) => state.readIds.delete(String(id)));
            const results = await markRead(pending);
            if (!active) return;
            renderNotices();
            renderGreeting();
            if (results.some((r) => r.status === 'rejected')) toast('Alguns avisos não puderam ser marcados como lidos.');
            else toast(plural(pending.length, 'aviso marcado', 'avisos marcados') + ' como lido' + (pending.length === 1 ? '' : 's') + '.');
        }
        // Marca como lido e segue o link; a navegação progressiva do portal cuida da troca de tela.
        function readOne(id) {
            if (state.readIds.has(String(id))) return;
            state.readIds.add(String(id));
            state.unread = Math.max(0, state.unread - 1);
            renderNotices();
            renderGreeting();
            // Usa o cliente global: a requisição não pode ser cancelada pela troca de tela que vem logo depois.
            A.api.expect(A.api.post('/api/read-notices/' + encodeURIComponent(id))).catch(() => {});
        }
        const go = (href) => (A.progressiveNavigation?.navigate ? A.progressiveNavigation.navigate(href) : (location.href = href));

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
                              (sub ? '<span class="db-date-sub">' + esc(sub) + '</span>' : '') +
                              '</span></a></li>'
                          );
                      })
                      .join('')
                : '<li class="db-muted">Nenhuma data próxima no calendário.</li>';
        }

        // ---------- Documentos solicitados ----------
        const safeUrl = (v) => {
            const base = api.BASE || A.api?.BASE || location.href || undefined;
            for (const attempt of [() => new URL(v), () => new URL(v, base)]) {
                try {
                    const u = attempt();
                    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
                } catch {}
            }
            return '';
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
                : '<li class="db-muted db-muted--flush">Nenhum documento solicitado ainda.</li>';
        }
        function markDownloaded(link) {
            const all = new Set(store.get(DOWNLOADED_KEY, []) || []);
            all.add(String(link.dataset.download));
            store.set(DOWNLOADED_KEY, [...all]);
            // Deixa o navegador abrir o arquivo antes de trocar o botão.
            later(() => {
                link.innerHTML = ICON.download + 'Baixar de novo';
                const sub = link.closest('.db-doc')?.querySelector('.db-doc-sub');
                if (sub) sub.textContent = 'Baixado agora há pouco';
            }, 0);
            toast('Download iniciado.');
        }

        // ---------- Busca (Ctrl K) ----------
        // Agrupa tarefas, avisos, disciplinas, datas, documentos e áreas; ignora acento e caixa.
        // A busca completa do portal (portal.js) continua disponível no último item.
        const search = { items: [], active: 0, trigger: null };
        function searchGroups(query) {
            const q = norm(query);
            const has = (...values) => values.some((v) => norm(v).includes(q));
            const taskItem = (t) => ({ label: t.titulo, hint: t.categoria || '', run: () => openTask(t.id_tarefa) });
            const noticeItem = (n) => ({
                label: n.titulo,
                hint: noticeMeta(n).split(',')[0],
                run: () => {
                    readOne(n.id_aviso);
                    go('notice.html?id=' + encodeURIComponent(n.id_aviso));
                }
            });
            const portal = A.openCommandPalette
                ? [['Portal', [{ label: q ? 'Buscar “' + query.trim() + '” no portal inteiro' : 'Ir para uma área do portal', hint: 'Busca completa', run: () => openPortalSearch(query) }]]]
                : [];
            if (!q) {
                const now = sortTasks(openTasks().filter((t) => ['late', 'today'].includes(bucket(t))));
                return [
                    ['Para agora', (now.length ? now : sortTasks(openTasks())).slice(0, 4).map(taskItem)],
                    ['Avisos não lidos', state.notices.filter(isUnread).slice(0, 3).map(noticeItem)],
                    ...portal
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
                        .map((s) => ({ label: s.nome, hint: s.professor || s.turma || '', run: () => go('classes.html') }))
                ],
                [
                    'Datas',
                    upcoming(state.events)
                        .filter((e) => has(e.title, e.categoryLabel, e.place))
                        .slice(0, 5)
                        .map((e) => ({ label: e.title, hint: whenText(e), run: () => go('calendar.html') }))
                ],
                [
                    'Documentos',
                    state.docs
                        .filter((d) => has(d.titulo, d.protocolo))
                        .slice(0, 5)
                        .map((d) => ({ label: d.titulo, hint: DOC_STATUS[d.status] || '', run: () => go('documents.html') }))
                ],
                ['Áreas', PAGES.filter(([label]) => has(label)).map(([label, href]) => ({ label, hint: 'Página', run: () => go(href) }))],
                ...portal
            ];
        }
        function openPortalSearch(query) {
            A.openCommandPalette();
            const target = doc.querySelector('#ar-pal-input');
            if (target && query) {
                target.value = query;
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
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
            if (search.items.length) input.setAttribute('aria-activedescendant', 'dbOpt' + search.active);
            else input.removeAttribute('aria-activedescendant');
        }
        function setActive(index) {
            if (!search.items.length) return;
            search.active = (index + search.items.length) % search.items.length;
            root.querySelectorAll('.db-search-item').forEach((el) =>
                el.setAttribute('aria-selected', String(Number(el.dataset.index) === search.active))
            );
            $('dbOpt' + search.active)?.scrollIntoView?.({ block: 'nearest' });
            $('dbSearchInput').setAttribute('aria-activedescendant', 'dbOpt' + search.active);
        }
        function openSearch(trigger, value = '') {
            const layer = $('dbSearch');
            if (!layer.hidden) return;
            search.trigger = trigger || doc.activeElement;
            search.active = 0;
            $('dbSearchInput').value = value;
            layer.hidden = false;
            layer.setAttribute('data-shell-overlay', 'open');
            renderSearch();
            $('dbSearchInput').focus();
        }
        function closeSearch(restore = true) {
            const layer = $('dbSearch');
            if (!layer || layer.hidden) return;
            layer.hidden = true;
            layer.removeAttribute('data-shell-overlay');
            if (restore) search.trigger?.focus?.({ preventScroll: true });
        }
        function runActive(index = search.active) {
            const item = search.items[index];
            if (!item) return;
            closeSearch(false);
            item.run();
        }
        function openTask(id) {
            if (!$('dbTask-' + id)) setFilter('all');
            const row = $('dbTask-' + id);
            if (!row) return go('tasks.html');
            row.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
            flash(row);
            row.querySelector('.db-check')?.focus({ preventScroll: true });
        }

        // ---------- Render e carregamento ----------
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
            const session = A.auth.getSessao() || {};
            if (session.tipo_usuario === 'externo') return;
            const get = (path) => api.expect(api.get(path));
            const paths = [
                '/api/tasks',
                '/api/read-notices/unread/count',
                '/api/read-notices',
                '/api/notices',
                '/api/calendar',
                '/api/documents/my',
                '/api/classes',
                '/api/reminders'
            ];
            const results = await Promise.allSettled(paths.map(get));
            if (!active) return;
            const [tasks, unread, read, notices, events, docs, classes, reminders] = results;
            const value = (r, fallback) => (r.status === 'fulfilled' ? r.value : fallback);
            const failed = [tasks, unread, notices, events].find(
                (r) => r.status === 'rejected' && r.reason?.name !== 'AbortError'
            );
            if (failed) toast(failed.reason?.message || 'Não foi possível carregar parte do painel.');

            state.tasks = Array.isArray(value(tasks)) ? tasks.value : [];
            state.unread = Number(value(unread, {})?.unread) || 0;
            state.readIds = new Set((value(read, []) || []).map((r) => String(r?.id_aviso ?? r)));
            state.notices = (Array.isArray(value(notices)) ? notices.value : []).filter(
                (n) => !n.situacao || n.situacao === 'publicado'
            );
            state.events = Array.isArray(value(events)) ? events.value : [];
            state.docs = Array.isArray(value(docs)) ? docs.value : [];
            state.subjects = (value(classes, {}) || {}).subjects || [];
            state.role = (value(classes, {}) || {}).role || session.tipo_usuario || '';
            state.reminders = Array.isArray(value(reminders)) ? reminders.value : [];
            state.loaded = true;

            renderAll();
            renderNotices();
            renderDates();
            renderDocuments(docs.status === 'rejected');
            // Turmas pode não estar habilitado no banco (503): o cartão avisa, sem quebrar o resto.
            if (classes.status === 'rejected') renderClasses(true);
            const fail = (id, message, result) => {
                $(id).innerHTML = '<p class="db-muted">' + message + '</p>';
                A.connection?.offerRetry?.($(id), retry, result.reason);
            };
            if (tasks.status === 'rejected') fail('dbTasks', 'Não foi possível carregar as tarefas.', tasks);
            if (notices.status === 'rejected') fail('dbNotices', 'Não foi possível carregar os avisos.', notices);
            if (events.status === 'rejected') fail('dbDates', 'Não foi possível carregar o calendário.', events);
        }
        const retry = () => load().catch((e) => e?.name !== 'AbortError' && showError(e, 'Não foi possível conectar ao servidor.'));

        // ---------- Eventos ----------
        doc.documentElement?.classList?.add('db-v3-on');
        cleanups.push(() => {
            doc.documentElement?.classList?.remove('db-v3-on');
            doc.querySelectorAll?.('#portalSidebar .db-nav-count').forEach((b) => b.remove());
            closeSearch(false);
        });

        listen(root, 'click', (e) => {
            const target = e.target;
            const link = target.closest?.('[data-jump]');
            if (link) {
                e.preventDefault();
                if (link.dataset.setFilter) setFilter(link.dataset.setFilter);
                if (link.closest('.db-bottom')) {
                    root.querySelectorAll('.db-bottom [data-jump]').forEach((a) => a.removeAttribute('aria-current'));
                    link.setAttribute('aria-current', 'page');
                }
                if (link.dataset.jump === 'dbHello') window.scrollTo?.({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
                return jump(link.dataset.jump);
            }
            if (target.closest?.('#dbDrawerOpen')) return doc.querySelector('.ar-sidebar-toggle')?.click();
            if (target.closest?.('[data-focus-add]')) return $('dbAddInput').focus();
            const check = target.closest?.('.db-check');
            if (check) return complete(check.closest('.db-task').dataset.id, check.closest('.db-task'), check);
            const chip = target.closest?.('.db-chip[data-filter]');
            if (chip) return setFilter(chip.dataset.filter);
            if (target.closest?.('#dbReadAll')) return readAll();
            const remind = target.closest?.('#dbRemind');
            if (remind && nowItem) return toggleReminder(nowItem, remind);
            const download = target.closest?.('[data-download]');
            if (download) return markDownloaded(download);
            const notice = target.closest?.('[data-notice]');
            if (notice && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) readOne(notice.dataset.notice);
            const item = target.closest?.('.db-search-item');
            if (item) return runActive(Number(item.dataset.index));
            if (target === $('dbSearch')) closeSearch();
        });
        listen($('dbAddForm'), 'submit', addTask);
        listen($('dbSearchInput'), 'input', () => {
            search.active = 0;
            renderSearch();
        });
        listen($('dbSearchInput'), 'keydown', (e) => {
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
                e.stopPropagation();
                closeSearch();
            } else if (e.key === 'Tab') e.preventDefault();
        });
        listen($('dbSearchResults'), 'mousemove', (e) => {
            const item = e.target.closest?.('.db-search-item');
            if (item && Number(item.dataset.index) !== search.active) setActive(Number(item.dataset.index));
        });
        // Ctrl K abre a busca do painel antes do atalho genérico do portal (portal.js).
        listen(
            window,
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
        // O campo "Pesquisar" da barra superior (topbar.js) abre a mesma busca enquanto o painel está aberto.
        listen(
            doc,
            'input',
            (e) => {
                if (!e.target?.closest?.('.ar-preview-search')) return;
                e.stopImmediatePropagation();
                const value = e.target.value;
                e.target.value = '';
                openSearch(e.target, value);
            },
            true
        );
        listen(
            doc,
            'keydown',
            (e) => {
                if (e.key !== 'Enter' || !e.target?.closest?.('.ar-preview-search')) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                openSearch(e.target, e.target.value);
                e.target.value = '';
            },
            true
        );

        const timer = setInterval(() => active && tickCountdown(), 15000);
        cleanups.push(() => clearInterval(timer));

        const ready = load().catch((e) => {
            if (active && e?.name !== 'AbortError') showError(e, 'Não foi possível conectar ao servidor.');
        });
        return {
            ready,
            state,
            dispose() {
                active = false;
                for (const cleanup of cleanups.splice(0)) cleanup();
            }
        };
    }

    A.dashboard = { mount, bucket, streaks, upcoming, countdown, sortTasks, matchesFilter, noticeMeta };
})(typeof window === 'undefined' ? undefined : window.Arcadia);
