// api.js: comunicação geral com o backend (carregar PRIMEIRO)
window.Arcadia = window.Arcadia || {};

(function (Arcadia) {
    'use strict';

    const API_BASE = (window.ARCADIA_API_BASE || (window.ARCADIA_CONFIG || {}).backendUrl ||
        (location.port === '3001' ? location.origin : 'http://localhost:3001')).replace(/\/$/, '');

    const Token = {
        get() {
            return localStorage.getItem('arcadiaToken');
        },
        set(token) {
            localStorage.setItem('arcadiaToken', token);
        },
        clear() {
            localStorage.removeItem('arcadiaToken');
            localStorage.removeItem('arcadiaSessao');
        }
    };

    /**
     * Faz uma requisição à API e devolve { ok, status, data }.
     * - Envia o JWT automaticamente (Authorization: Bearer) quando auth = true.
     * - Se uma rota protegida responder 401, a sessão expirou: limpa e volta ao login.
     * - Erro de rede (servidor fora do ar) lança exceção: quem chama usa try/catch.
     */
    async function request(path, { method = 'GET', body, auth = true } = {}) {
        const headers = {};
        if (body !== undefined) headers['Content-Type'] = 'application/json';

        const token = Token.get();
        if (auth && token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 401 && auth && token) {
            Token.clear();
            window.location.href = 'login.html';
        }

        return { ok: res.ok, status: res.status, data };
    }

    async function expect(promise) {
        const result = await promise;
        if (!result.ok) {
            const error = new Error(result.data.error || `Erro na requisição (${result.status}).`);
            error.status = result.status;
            throw error;
        }
        return result.data;
    }

    function crud(base) {
        return {
            list: () => expect(request(base)),
            get: (id) => expect(request(`${base}/${encodeURIComponent(id)}`)),
            create: (body) => expect(request(base, { method: 'POST', body })),
            update: (id, body) => expect(request(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body })),
            patch: (id, body) => expect(request(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body })),
            remove: (id) => expect(request(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }))
        };
    }

    Arcadia.api = {
        BASE: API_BASE,
        request,
        expect,
        crud,
        patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
        get: (path, opts) => request(path, { ...opts, method: 'GET' }),
        post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
        put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
        del: (path, opts) => request(path, { ...opts, method: 'DELETE' })
    };
    Arcadia.token = Token;
})(window.Arcadia);
