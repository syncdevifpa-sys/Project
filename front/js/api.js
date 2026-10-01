// api.js: comunicação geral com o backend (carregar PRIMEIRO)
window.Arcadia = window.Arcadia || {};

(function (Arcadia) {
    'use strict';

    const API_BASE = 'http://localhost:3001';

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
            try {
                const sess = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
                if (sess.provider === 'Google' || token.startsWith('google-') || token.startsWith('local-')) {
                    return { ok: false, status: 401, data };
                }
            } catch (e) {}

            Token.clear();
            window.location.href = 'login.html';
        }

        return { ok: res.ok, status: res.status, data };
    }

    /**
     * Extrai os dados ou lança exceção em caso de erro na resposta
     */
    async function expect(promiseOrResult) {
        const res = await promiseOrResult;
        if (!res.ok) {
            const msg = (res.data && (res.data.error || res.data.message)) || `HTTP ${res.status}`;
            const err = new Error(msg);
            err.status = res.status;
            err.data = res.data;
            throw err;
        }
        return res.data;
    }

    /**
     * Fábrica de operações CRUD padrão para uma rota base
     */
    function crud(basePath) {
        return {
            list: (params) => expect(request(params ? `${basePath}?${new URLSearchParams(params)}` : basePath, { method: 'GET' })),
            get: (id) => expect(request(`${basePath}/${id}`, { method: 'GET' })),
            create: (body) => expect(request(basePath, { method: 'POST', body })),
            update: (id, body) => expect(request(`${basePath}/${id}`, { method: 'PUT', body })),
            patch: (id, body) => expect(request(`${basePath}/${id}`, { method: 'PATCH', body })),
            delete: (id) => expect(request(`${basePath}/${id}`, { method: 'DELETE' })),
            remove: (id) => expect(request(`${basePath}/${id}`, { method: 'DELETE' }))
        };
    }

    Arcadia.api = {
        BASE: API_BASE,
        request,
        expect,
        crud,
        get: (path, opts) => request(path, { ...opts, method: 'GET' }),
        post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
        put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
        patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
        del: (path, opts) => request(path, { ...opts, method: 'DELETE' })
    };
    Arcadia.token = Token;
})(window.Arcadia);