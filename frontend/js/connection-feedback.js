/* Estado de conexão compartilhado; nenhuma escrita é repetida automaticamente. */
(function (A) {
    'use strict';
    /* O documento legal embutido usa o aviso único da página principal. */
    if (window.self !== window.top) return;
    const messages = {
        offline: 'Você está sem conexão. Verifique sua internet e tente novamente.',
        server: 'Não foi possível conectar ao Arcádia. Tente novamente em instantes.'
    };
    const retries = new WeakMap();
    let state = '',
        notice,
        text,
        retryButton,
        recoveryTimer,
        heartbeat = null,
        probing = false;
    const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
    function render() {
        if (!document.body) return;
        if (!state) {
            notice?.remove();
            notice = null;
            return;
        }
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'ar-connection-notice';
            notice.className = 'ar-toast ar-connection-toast';
            notice.setAttribute('role', 'status');
            notice.setAttribute('aria-live', 'polite');
            notice.setAttribute('aria-atomic', 'true');
            text = document.createElement('span');
            text.className = 'ar-toast-msg';
            retryButton = document.createElement('button');
            retryButton.type = 'button';
            retryButton.className = 'ar-toast-action';
            retryButton.textContent = 'Tentar novamente';
            retryButton.addEventListener('click', probe);
            notice.append(text, retryButton);
            document.body.append(notice);
        }
        const message = state === 'recovered' ? 'Conexão restabelecida.' : messages[state];
        if (text.textContent !== message) text.textContent = message;
        retryButton.hidden = state === 'recovered';
    }
    function failed(error) {
        if (error?.name === 'AbortError') return error;
        clearTimeout(recoveryTimer);
        state = offline() ? 'offline' : 'server';
        render();
        const result = new Error(messages[state]);
        result.code = 'NETWORK_ERROR';
        result.cause = error;
        return result;
    }
    function reached() {
        if (offline() || !['offline', 'server'].includes(state)) return;
        state = 'recovered';
        render();
        clearTimeout(recoveryTimer);
        recoveryTimer = setTimeout(() => {
            state = '';
            render();
        }, 3500);
    }
    async function request(input, options) {
        try {
            const response = await fetch(input, options);
            reached();
            return response;
        } catch (error) {
            throw failed(error);
        }
    }
    /* A verificação de recuperação consulta apenas a rota pública de saúde. */
    async function probe() {
        if (probing) return;
        if (offline()) {
            failed();
            return;
        }
        probing = true;
        if (retryButton) retryButton.disabled = true;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeout = setTimeout(() => controller?.abort(), 5000);
        try {
            /* A chave variável impede que um cache antigo simule uma recuperação. */
            const response = await fetch(
                (A.api?.BASE || location.origin) + '/api?connection-check=' + Date.now(),
                {
                    method: 'GET',
                    cache: 'no-store',
                    signal: controller?.signal
                }
            );
            if (!response.ok) throw new Error('O servidor ainda não está disponível.');
            reached();
        } catch (error) {
            failed(error.name === 'AbortError' ? new Error('Tempo de conexão esgotado.') : error);
        } finally {
            clearTimeout(timeout);
            probing = false;
            if (retryButton) retryButton.disabled = false;
        }
    }
    /* Alguns navegadores não disparam offline ao perder o acesso externo. */
    function checkVisible() {
        if (document.visibilityState !== 'hidden') return probe();
    }
    function startMonitor() {
        if (heartbeat !== null || typeof setInterval !== 'function') return;
        heartbeat = setInterval(checkVisible, 15000);
    }
    /* Cada área informa somente uma função de leitura para sua tentativa manual. */
    function offerRetry(host, load, error) {
        if (
            !host ||
            host.isConnected === false ||
            typeof load !== 'function' ||
            (error?.code !== 'NETWORK_ERROR' && !(error?.status >= 500) && !offline())
        )
            return;
        let entry = retries.get(host);
        if (entry && entry.button.isConnected !== false) {
            entry.load = load;
            return;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ar-btn ar-btn--secondary ar-load-retry';
        button.textContent = 'Tentar novamente';
        entry = { button, load };
        retries.set(host, entry);
        button.addEventListener('click', async () => {
            button.remove();
            retries.delete(host);
            try {
                await entry.load();
            } catch (failure) {
                offerRetry(host, entry.load, failure);
            }
        });
        host.append(button);
    }
    window.addEventListener('offline', () => {
        failed();
    });
    window.addEventListener('online', probe);
    document.addEventListener('visibilitychange', checkVisible);
    window.addEventListener('focus', checkVisible);
    window.addEventListener('pageshow', startMonitor);
    window.addEventListener('pagehide', () => {
        if (heartbeat !== null) clearInterval(heartbeat);
        heartbeat = null;
    });
    const boot = () => {
        if (offline()) failed();
        else render();
        startMonitor();
    };
    if (!document.readyState || document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', boot);
    else boot();
    A.connection = {
        fetch: request,
        failed,
        reached,
        offerRetry,
        messages,
        isUnavailable: () => ['offline', 'server'].includes(state)
    };
})((window.Arcadia = window.Arcadia || {}));
