// notices-crm.js: comportamento da área de trabalho de Avisos e notícias.
// js/pages.js cuida dos dados (filtrar, ordenar, desenhar); aqui ficam só o painel de
// filtros, o contador de filtros ativos, a densidade da tabela e o atalho "/" da busca.
(function () {
    'use strict';

    const CHAVE_DENSIDADE = 'arcadia-avisos-compacto';

    function iniciar() {
        const area = document.getElementById('noticesWorkspace');
        const botao = document.getElementById('btnNoticeFilters');
        const painel = document.getElementById('noticeFilterPanel');
        if (!area || !botao || !painel) return;
        const fechar = document.getElementById('btnCloseNoticeFilters');
        const limpar = document.getElementById('btnClearNoticeFilters');
        const contador = document.getElementById('noticeFilterCount');
        const tipo = document.getElementById('filterNoticeType');
        const busca = document.getElementById('filterTextNotices');
        const densidade = document.getElementById('btnNoticeDensity');
        const publicos = () => Array.from(painel.querySelectorAll('[data-filter-publico]'));
        const situacoes = () => Array.from(painel.querySelectorAll('[data-filter-situacao]'));

        // ---- Painel de filtros --------------------------------------------------
        function abrir(mostrar) {
            painel.hidden = !mostrar;
            botao.setAttribute('aria-expanded', String(mostrar));
            if (mostrar) tipo?.focus();
        }
        botao.addEventListener('click', () => abrir(painel.hidden));
        fechar?.addEventListener('click', () => {
            abrir(false);
            botao.focus();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !painel.hidden) {
                abrir(false);
                botao.focus();
            }
        });
        document.addEventListener('click', (e) => {
            if (!painel.hidden && !painel.contains(e.target) && !botao.contains(e.target))
                abrir(false);
        });

        // ---- Filtros ativos (diferentes do padrão) ------------------------------
        // Padrão: avisos e notícias, todos os públicos, só publicados.
        function ativos() {
            let n = 0;
            if (tipo?.value) n++;
            if (!painel.querySelector('[data-filter-publico="All"]')?.checked) n++;
            const marcadas = situacoes().filter((s) => s.checked);
            if (marcadas.length !== 1 || marcadas[0].dataset.filterSituacao !== 'Published') n++;
            return n;
        }
        function atualizarContador() {
            const n = ativos();
            contador.hidden = n === 0;
            contador.textContent = String(n);
            botao.setAttribute(
                'aria-label',
                n ? `Filtros, ${n} ${n === 1 ? 'ativo' : 'ativos'}` : 'Filtros'
            );
            if (limpar) limpar.disabled = n === 0;
        }
        painel.addEventListener('change', atualizarContador);

        limpar?.addEventListener('click', () => {
            if (tipo) tipo.value = '';
            const todos = publicos().find((p) => p.dataset.filterPublico === 'All');
            if (todos) todos.checked = true;
            situacoes().forEach((s) => {
                s.checked = s.dataset.filterSituacao === 'Published';
            });
            // Um único evento basta: js/pages.js lê todos os filtros a cada desenho.
            tipo?.dispatchEvent(new Event('change', { bubbles: true }));
            tipo?.focus();
        });
        atualizarContador();

        // ---- Densidade da tabela ------------------------------------------------
        function compacto(ligar) {
            area.classList.toggle('is-compact', ligar);
            densidade?.setAttribute('aria-pressed', String(ligar));
        }
        try {
            compacto(localStorage.getItem(CHAVE_DENSIDADE) === '1');
        } catch {
            compacto(false);
        }
        densidade?.addEventListener('click', () => {
            const ligar = densidade.getAttribute('aria-pressed') !== 'true';
            compacto(ligar);
            try {
                localStorage.setItem(CHAVE_DENSIDADE, ligar ? '1' : '0');
            } catch {
                /* A escolha vale só para esta visita. */
            }
        });

        // ---- Atalho "/" para a busca ---------------------------------------------
        // Ctrl+K continua sendo a busca geral do portal (js/portal.js).
        document.addEventListener('keydown', (e) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            const alvo = e.target;
            if (alvo.closest?.('input, textarea, select, [contenteditable="true"], dialog[open]'))
                return;
            e.preventDefault();
            busca?.focus();
            busca?.select();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
