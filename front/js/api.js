// api.js: comunicação geral com o backend (carregar PRIMEIRO)
window.Arcadia = window.Arcadia || {};

(function (Arcadia) {
    'use strict';

    const API_BASE = (
        window.ARCADIA_API_BASE ||
        (window.ARCADIA_CONFIG || {}).backendUrl ||
        (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && location.port !== '3001'
            ? 'http://localhost:3001'
            : location.origin)
    ).replace(/\/$/, '');

    const Token = {
        get() {
            try {
                return localStorage.getItem('arcadiaToken');
            } catch {
                return null;
            }
        },
        set(token) {
            localStorage.setItem('arcadiaToken', token);
        },
        clear() {
            localStorage.removeItem('arcadiaToken');
            localStorage.removeItem('arcadiaSessao');
        }
    };

    // Oculta a fotografia do documento antes de o navegador guardá-lo no histórico.
    // Ao restaurar, valida também a sessão no servidor, não apenas o JWT armazenado.
    const pageToken = Token.get();
    const privatePages = new Set([
        'dashboard.html',
        'tasks.html',
        'settings.html',
        'admin.html',
        'classes.html',
        'community.html',
        'community-settings.html'
    ]);
    const privatePage = privatePages.has((location.pathname || '').split('/').pop());
    let externalSession = false;
    try {
        externalSession =
            JSON.parse(localStorage.getItem('arcadiaSessao') || '{}').tipo_usuario === 'externo';
    } catch {}
    const externalRestricted = new Set([
        'documents.html',
        'people.html',
        'profile.html',
        'classes.html',
        'admin.html'
    ]);
    function discardPage() {
        document.body?.replaceChildren();
        window.location.replace('login.html');
    }
    if (typeof window.addEventListener === 'function') {
        if (externalSession && pageToken) {
            const page = (location.pathname || '').split('/').pop();
            if (
                externalRestricted.has(page) ||
                ['dashboard.html', 'settings.html'].includes(page)
            ) {
                document.body?.replaceChildren();
                window.location.replace(
                    page === 'settings.html' ? 'community-settings.html' : 'community.html'
                );
            }
        }
        window.addEventListener('pagehide', () => {
            if (pageToken && document.documentElement)
                document.documentElement.style.visibility = 'hidden';
        });
        window.addEventListener('pageshow', async (event) => {
            if (!event.persisted) return;
            if (pageToken !== Token.get()) {
                if (privatePage || pageToken) return discardPage();
                return window.location.reload();
            }
            if (pageToken) {
                try {
                    const external =
                        JSON.parse(localStorage.getItem('arcadiaSessao') || '{}').tipo_usuario ===
                        'externo';
                    const result = await request(
                        external ? '/api/external/me' : '/api/auth/perfil'
                    );
                    if (!result.ok || Token.get() !== pageToken) return discardPage();
                } catch {
                    return discardPage();
                }
            } else if (privatePage) return discardPage();
            if (document.documentElement) document.documentElement.style.visibility = '';
        });
        window.addEventListener('storage', (event) => {
            if ((event.key === 'arcadiaToken' || event.key === null) && pageToken !== Token.get())
                discardPage();
        });
        if (privatePage && !pageToken) window.location.replace('login.html');
    }

    /**
     * Faz uma requisição à API e devolve { ok, status, data }.
     * - Envia o JWT automaticamente (Authorization: Bearer) quando auth = true.
     * - Se uma rota protegida responder 401, a sessão expirou: limpa e volta ao login.
     * - Erro de rede (servidor fora do ar) lança exceção: quem chama usa try/catch.
     */
    async function request(
        path,
        {
            method = 'GET',
            body,
            auth = true,
            raw = false,
            contentType = 'application/pdf',
            signal
        } = {}
    ) {
        const headers = {};
        if (body !== undefined) headers['Content-Type'] = raw ? contentType : 'application/json';

        const token = auth ? Token.get() : null;
        if (auth && token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method,
            signal,
            cache: auth ? 'no-store' : 'default',
            headers,
            body: body !== undefined ? (raw ? body : JSON.stringify(body)) : undefined
        });

        const data = await res.json().catch(() => ({}));
        // Não entrega dados de uma conta anterior a componentes ainda aguardando resposta.
        if (auth && token && Token.get() !== token)
            return { ok: false, status: 401, data: { error: 'A sessão mudou. Entre novamente.' } };

        // Uma resposta antiga não pode encerrar um login concluído enquanto ela aguardava.
        if (res.status === 401 && auth && token && Token.get() === token) {
            Token.clear();
            window.location.href = 'login.html';
        }

        return { ok: res.ok, status: res.status, data };
    }

    async function expect(promiseOrResult) {
        const result = await promiseOrResult;
        if (!result.ok) {
            const error = new Error(
                (result.data && (result.data.error || result.data.message)) ||
                    `Erro na requisição (${result.status}).`
            );
            error.status = result.status;
            error.data = result.data;
            throw error;
        }
        return result.data;
    }

    function crud(basePath) {
        return {
            list: (params) =>
                expect(
                    request(params ? `${basePath}?${new URLSearchParams(params)}` : basePath, {
                        method: 'GET'
                    })
                ),
            get: (id) =>
                expect(request(`${basePath}/${encodeURIComponent(id)}`, { method: 'GET' })),
            create: (body) => expect(request(basePath, { method: 'POST', body })),
            update: (id, body) =>
                expect(request(`${basePath}/${encodeURIComponent(id)}`, { method: 'PUT', body })),
            patch: (id, body) =>
                expect(request(`${basePath}/${encodeURIComponent(id)}`, { method: 'PUT', body })),
            delete: (id) =>
                expect(request(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' })),
            remove: (id) =>
                expect(request(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' }))
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
