// animacoes.js: efeitos ligados ao scroll da landing (lê window.scrollY).
// Anima só transform e opacity (e o border-radius da foto do hero).
// Um único loop com requestAnimationFrame: lê tudo, calcula e só então escreve.
// Fora do loop ficam a medida do degradê dos títulos (.text-gradient) e o destaque
// que percorre os cards de público.
(function () {
    'use strict';

    // ---- Ajustes ----------------------------------------------------------
    // 1. Título do hero (ao carregar)
    const HERO_ATRASO_MS = 250;
    const HERO_DURACAO_MS = 950;
    const HERO_INTERVALO_MS = 85;
    const EASE_OUT_CUBIC_CSS = 'cubic-bezier(0.33, 1, 0.68, 1)';
    // 2. Hero ao rolar
    const FOTO_FAIXA_VH = 0.7; // p = scrollY / (0,7 × vh)
    const FOTO_ESCALA_INICIAL = 0.86;
    const FOTO_RAIO_INICIAL = 28; // px
    const FOTO_RAIO_FINAL = 6; // px
    const FOTO_IMG_DESLOCAMENTO = 6; // % (de −6% até +6%)
    const FOTO_IMG_ESCALA = 1.14;
    const TEXTO_DESLOCAMENTO_VH = 0.22;
    const TEXTO_OPACIDADE_PERDIDA = 0.7;
    // 3. Títulos (data-reveal)
    const REVELA_INICIO_VH = 0.92;
    const REVELA_FIM_MIN_VH = 0.5;
    const REVELA_FIM_MAX_VH = 0.9;
    const REVELA_ESPALHAMENTO = 0.5; // parte do progresso usada para escalonar as palavras
    const REVELA_DESLOCAMENTO = 110; // %
    const REVELA_ROTACAO = 6; // deg
    // 4. Deslizar da direita (data-drift)
    const DRIFT_DISTANCIA_VW = 8;
    const DRIFT_FAIXA_VH = 0.8;
    // 5. Cards que sobem (data-rise)
    const SOBE_INICIO_VH = 0.98;
    const SOBE_FIM_MIN_VH = 0.68;
    const SOBE_FIM_MAX_VH = 0.96;
    const SOBE_ATRASO_POR_INDICE = 0.18;
    const SOBE_DESLOCAMENTO_PX = 60;
    const SOBE_ESCALA_INICIAL = 0.97;
    // 6. Imagens que crescem (data-grow)
    const CRESCE_FAIXA_VH = 0.6;
    const CRESCE_ESCALA_INICIAL = 0.86;
    const PARALLAX_AMPLITUDE = 14; // %
    const PARALLAX_ESCALA = 1.16;
    // 7. Celulares em camadas: o fator vem do atributo data-par (0,16 / 0,06)
    // 8. Destaque que percorre os cards de "Para quem"
    const DESTAQUE_INTERVALO_MS = 2800;
    const DESTAQUE_VISIVEL_MIN = 0.25; // parte da grade na tela para começar
    // Desempenho: elementos a mais de N telas de distância não são recalculados.
    const MARGEM_TELAS = 1;
    // -----------------------------------------------------------------------

    const root = document.documentElement;
    // Decisão do projeto: a landing anima sempre, mesmo com as animações do sistema
    // operacional desligadas. Só para quando a pessoa escolhe "Reduzir movimento" nas
    // Configurações do portal (data-motion no <html>, marcado no <head> do index.html).
    const movimentoReduzido = () => root.getAttribute('data-motion') === 'reduced';
    window.__arcadiaAnimacoes = true;

    const clamp = (x) => Math.min(1, Math.max(0, x));
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const arred = (x, casas = 3) => {
        const f = Math.pow(10, casas);
        return Math.round(x * f) / f;
    };

    // ---- Máscara por palavra (preserva spans internos e <br>) --------------
    function dividirPalavras(el) {
        const lista = [];
        (function percorrer(no) {
            for (const filho of Array.from(no.childNodes)) {
                if (filho.nodeType === 3) {
                    const partes = filho.textContent.split(/(\s+)/);
                    if (!partes.some((p) => p.trim())) continue;
                    const frag = document.createDocumentFragment();
                    for (const parte of partes) {
                        if (!parte) continue;
                        if (!parte.trim()) {
                            frag.append(document.createTextNode(parte));
                            continue;
                        }
                        const fora = document.createElement('span');
                        fora.className = 'w';
                        const dentro = document.createElement('span');
                        dentro.className = 'w-in';
                        dentro.textContent = parte;
                        fora.append(dentro);
                        frag.append(fora);
                        lista.push(dentro);
                    }
                    filho.replaceWith(frag);
                } else if (filho.nodeType === 1 && filho.tagName !== 'BR') {
                    if (filho.classList.contains('w')) lista.push(filho.firstElementChild);
                    else percorrer(filho);
                }
            }
        })(el);
        return lista;
    }

    // ---- Elementos ---------------------------------------------------------
    const heroTitulo = document.querySelector('.hero-title');
    let heroPalavras = heroTitulo ? Array.from(heroTitulo.querySelectorAll('.w-in')) : [];
    const heroTexto = document.querySelector('[data-hero-text]');
    const heroMoldura = document.querySelector('[data-hero-frame]');
    const heroFoto = heroMoldura ? heroMoldura.querySelector('img') : null;

    const titulos = Array.from(document.querySelectorAll('[data-reveal]')).map((el) => ({
        el,
        palavras: dividirPalavras(el),
        drift: el.hasAttribute('data-drift'),
        ultimo: []
    }));
    const cards = Array.from(document.querySelectorAll('[data-rise]')).map((el) => ({
        el,
        indice: 0,
        ultimo: null
    }));
    const imagens = Array.from(document.querySelectorAll('[data-grow]')).map((el) => ({
        el,
        foto: el.querySelector('.media-frame img'), // parallax só nas fotos
        ultimo: null,
        ultimaFoto: null
    }));
    const celulares = Array.from(document.querySelectorAll('[data-par]')).map((el) => ({
        el,
        fator: parseFloat(el.getAttribute('data-par')) || 0,
        painel: el.parentElement,
        ultimo: null
    }));

    // ---- Medidas de layout (sem transform) ---------------------------------
    // offsetTop ignora transform; a posição no documento fica em cache e só é
    // refeita quando o layout muda. Assim nenhum elemento mede a si mesmo deslocado.
    let alturaDocumento = 0;
    let precisaMedir = true;

    function topoNoDocumento(el) {
        let t = 0;
        for (let no = el; no; no = no.offsetParent) t += no.offsetTop;
        return t;
    }

    function medir() {
        alturaDocumento = root.scrollHeight;
        const medirItem = (item, el = item.el) => {
            item.visivel = el.offsetParent !== null || el.getClientRects().length > 0;
            item.topo = topoNoDocumento(el);
            item.altura = el.offsetHeight;
        };
        titulos.forEach((t) => medirItem(t));
        imagens.forEach((i) => medirItem(i));
        celulares.forEach((c) => medirItem(c, c.painel));
        cards.forEach((c) => medirItem(c));
        // Índice = posição entre irmãos na mesma linha (mesmo pai e mesmo offsetTop).
        const linhas = new Map();
        cards.forEach((c) => {
            const chave = c.el.parentElement;
            if (!linhas.has(chave)) linhas.set(chave, new Map());
            const porTopo = linhas.get(chave);
            const topo = c.el.offsetTop;
            c.indice = porTopo.get(topo) || 0;
            porTopo.set(topo, c.indice + 1);
        });
        precisaMedir = false;
    }

    // ---- Escrita só quando o valor muda ------------------------------------
    function escrever(el, chave, valor, cache, campo) {
        if (cache[campo] === valor) return;
        cache[campo] = valor;
        el.style[chave] = valor;
    }

    // ---- 2. Hero ao rolar ----------------------------------------------------
    const heroCache = {};
    function hero(sy, vh) {
        const out = [];
        if (heroMoldura) {
            const e = easeOutCubic(clamp(sy / (FOTO_FAIXA_VH * vh)));
            const escala = FOTO_ESCALA_INICIAL + (1 - FOTO_ESCALA_INICIAL) * e;
            const raio = FOTO_RAIO_INICIAL + (FOTO_RAIO_FINAL - FOTO_RAIO_INICIAL) * e;
            const y = -FOTO_IMG_DESLOCAMENTO + 2 * FOTO_IMG_DESLOCAMENTO * e;
            out.push([heroMoldura, 'transform', `scale(${arred(escala, 4)})`, 'molduraT']);
            out.push([heroMoldura, 'borderRadius', `${arred(raio, 2)}px`, 'molduraR']);
            if (heroFoto)
                out.push([heroFoto, 'transform', `translateY(${arred(y, 3)}%) scale(${FOTO_IMG_ESCALA})`, 'foto']);
        }
        if (heroTexto) {
            const q = Math.min(1, sy / vh);
            out.push([heroTexto, 'transform', `translateY(${arred(q * vh * TEXTO_DESLOCAMENTO_VH, 2)}px)`, 'textoT']);
            out.push([heroTexto, 'opacity', String(arred(1 - TEXTO_OPACIDADE_PERDIDA * q, 3)), 'textoO']);
        }
        return out;
    }

    // ---- Quadro: lê, calcula e escreve -------------------------------------
    let ultimoY = -1;
    let ultimoVh = -1;

    function atualizar() {
        if (precisaMedir) medir();
        // Leituras
        const sy = window.scrollY;
        const vh = window.innerHeight;
        const vw = root.clientWidth;
        const rest = Math.max(0, alturaDocumento - vh - sy);
        ultimoY = sy;
        ultimoVh = vh;
        // Longe da tela, o elemento já está no estado inicial (abaixo) ou final (acima):
        // só é recalculado quando muda de zona, por exemplo num salto com a tecla End.
        const pular = (item, topo) => {
            const zona =
                topo > vh * (1 + MARGEM_TELAS)
                    ? 'abaixo'
                    : topo + item.altura < -vh * MARGEM_TELAS
                      ? 'acima'
                      : 'perto';
            if (zona !== 'perto' && item.zona === zona) return true;
            item.zona = zona;
            return false;
        };

        // Cálculos (nenhuma escrita até aqui)
        const escritas = hero(sy, vh);

        for (const t of titulos) {
            if (!t.visivel) continue;
            const topo = t.topo - sy;
            if (pular(t, topo)) continue;
            const fim = Math.max(REVELA_FIM_MIN_VH * vh, Math.min(REVELA_FIM_MAX_VH * vh, topo - rest + 1));
            const inicio = REVELA_INICIO_VH * vh;
            const P = clamp((inicio - topo) / (inicio - fim));
            const n = t.palavras.length;
            t.palavras.forEach((w, i) => {
                const atraso = n > 1 ? (i / (n - 1)) * REVELA_ESPALHAMENTO : 0;
                const k = clamp((P - atraso) / (1 - REVELA_ESPALHAMENTO));
                const e = easeOutCubic(k);
                const valor =
                    e >= 1
                        ? ''
                        : `translateY(${arred((1 - e) * REVELA_DESLOCAMENTO, 2)}%) rotate(${arred((1 - e) * REVELA_ROTACAO, 3)}deg)`;
                escritas.push([w, 'transform', valor, i, t.ultimo]);
            });
            if (t.drift) {
                const e = easeOutCubic(clamp((vh - topo) / (DRIFT_FAIXA_VH * vh)));
                const valor = e >= 1 ? '' : `translateX(${arred((1 - e) * DRIFT_DISTANCIA_VW * vw / 100, 2)}px)`;
                escritas.push([t.el, 'transform', valor, 'drift', t.ultimo]);
            }
        }

        for (const c of cards) {
            if (!c.visivel) continue;
            const topo = c.topo - sy;
            if (pular(c, topo)) continue;
            const fim = Math.max(SOBE_FIM_MIN_VH * vh, Math.min(SOBE_FIM_MAX_VH * vh, topo - rest + 1));
            const inicio = SOBE_INICIO_VH * vh;
            const P = clamp((inicio - topo) / (inicio - fim) - c.indice * SOBE_ATRASO_POR_INDICE);
            const e = easeOutCubic(P);
            const chave = P >= 1 ? 'fim' : arred(e, 4);
            if (c.ultimo === chave) continue;
            c.ultimo = chave;
            if (P >= 1) {
                escritas.push([c.el, 'transform', '', 't', c]);
                escritas.push([c.el, 'opacity', '', 'o', c]);
            } else {
                const escala = SOBE_ESCALA_INICIAL + (1 - SOBE_ESCALA_INICIAL) * e;
                escritas.push([c.el, 'transform', `translateY(${arred((1 - e) * SOBE_DESLOCAMENTO_PX, 2)}px) scale(${arred(escala, 4)})`, 't', c]);
                escritas.push([c.el, 'opacity', String(arred(e, 3)), 'o', c]);
            }
        }

        for (const im of imagens) {
            if (!im.visivel) continue;
            const topo = im.topo - sy;
            if (pular(im, topo)) continue;
            const e = easeOutCubic(clamp((vh - topo) / (CRESCE_FAIXA_VH * vh)));
            const escala = CRESCE_ESCALA_INICIAL + (1 - CRESCE_ESCALA_INICIAL) * e;
            escritas.push([im.el, 'transform', e >= 1 ? '' : `scale(${arred(escala, 4)})`, 't', im]);
            if (im.foto) {
                const pc = clamp((vh - topo) / (vh + im.altura));
                escritas.push([im.foto, 'transform', `translateY(${arred((pc - 0.5) * -PARALLAX_AMPLITUDE, 3)}%) scale(${PARALLAX_ESCALA})`, 'f', im]);
            }
        }

        for (const cel of celulares) {
            if (!cel.visivel) continue;
            const topo = cel.topo - sy;
            if (pular(cel, topo)) continue;
            const centro = topo + cel.altura / 2;
            escritas.push([cel.el, 'transform', `translateY(${arred((centro - vh / 2) * cel.fator, 2)}px)`, 't', cel]);
        }

        // Escritas
        for (const [el, prop, valor, campo, cache] of escritas) escrever(el, prop, valor, cache || heroCache, campo);
    }

    function limparTudo() {
        const todos = [heroMoldura, heroFoto, heroTexto, ...heroPalavras];
        titulos.forEach((t) => todos.push(t.el, ...t.palavras));
        cards.forEach((c) => todos.push(c.el));
        imagens.forEach((i) => todos.push(i.el, i.foto));
        celulares.forEach((c) => todos.push(c.el));
        for (const el of todos) {
            if (!el) continue;
            el.style.transform = '';
            el.style.opacity = '';
            el.style.borderRadius = '';
            el.style.transition = '';
        }
        for (const lista of [titulos, cards, imagens, celulares])
            lista.forEach((item) => {
                item.ultimo = Array.isArray(item.ultimo) ? [] : null;
                item.zona = null;
                for (const k of ['t', 'o', 'f']) delete item[k];
            });
        for (const k of Object.keys(heroCache)) delete heroCache[k];
    }

    // ---- 1. Título do hero ao carregar --------------------------------------
    let heroIniciado = false;
    function iniciarHero() {
        if (heroIniciado || !heroTitulo) return;
        heroIniciado = true;
        if (movimentoReduzido()) {
            heroTitulo.classList.add('is-in');
            return;
        }
        setTimeout(() => {
            heroPalavras.forEach((w, i) => {
                w.style.transition = `transform ${HERO_DURACAO_MS}ms ${EASE_OUT_CUBIC_CSS} ${i * HERO_INTERVALO_MS}ms`;
            });
            heroTitulo.classList.add('is-in');
        }, HERO_ATRASO_MS);
    }
    if (document.readyState === 'complete') iniciarHero();
    else window.addEventListener('load', iniciarHero);

    // ---- Loop ------------------------------------------------------------------
    let ligado = false;
    function quadro() {
        if (!ligado) return;
        if (precisaMedir || window.scrollY !== ultimoY || window.innerHeight !== ultimoVh) atualizar();
        requestAnimationFrame(quadro);
    }
    // O scroll suave avisa logo depois de cada scrollTo: atualiza no mesmo quadro.
    window.addEventListener('arcadia:rolagem', () => {
        if (ligado && window.scrollY !== ultimoY) atualizar();
    });

    function ligar() {
        if (ligado) return;
        ligado = true;
        precisaMedir = true;
        atualizar();
        requestAnimationFrame(quadro);
    }
    function desligar() {
        ligado = false;
        limparTudo();
        if (heroTitulo) heroTitulo.classList.add('is-in');
    }
    function aplicarPreferencia() {
        if (movimentoReduzido()) desligar();
        else ligar();
    }

    // ---- Degradê contínuo nos títulos (.text-gradient) ---------------------------
    // Cada palavra é uma máscara própria e pinta só o seu recorte do degradê. A caixa
    // que envolve todas as palavras (--gw × --gh) e a posição de cada uma dentro dela
    // (--gx, --gy) vão para o CSS; assim a cor continua de uma palavra para a outra.
    // Mede a máscara (.w), que nunca é transformada, e não a palavra em movimento.
    function medirDegrades() {
        const medidas = [];
        for (const el of document.querySelectorAll('.text-gradient')) {
            const mascaras = Array.from(el.querySelectorAll('.w'));
            if (!mascaras.length) continue;
            const caixas = mascaras.map((w) => w.getBoundingClientRect());
            const esquerda = Math.min(...caixas.map((c) => c.left));
            const topo = Math.min(...caixas.map((c) => c.top));
            const largura = Math.max(...caixas.map((c) => c.right)) - esquerda;
            const altura = Math.max(...caixas.map((c) => c.bottom)) - topo;
            if (largura > 0 && altura > 0)
                medidas.push({ el, mascaras, caixas, esquerda, topo, largura, altura });
        }
        // Escritas depois de todas as leituras.
        for (const m of medidas) {
            m.el.style.setProperty('--gw', `${arred(m.largura, 1)}px`);
            m.el.style.setProperty('--gh', `${arred(m.altura, 1)}px`);
            m.mascaras.forEach((w, i) => {
                w.style.setProperty('--gx', `${arred(m.caixas[i].left - m.esquerda, 1)}px`);
                w.style.setProperty('--gy', `${arred(m.caixas[i].top - m.topo, 1)}px`);
            });
        }
    }

    const remedir = () => {
        precisaMedir = true;
        medirDegrades();
    };

    // Troca de idioma (js/idioma.js): os títulos recebem texto novo e são divididos de novo.
    window.addEventListener('arcadia:idioma', () => {
        for (const t of titulos) {
            t.palavras = dividirPalavras(t.el);
            t.ultimo = [];
            t.zona = null;
        }
        if (heroTitulo) heroPalavras = Array.from(heroTitulo.querySelectorAll('.w-in'));
        remedir();
        if (ligado) atualizar();
    });
    window.addEventListener('resize', remedir);
    window.addEventListener('load', remedir);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(remedir).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);

    // ---- 8. Destaque que percorre os cards de "Para quem" -------------------------
    // Um card por vez recebe .is-active (o mesmo visual do hover), em sequência, enquanto
    // a grade está na tela. Com o mouse sobre a grade, quem manda é o hover: o ciclo
    // para e só volta quando o ponteiro sai. Não depende do loop de scroll.
    (function percorrerPublicos() {
        const grade = document.querySelector('.audience-grid');
        const cartoes = grade ? Array.from(grade.querySelectorAll('.audience-card')) : [];
        if (cartoes.length < 2 || typeof IntersectionObserver === 'undefined') return;
        if (movimentoReduzido()) return;
        let atual = -1;
        let relogio = null;
        let naTela = false;
        let comMouse = false;
        const marcar = (indice) =>
            cartoes.forEach((c, i) => c.classList.toggle('is-active', i === indice));
        const avancar = () => {
            atual = (atual + 1) % cartoes.length;
            marcar(atual);
        };
        function acertar() {
            const rodar = naTela && !comMouse;
            if (rodar && relogio === null) {
                avancar();
                relogio = setInterval(avancar, DESTAQUE_INTERVALO_MS);
            } else if (!rodar && relogio !== null) {
                clearInterval(relogio);
                relogio = null;
                if (comMouse) marcar(-1);
            }
        }
        new IntersectionObserver(
            (entradas) => {
                naTela = entradas[entradas.length - 1].isIntersecting;
                acertar();
            },
            { threshold: DESTAQUE_VISIVEL_MIN }
        ).observe(grade);
        grade.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return;
            comMouse = true;
            acertar();
        });
        grade.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse') return;
            comMouse = false;
            acertar();
        });
    })();

    aplicarPreferencia();
    medirDegrades();
})();
