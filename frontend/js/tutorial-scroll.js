// scroll-suave.js: rolagem com inércia para a rodinha do mouse e o trackpad.
// O window.scrollY continua sendo a posição real; só a rodinha e os links âncora
// passam pelo loop. Teclado, barra de rolagem, Tab e toque continuam nativos.
(function () {
    'use strict';

    // ---- Ajustes ----------------------------------------------------------
    const SUAVIDADE = 0.09; // fração da distância percorrida por quadro (menor = mais lento e macio)
    const PARADA = 0.5; // px: abaixo disso o loop termina
    const PX_POR_LINHA = 16; // deltaMode 1 (linhas)
    const MULTIPLICADOR = 1; // ganho sobre o delta da rodinha
    const DESLOCAMENTO_ANCORA = 72; // px acima da seção, por causa do cabeçalho fixo
    const TOLERANCIA_EXTERNA = 2; // px: diferença que indica rolagem feita fora do loop
    const TECLAS_DE_ROLAGEM = [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
        'Spacebar',
        'Tab'
    ];
    // -----------------------------------------------------------------------

    if (typeof window === 'undefined' || !window.requestAnimationFrame || !window.matchMedia)
        return;

    const root = document.documentElement;
    const toque = window.matchMedia('(pointer: coarse)');
    // Como em js/animacoes.js: só a opção "Reduzir movimento" do portal (data-motion)
    // desliga a inércia; a preferência do sistema operacional não.
    const movimentoReduzido = () => root.getAttribute('data-motion') === 'reduced';

    let ativo = false;
    let alvo = window.scrollY;
    let atual = window.scrollY;
    let limite = 0;
    let quadro = 0;
    let ultimaEscrita = null;
    let destinoAncora = null; // elemento seguido durante a rolagem por link âncora

    function calcularLimite() {
        limite = Math.max(0, root.scrollHeight - window.innerHeight);
        if (alvo > limite) alvo = limite;
        if (atual > limite) atual = limite;
    }

    function sincronizar() {
        alvo = atual = window.scrollY;
    }

    function parar() {
        if (quadro) cancelAnimationFrame(quadro);
        quadro = 0;
        ultimaEscrita = null;
        destinoAncora = null;
        root.style.overflowAnchor = '';
    }

    function posicaoDaAncora(el) {
        return el.getBoundingClientRect().top + window.scrollY - DESLOCAMENTO_ANCORA;
    }

    // Avisa os efeitos de scroll (js/animacoes.js) no mesmo quadro do scrollTo.
    function avisar() {
        window.dispatchEvent(new Event('arcadia:rolagem'));
    }

    function passo() {
        // A seção pode mudar de lugar no caminho (menu fechando, imagens carregando).
        if (destinoAncora) {
            calcularLimite();
            alvo = Math.min(Math.max(posicaoDaAncora(destinoAncora), 0), limite);
        }
        const distancia = alvo - atual;
        if (Math.abs(distancia) < PARADA) {
            atual = alvo;
            ultimaEscrita = atual;
            window.scrollTo(0, atual);
            avisar();
            quadro = 0;
            destinoAncora = null;
            root.style.overflowAnchor = '';
            return;
        }
        atual += distancia * SUAVIDADE;
        ultimaEscrita = atual;
        window.scrollTo(0, atual);
            avisar();
        quadro = requestAnimationFrame(passo);
    }

    function animar() {
        // Sem isso o "scroll anchoring" do navegador mexe no scrollY durante o loop
        // e a rolagem seria tratada como externa.
        root.style.overflowAnchor = 'none';
        if (!quadro) quadro = requestAnimationFrame(passo);
    }

    function irPara(elemento) {
        calcularLimite();
        if (!quadro) atual = window.scrollY;
        destinoAncora = elemento;
        alvo = elemento ? Math.min(Math.max(posicaoDaAncora(elemento), 0), limite) : 0;
        animar();
    }

    function menuAberto() {
        const botao = document.getElementById('navMobileToggle');
        return Boolean(botao && botao.getAttribute('aria-expanded') === 'true');
    }

    // Um elemento interno que ainda pode rolar no sentido do giro fica com o evento.
    function elementoRolavel(inicio, deltaY) {
        for (let el = inicio; el && el !== document.body && el !== root; el = el.parentElement) {
            if (!(el instanceof Element)) continue;
            const estilo = getComputedStyle(el);
            if (!/(auto|scroll|overlay)/.test(estilo.overflowY)) continue;
            if (el.scrollHeight <= el.clientHeight) continue;
            if (deltaY < 0 && el.scrollTop > 0) return true;
            if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        }
        return false;
    }

    function normalizar(evento) {
        if (evento.deltaMode === 1) return evento.deltaY * PX_POR_LINHA;
        if (evento.deltaMode === 2) return evento.deltaY * window.innerHeight;
        return evento.deltaY;
    }

    function aoGirar(evento) {
        if (!ativo || evento.defaultPrevented) return;
        if (evento.ctrlKey || evento.metaKey || evento.shiftKey) return; // zoom e rolagem lateral
        if (Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return;
        if (menuAberto()) return;
        if (elementoRolavel(evento.target, evento.deltaY)) return;

        evento.preventDefault();
        destinoAncora = null;
        if (!quadro) sincronizar();
        calcularLimite();
        alvo = Math.min(Math.max(alvo + normalizar(evento) * MULTIPLICADOR, 0), limite);
        animar();
    }

    // Rolagem feita fora do loop (teclado, barra, Tab, find-in-page): sincroniza.
    function aoRolar() {
        if (!ativo) return;
        if (quadro && ultimaEscrita !== null) {
            if (Math.abs(window.scrollY - ultimaEscrita) <= TOLERANCIA_EXTERNA) return;
            // Na rolagem por âncora, a diferença vem de layout mudando (menu fechando):
            // continua do ponto real até a seção. Teclado e barra já param o loop antes.
            if (destinoAncora) {
                atual = ultimaEscrita = window.scrollY;
                return;
            }
            parar();
        }
        if (!quadro) sincronizar();
    }

    function aoTeclar(evento) {
        if (!ativo || !quadro) return;
        if (TECLAS_DE_ROLAGEM.includes(evento.key)) {
            parar();
            sincronizar();
        }
    }

    // Clique ou arraste na barra de rolagem interrompe o loop.
    function aoPressionar(evento) {
        if (ativo && quadro && evento.clientX >= root.clientWidth) {
            parar();
            sincronizar();
        }
    }

    function aoClicarAncora(evento) {
        if (!ativo || evento.defaultPrevented || evento.button !== 0) return;
        if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        const link = evento.target.closest && evento.target.closest('a[href*="#"]');
        if (!link || link.target === '_blank') return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname) return;
        if (url.search !== location.search) return;

        const id = decodeURIComponent(url.hash.slice(1));
        let destino = null; // null = topo da página ("#", "#top", "#topo")
        if (id && id !== 'top' && id !== 'topo') {
            destino = document.getElementById(id);
            if (!destino) return;
        }
        evento.preventDefault();
        if (history.pushState) history.pushState(null, '', url.hash || location.pathname);
        irPara(destino);
    }

    function atualizarEstado() {
        const deveAtivar = !toque.matches && !movimentoReduzido();
        if (deveAtivar === ativo) return;
        ativo = deveAtivar;
        parar();
        sincronizar();
        calcularLimite();
        // O CSS da landing usa scroll-behavior: smooth; ele suavizaria cada scrollTo de novo.
        root.style.scrollBehavior = ativo ? 'auto' : '';
    }

    window.addEventListener('wheel', aoGirar, { passive: false });
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('mousedown', aoPressionar);
    window.addEventListener('resize', calcularLimite);
    document.addEventListener('click', aoClicarAncora);

    // Altura da página muda com imagens carregando e acordeões abrindo.
    if (typeof ResizeObserver !== 'undefined') {
        const observar = () => new ResizeObserver(calcularLimite).observe(document.body);
        if (document.body) observar();
        else document.addEventListener('DOMContentLoaded', observar);
    }
    window.addEventListener('load', calcularLimite);

    if (toque.addEventListener) toque.addEventListener('change', atualizarEstado);
    else if (toque.addListener) toque.addListener(atualizarEstado);
    atualizarEstado();
})();
