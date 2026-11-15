/* A autorização Google é solicitada por gesto do usuário e permanece só na memória da aba. */
(function (A) {
    'use strict';
    if (!A?.auth?.estaLogado()) return;
    const transfer = A.googleTransfer,
        endpoint = '/api/google-workspace';
    let sdkPromise,
        readyPromise,
        clientId,
        credential,
        ownerAtToken,
        accountEmail,
        sourceOrigin = location.origin;
    const owner = () => {
        const s = A.auth.getSessao();
        return [s.tipo_usuario, s.id_externo || s.id_usuario, A.token.get()].join(':');
    };
    const element = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const button = (text, action) => {
        const b = element('button', text, 'ar-btn ar-btn--secondary');
        b.type = 'button';
        if (action) b.addEventListener('click', action);
        return b;
    };
    const settingsURL = () =>
        A.auth.getSessao().tipo_usuario === 'externo'
            ? 'community-settings.html#googleIntegration'
            : 'settings.html#googleIntegration';
    function loadSDK() {
        if (window.google?.accounts?.oauth2) return Promise.resolve();
        if (!sdkPromise)
            sdkPromise = new Promise((resolve, reject) => {
                const script = element('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                const timer = setTimeout(() => {
                    script.remove();
                    sdkPromise = null;
                    reject(
                        Error('Não foi possível carregar a autorização Google. Confira a conexão.')
                    );
                }, 15000);
                script.onload = () => {
                    clearTimeout(timer);
                    if (window.google?.accounts?.oauth2) resolve();
                    else {
                        sdkPromise = null;
                        reject(Error('Autorização Google indisponível.'));
                    }
                };
                script.onerror = () => {
                    clearTimeout(timer);
                    script.remove();
                    sdkPromise = null;
                    reject(Error('Não foi possível acessar o Google.'));
                };
                document.head.append(script);
            });
        return sdkPromise;
    }
    function prepare() {
        if (!readyPromise)
            readyPromise = Promise.all([A.api.expect(A.api.get(endpoint + '/config')), loadSDK()])
                .then(([config]) => {
                    if (!config.configured)
                        throw Error(
                            'A equipe precisa configurar GOOGLE_CLIENT_ID e APP_URL neste ambiente.'
                        );
                    clientId = config.clientId;
                    if (config.appOrigin) sourceOrigin = new URL(config.appOrigin).origin;
                })
                .catch((e) => {
                    readyPromise = null;
                    throw e;
                });
        return readyPromise;
    }
    function authorize(destination) {
        const expected = owner(),
            required =
                destination === 'both'
                    ? Object.values(transfer.scopes)
                    : [transfer.scopes[destination]];
        if (
            credential &&
            ownerAtToken === expected &&
            credential.expires > Date.now() + 30000 &&
            required.every((s) => credential.scopes.includes(s))
        )
            return Promise.resolve(credential);
        if (!clientId || !window.google?.accounts?.oauth2)
            return Promise.reject(
                Error('Aguarde o carregamento da conexão Google e tente novamente.')
            );
        return new Promise((resolve, reject) => {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: ['openid', 'email', ...required].join(' '),
                include_granted_scopes: false,
                error_callback: () =>
                    reject(
                        Error(
                            'A janela do Google foi fechada ou bloqueada. Nenhuma tarefa foi enviada.'
                        )
                    ),
                callback: (response) => {
                    if (owner() !== expected)
                        return reject(Error('A conta do Arcádia mudou. Reabra o envio.'));
                    if (
                        response.error ||
                        !response.access_token ||
                        !window.google.accounts.oauth2.hasGrantedAllScopes(response, ...required)
                    )
                        return reject(
                            Error(
                                'Autorize as permissões do destino escolhido. Nenhuma tarefa foi enviada.'
                            )
                        );
                    const lifetime = Number(response.expires_in);
                    if (!Number.isFinite(lifetime) || lifetime <= 0)
                        return reject(
                            Error('O Google não informou uma autorização válida. Tente novamente.')
                        );
                    ownerAtToken = expected;
                    accountEmail = null;
                    credential = {
                        token: response.access_token,
                        scopes: String(response.scope || '').split(/\s+/),
                        expires: Date.now() + lifetime * 1000
                    };
                    resolve(credential);
                }
            });
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        });
    }
    async function googleRequest(method, path, body) {
        if (!credential || ownerAtToken !== owner() || credential.expires <= Date.now())
            throw Error('A autorização Google expirou. Clique novamente em enviar para autorizar.');
        const base =
            path === 'profile'
                ? 'https://openidconnect.googleapis.com/v1/userinfo'
                : path.startsWith('calendar/')
                  ? 'https://www.googleapis.com/calendar/v3/' + path.slice(9)
                  : path.startsWith('tasks/')
                    ? 'https://tasks.googleapis.com/tasks/v1/' + path.slice(6)
                    : null;
        if (!base) throw Error('Destino Google inválido.');
        const controller = new AbortController(),
            timer = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(base, {
                method,
                headers: {
                    Authorization: 'Bearer ' + credential.token,
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
                signal: controller.signal,
                credentials: 'omit',
                redirect: 'error',
                referrerPolicy: 'no-referrer'
            });
            if (!response.ok) {
                if (response.status === 401) credential = null;
                const details = await response.json().catch(() => ({}));
                const reasons = [details.error?.status, ...(details.error?.errors || []).map(e => e.reason), ...(details.error?.details || []).map(e => e.reason)];
                const service = path.startsWith('tasks/') ? 'Google Tasks' : path.startsWith('calendar/') ? 'Google Agenda' : 'Google';
                const message = reasons.some(r => ['SERVICE_DISABLED', 'accessNotConfigured'].includes(r))
                    ? service + ' API não está habilitada no projeto Google Cloud. Ative a API e tente novamente.'
                    : reasons.some(r => ['ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'insufficientPermissions'].includes(r))
                      ? 'Falta permissão para ' + service + '. Use Trocar conta Google e autorize esse serviço.'
                      : response.status === 429
                        ? service + ' atingiu o limite temporário de requisições. Aguarde antes de tentar novamente.'
                        : response.status === 400
                          ? service + ' recusou os dados da tarefa (erro 400). O envio não foi confirmado.'
                          : response.status === 403
                        ? 'O Google recusou o acesso. Confira a API, as permissões e os usuários de teste.'
                        : response.status === 404
                          ? 'O item não existe mais no Google.'
                          : 'O Google não confirmou esta operação. Confira o destino antes de reenviar.';
                throw Object.assign(Error(message), { status: response.status });
            }
            const data = response.status === 204 ? {} : await response.json();
            if (path === 'profile') accountEmail = data.email;
            if (ownerAtToken !== owner()) throw Error('A sessão mudou. O envio foi interrompido.');
            return data;
        } catch (e) {
            if (e.name === 'AbortError' || e instanceof TypeError)
                throw Error(
                    'Não foi possível confirmar a operação no Google. Confira se o item foi criado antes de reenviar.'
                );
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }
    const metadata = {
        claim: (sub) =>
            A.api.expect(
                A.api.post(endpoint + '/destinations/' + encodeURIComponent(sub) + '/lease', {})
            ),
        save: (sub, data) =>
            A.api.expect(A.api.put(endpoint + '/destinations/' + encodeURIComponent(sub), data)),
        release: (sub, lease) =>
            A.api.expect(
                A.api.del(endpoint + '/destinations/' + encodeURIComponent(sub) + '/lease', {
                    body: { lease }
                })
            )
    };
    function dialog(title) {
        const d = element('dialog', undefined, 'ar-dialog ar-google-dialog'),
            heading = element('h2', title);
        heading.id = 'googleDialogTitle';
        d.setAttribute('aria-labelledby', heading.id);
        d.append(heading);
        document.body.append(d);
        d.addEventListener('close', () => d.remove(), { once: true });
        return d;
    }
    async function openSelection(initialId) {
        if (document.querySelector('.ar-google-dialog')) return;
        const d = dialog('Enviar tarefas ao Google'),
            feedback = element('p', 'Carregando tarefas e autorização…');
        feedback.setAttribute('role', 'status');
        d.append(feedback);
        const form = element('div', undefined, 'ar-google-form'),
            intro = element(
                'p',
                'Escolha até 25 tarefas e o destino. O envio copia os dados para sua conta Google; reenviar atualiza a cópia associada. Não há sincronização automática.'
            );
        const search = element('input');
        search.type = 'search';
        search.placeholder = 'Pesquisar tarefas';
        search.setAttribute('aria-label', 'Pesquisar tarefas para enviar');
        const select = element('select');
        select.setAttribute('aria-label', 'Destino das tarefas');
        for (const [value, text] of [
            ['calendar', 'Google Agenda'],
            ['tasks', 'Google Tasks'],
            ['both', 'Agenda e Tasks']
        ]) {
            const option = element('option', text);
            option.value = value;
            select.append(option);
        }
        const note = element(
            'p',
            'Na Agenda, a data da tarefa vira um evento de dia inteiro. No Tasks, a tarefa pode ficar sem data. Concluir ou excluir no Arcádia não altera o Google até você reenviar; excluir no Arcádia não apaga a cópia Google.',
            'ar-card-meta'
        );
        const checkAll = element('input');
        checkAll.type = 'checkbox';
        const checkLabel = element('label', 'Marcar as tarefas exibidas');
        checkLabel.prepend(checkAll);
        const items = element('div', undefined, 'ar-google-selection'),
            count = element('p'),
            results = element('ul', undefined, 'ar-google-results');
        results.setAttribute('aria-live', 'polite');
        const submit = element('button', 'Enviar selecionadas', 'ar-btn ar-btn--primary');
        submit.type = 'button';
        submit.disabled = true;
        const cancel = button('Fechar', () => d.close());
        const settings = element('a', 'Configurar conexão Google');
        settings.href = settingsURL();
        const switchAccount = button('Trocar conta Google');
        switchAccount.disabled = true;
        const actions = element('div', undefined, 'ar-google-actions');
        actions.append(submit, switchAccount, cancel, settings);
        form.append(intro, select, note, search, checkLabel, count, items, results, actions);
        d.append(form);
        let rows = [],
            selected = new Set(initialId ? [Number(initialId)] : []),
            busy = false;
        const normalize = (value) =>
            String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase();
        const visible = () =>
            rows.filter((t) => {
                const date = transfer.day(t.data_entrega) || '';
                const haystack = normalize(
                    [
                        t.titulo,
                        t.categoria,
                        t.responsavel,
                        date,
                        date.split('-').reverse().join('/')
                    ].join(' ')
                );
                return normalize(search.value)
                    .split(/\s+/)
                    .filter(Boolean)
                    .every((term) => haystack.includes(term));
            });
        function render() {
            items.replaceChildren();
            const list = visible();
            for (const task of list.slice(0, 200)) {
                const label = element('label', undefined, 'ar-google-choice'),
                    input = element('input');
                input.type = 'checkbox';
                input.checked = selected.has(Number(task.id_tarefa));
                input.disabled = busy;
                input.addEventListener('change', () => {
                    input.checked
                        ? selected.add(Number(task.id_tarefa))
                        : selected.delete(Number(task.id_tarefa));
                    render();
                });
                label.append(
                    input,
                    element(
                        'span',
                        task.titulo +
                            (transfer.day(task.data_entrega)
                                ? ' · ' +
                                  transfer.day(task.data_entrega).split('-').reverse().join('/')
                                : '')
                    )
                );
                items.append(label);
            }
            count.textContent =
                selected.size +
                ' selecionada(s)' +
                (list.length > 200 ? ' · refine a pesquisa para ver as demais' : '');
            checkAll.checked =
                !!list.length && list.every((t) => selected.has(Number(t.id_tarefa)));
            submit.disabled = busy || !selected.size || selected.size > 25 || !clientId;
            switchAccount.disabled = busy || !clientId;
        }
        settings.addEventListener('click', (event) => {
            if (busy) event.preventDefault();
        });
        switchAccount.addEventListener('click', async () => {
            switchAccount.disabled = true;
            credential = null;
            accountEmail = null;
            try {
                await authorize(select.value);
                const profile = await googleRequest('GET', 'profile');
                feedback.textContent =
                    'Conta selecionada: ' +
                    profile.email +
                    '. Revise e clique em Enviar selecionadas.';
                A.showToast?.('Conta Google conectada: ' + profile.email);
            } catch (error) {
                feedback.textContent = error.message;
            } finally {
                render();
            }
        });
        search.addEventListener('input', render);
        checkAll.addEventListener('change', () => {
            for (const task of visible())
                checkAll.checked
                    ? selected.add(Number(task.id_tarefa))
                    : selected.delete(Number(task.id_tarefa));
            render();
        });
        submit.addEventListener('click', async (event) => {
            event.preventDefault();
            if (busy || !selected.size || selected.size > 25) return;
            busy = true;
            feedback.dataset.dialogBusy = 'true';
            submit.disabled = true;
            cancel.disabled = true;
            select.disabled = true;
            search.disabled = true;
            checkAll.disabled = true;
            render();
            results.replaceChildren();
            feedback.textContent = 'Aguardando autorização do Google…';
            try {
                /* A janela Google é aberta diretamente pelo clique, antes de qualquer outra espera. */
                await authorize(select.value);
                const profile = await googleRequest('GET', 'profile');
                feedback.textContent = 'Conexão confirmada com ' + profile.email + '. Preparando envio…';
                A.showToast?.('Conexão Google confirmada: ' + profile.email);
                const current = await A.api.expect(A.api.get('/api/tasks'));
                const fresh = current.filter(
                    (t) => selected.has(Number(t.id_tarefa)) && !t.arquivada_em
                );
                if (fresh.length !== selected.size)
                    throw Error(
                        'Algumas tarefas mudaram ou foram removidas. Feche e reabra o envio para revisar.'
                    );
                feedback.textContent = 'Enviando… mantenha esta janela aberta.';
                const exporter = transfer.createExporter({
                    request: googleRequest,
                    metadata,
                    origin: sourceOrigin
                });
                const output = await exporter.send(fresh, select.value);
                for (const row of output.result)
                    results.append(
                        element(
                            'li',
                            (row.ok ? 'Enviado: ' : 'Não enviado: ') +
                                row.title +
                                ' · ' +
                                (row.destination === 'calendar' ? 'Agenda' : 'Tasks') +
                                (row.error ? ' — ' + row.error : '')
                        )
                    );
                const failed = new Set(output.result.filter((r) => !r.ok).map((r) => Number(r.id)));
                selected = failed;
                feedback.textContent =
                    output.result.filter((r) => r.ok).length +
                    ' operação(ões) confirmada(s) em ' +
                    output.email +
                    '. As tarefas ficam na lista Arcádia do Google Tasks. Falhas permanecem selecionadas; nada será reenviado automaticamente.';
                submit.textContent = 'Enviar seleção novamente';
            } catch (error) {
                feedback.textContent = error.message;
            } finally {
                busy = false;
                delete feedback.dataset.dialogBusy;
                cancel.disabled = false;
                select.disabled = false;
                search.disabled = false;
                checkAll.disabled = false;
                render();
            }
        });
        A.dialogShell ? A.dialogShell.open(d) : d.showModal();
        try {
            const [tasks] = await Promise.all([A.api.expect(A.api.get('/api/tasks')), prepare()]);
            if (!d.isConnected) return;
            rows = tasks;
            feedback.textContent =
                'Revise a seleção antes de enviar.' +
                (credential && ownerAtToken === owner() && accountEmail
                    ? ' Conta desta aba: ' + accountEmail + '.'
                    : ' A conta será escolhida na autorização Google.');
            render();
        } catch (error) {
            feedback.textContent = error.message;
            const retry = button('Tentar novamente', () => {
                d.close();
                openSelection(initialId);
            });
            d.append(retry);
        }
    }
    function mountSettings() {
        if (
            document.getElementById('googleIntegration') ||
            !/(?:community-)?settings\.html$/.test(location.pathname)
        )
            return;
        const host =
            document.querySelector('#notificacoes')?.parentElement ||
            document.querySelector('main');
        if (!host) return;
        const card = element('section', undefined, 'ar-sset ar-google-settings');
        card.id = 'googleIntegration';
        const heading = element('h2', 'Google Agenda e Tasks');
        const text = element(
            'p',
            'Autorize o envio manual de tarefas. Você escolhe a conta Google e o destino ao enviar. As permissões são separadas do login; credenciais ficam somente na memória desta aba.'
        );
        const status = element('p', 'Preparando autorização…');
        status.setAttribute('role', 'status');
        const connect = button('Conectar Google'),
            disconnect = button('Desconectar Google');
        connect.disabled = true;
        disconnect.disabled = true;
        const manage = element('a', 'Gerenciar acesso na Conta Google');
        manage.href = 'https://myaccount.google.com/connections';
        manage.target = '_blank';
        manage.rel = 'noopener noreferrer';
        const actions = element('div', undefined, 'ar-google-actions');
        actions.append(connect, disconnect, manage);
        card.append(heading, text, status, actions);
        host.append(card);
        const init = () =>
            prepare()
                .then(() => {
                    connect.disabled = false;
                    status.textContent =
                        'Pronto para autorizar. Em cada nova aba, o Google poderá pedir confirmação ao enviar.';
                })
                .catch((error) => {
                    status.textContent = error.message;
                    const retry = button('Tentar novamente', () => {
                        retry.remove();
                        init();
                    });
                    card.append(retry);
                });
        init();
        connect.addEventListener('click', async () => {
            connect.disabled = true;
            try {
                await authorize('both');
                const profile = await googleRequest('GET', 'profile');
                status.textContent = 'Autorização confirmada nesta aba: ' + profile.email;
                A.showToast?.('Conta Google conectada: ' + profile.email + '. Para copiar tarefas, use Enviar tarefas ao Google.');
                disconnect.disabled = false;
            } catch (error) {
                status.textContent = error.message;
            } finally {
                connect.disabled = false;
            }
        });
        disconnect.addEventListener('click', async () => {
            if (!credential) return;
            disconnect.disabled = true;
            try {
                await new Promise((resolve, reject) =>
                    window.google.accounts.oauth2.revoke(credential.token, (response) =>
                        response?.error || response?.successful === false
                            ? reject(
                                  Error(
                                      'Não foi possível revogar no Google. Use Gerenciar acesso na Conta Google.'
                                  )
                              )
                            : resolve()
                    )
                );
                credential = null;
                ownerAtToken = null;
                accountEmail = null;
                status.textContent =
                    'Autorização revogada. As tarefas e os eventos já enviados continuam no Google.';
            } catch (error) {
                status.textContent = error.message;
                disconnect.disabled = false;
            }
        });
    }
    function mount() {
        mountSettings();
        const create = document.getElementById('btnNovaTarefa');
        if (create && !document.getElementById('btnGoogleTasks')) {
            const b = button('Enviar tarefas ao Google', () => openSelection());
            b.id = 'btnGoogleTasks';
            create.after(b);
        }
    }
    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-google-task]');
        if (target) {
            event.preventDefault();
            openSelection(target.dataset.googleTask);
        }
    });
    window.addEventListener('storage', (event) => {
        if (['arcadiaToken', 'arcadiaSessao', null].includes(event.key)) {
            credential = null;
            ownerAtToken = null;
        }
    });
    A.googleWorkspace = { open: openSelection };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})(window.Arcadia);
