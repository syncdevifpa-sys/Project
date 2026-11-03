/* Estado de conexão compartilhado; nenhuma escrita é repetida automaticamente. */
(function (A) {
    'use strict';
    const messages = {
        offline: 'Você está sem conexão. Verifique sua internet e tente novamente.',
        server: 'Não foi possível conectar ao Arcádia. Tente novamente em instantes.'
    };
    const retries = new WeakMap();
    let state = '',
        notice,
        text,
        retryButton,
        recoveryTimer;
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
        if (retryButton?.disabled) return;
        if (offline()) {
            failed();
            return;
        }
        if (retryButton) retryButton.disabled = true;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeout = setTimeout(() => controller?.abort(), 8000);
        try {
            await request((A.api?.BASE || location.origin) + '/api', {
                method: 'GET',
                cache: 'no-store',
                signal: controller?.signal
            });
        } catch (error) {
            if (error.name === 'AbortError') failed(new Error('Tempo de conexão esgotado.'));
        } finally {
            clearTimeout(timeout);
            if (retryButton) retryButton.disabled = false;
        }
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
    document.addEventListener('DOMContentLoaded', () => {
        if (offline()) failed();
        else render();
    });
    A.connection = {
        fetch: request,
        failed,
        reached,
        offerRetry,
        messages,
        isUnavailable: () => ['offline', 'server'].includes(state)
    };
})((window.Arcadia = window.Arcadia || {}));
