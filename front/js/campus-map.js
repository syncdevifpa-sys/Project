(function (A) {
    'use strict';
    const model = A.campusMapModel,
        svg = document.getElementById('campusMap');
    if (!model || !svg) return;
    const $ = (id) => document.getElementById(id),
        viewport = $('mapViewport'),
        layer = $('mapBlocks'),
        info = $('mapInfo'),
        list = $('mapPlaceList'),
        status = $('mapStatus');
    const create = (tag, text) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        return node;
    };
    const ns = (tag, attrs) => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
        return node;
    };
    const groups = new Map(),
        pointers = new Map();
    let view = { ...model.bounds },
        selected = '',
        category = 'todos',
        matches = [],
        dragged = false,
        drag = null,
        pinch = null;
    function paintView() {
        svg.setAttribute('viewBox', [view.x, view.y, view.width, view.height].join(' '));
        $('mapZoom').textContent = Math.round((model.bounds.width / view.width) * 100) + '%';
        $('mapZoomIn').disabled = view.width <= model.bounds.width / 6 + 0.00001;
        $('mapZoomOut').disabled = view.width >= model.bounds.width - 0.00001;
        const camera = $('mapCamera');
        if (camera)
            for (const key of ['x', 'y', 'width', 'height']) camera.setAttribute(key, view[key]);
    }
    function point(clientX, clientY) {
        const p = svg.createSVGPoint();
        p.x = clientX;
        p.y = clientY;
        const matrix = svg.getScreenCTM();
        return matrix
            ? p.matrixTransform(matrix.inverse())
            : { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    }
    function zoom(factor, anchor) {
        view = model.zoom(view, factor, anchor);
        paintView();
    }
    function mark() {
        for (const [id, group] of groups)
            group.setAttribute('aria-pressed', String(id === selected));
        for (const button of list.querySelectorAll('button'))
            button.setAttribute('aria-pressed', String(button.dataset.place === selected));
    }
    function select(id, { focusMap = false } = {}) {
        const place = model.places.find((item) => item.id === id);
        if (!place) return;
        selected = id;
        if (window.history?.replaceState) {
            try {
                window.history.replaceState(null, '', '#local=' + encodeURIComponent(id));
            } catch (_) {
                /* O mapa continua disponível se o ambiente bloquear o histórico. */
            }
        }
        info.replaceChildren(create('h2', place.name));
        const details = create('ul');
        for (const note of place.notes) details.append(create('li', note));
        info.append(details);
        if (place.source === 'mapa-2022')
            info.append(
                create(
                    'p',
                    'Informação do mapa histórico; uso e localização atuais precisam de confirmação.'
                )
            );
        if (place.references?.length) {
            const referenceDetails = create('details');
            referenceDetails.className = 'ar-campus-map-references';
            referenceDetails.append(create('summary', 'Fontes consultadas'));
            const sources = create('ul');
            for (const reference of place.references) {
                const item = create('li'),
                    link = create('a', reference.title);
                link.href = reference.url;
                item.append(link);
                sources.append(item);
            }
            referenceDetails.append(sources);
            info.append(referenceDetails);
        }
        if (place.path) {
            const focus = create('button', 'Localizar no mapa');
            focus.type = 'button';
            focus.className = 'ar-btn';
            focus.onclick = () => focusPlace(place);
            info.append(focus);
            status.textContent =
                place.name + ' selecionado. As informações estão no painel de detalhes.';
        } else
            status.textContent =
                'Localização a confirmar: ' +
                place.name +
                '. Este item não tem ponto atribuído no mapa.';
        if (focusMap) {
            if (place.path) focusPlace(place);
            info.tabIndex = -1;
            info.focus();
        }
        if (window.location) {
            const share = create('button', 'Compartilhar local');
            share.type = 'button';
            share.className = 'ar-btn ar-btn--secondary';
            share.onclick = () => {
                const link = create('input');
                link.type = 'text';
                link.readOnly = true;
                link.value = window.location.href;
                link.setAttribute('aria-label', 'Link direto deste local');
                info.append(link);
                share.disabled = true;
                link.focus();
                link.select();
                status.textContent = 'Link do local selecionado. Copie para compartilhar.';
            };
            info.append(share);
        }
        mark();
    }
    function focusPlace(place) {
        view = model.clamp({ width: 320, height: 632, x: place.x - 160, y: place.y - 316 });
        paintView();
        viewport.focus({ preventScroll: true });
    }
    for (const place of model.places) {
        if (!place.path) continue;
        const group = ns('g', {
            role: 'button',
            tabindex: '0',
            'aria-label': place.name,
            'aria-pressed': 'false',
            'data-place': place.id,
            'data-kind': place.kind,
            'data-dashed': !!place.dashed,
            'data-small': place.label.length > 1
        });
        group.classList.add('ar-map-place');
        const title = ns('title', {});
        title.textContent = place.name;
        group.append(title);
        const preview = () => {
            if ($('mapHover')) $('mapHover').textContent = place.name;
        };
        group.addEventListener('pointerenter', preview);
        group.addEventListener('focus', preview);
        const shape = ns('path', { d: place.path }),
            label = ns('text', { x: place.x, y: place.y });
        label.textContent = place.label;
        group.append(shape, label);
        group.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                select(place.id);
            }
        });
        group.addEventListener('click', (event) => {
            if (event.detail === 0) select(place.id);
        });
        layer.append(group);
        groups.set(place.id, group);
    }
    function filter() {
        matches = model.search($('mapSearch').value, $('mapKind').value, category);
        const ids = new Set(matches.map((place) => place.id));
        list.replaceChildren();
        if ($('mapShowResults'))
            $('mapShowResults').disabled = !matches.some((place) => place.path);
        for (const place of matches) {
            const item = create('li'),
                button = create('button', place.name);
            button.type = 'button';
            button.dataset.place = place.id;
            button.setAttribute('aria-label', 'Ver detalhes de ' + place.name);
            button.onclick = () => select(place.id, { focusMap: true });
            item.append(button);
            list.append(item);
        }
        $('mapResults').textContent = matches.length
            ? matches.length + ' locais encontrados'
            : 'Nenhum local encontrado. Tente outro nome ou filtro.';
        for (const [id, group] of groups) group.dataset.matched = String(ids.has(id));
        mark();
    }
    const categoryControls = $('mapCategories');
    if (categoryControls)
        for (const button of categoryControls.querySelectorAll('button'))
            button.onclick = () => {
                category = button.dataset.category;
                for (const item of categoryControls.querySelectorAll('button'))
                    item.setAttribute('aria-pressed', String(item === button));
                filter();
            };
    if ($('mapClear'))
        $('mapClear').onclick = () => {
            $('mapSearch').value = '';
            $('mapKind').value = 'todos';
            category = 'todos';
            if (categoryControls)
                for (const item of categoryControls.querySelectorAll('button'))
                    item.setAttribute('aria-pressed', String(item.dataset.category === 'todos'));
            filter();
            $('mapSearch').focus();
            status.textContent = 'Busca e filtros limpos. Todos os locais estão disponíveis.';
        };
    if ($('mapOverview'))
        $('mapOverview').onclick = (event) => {
            if (event.detail === 0) {
                $('mapFit').click();
                return;
            }
            const overview = $('mapOverviewSvg'),
                matrix = overview.getScreenCTM();
            if (!matrix) return;
            const anchor = overview.createSVGPoint();
            anchor.x = event.clientX;
            anchor.y = event.clientY;
            const position = anchor.matrixTransform(matrix.inverse());
            view = model.clamp({
                ...view,
                x: position.x - view.width / 2,
                y: position.y - view.height / 2
            });
            paintView();
            status.textContent =
                'Área ampliada recentralizada. Use o mapa principal para explorar os blocos.';
        };
    $('mapSearch').addEventListener('input', filter);
    $('mapKind').addEventListener('change', filter);
    if ($('mapShowResults'))
        $('mapShowResults').onclick = () => {
            const positioned = matches.filter((place) => place.path);
            if (!positioned.length) return;
            const xs = positioned.map((place) => place.x),
                ys = positioned.map((place) => place.y);
            const left = Math.min(...xs),
                right = Math.max(...xs),
                top = Math.min(...ys),
                bottom = Math.max(...ys);
            const width = Math.max(
                240,
                right - left + 220,
                ((bottom - top + 240) * model.bounds.width) / model.bounds.height
            );
            view = model.clamp({
                x: (left + right - width) / 2,
                y: (top + bottom - (width * model.bounds.height) / model.bounds.width) / 2,
                width,
                height: (width * model.bounds.height) / model.bounds.width
            });
            paintView();
            status.textContent =
                positioned.length +
                ' locais enquadrados. Itens sem posição confirmada continuam na lista.';
        };
    $('mapZoomIn').onclick = () => zoom(1.3);
    $('mapZoomOut').onclick = () => zoom(1 / 1.3);
    $('mapFit').onclick = () => {
        view = { ...model.bounds };
        paintView();
        status.textContent = 'Campus inteiro. Selecione um bloco ou use a busca.';
    };
    viewport.addEventListener('keydown', (event) => {
        if (event.target.closest('[data-place]') && ['Enter', ' '].includes(event.key)) return;
        const step = view.width * 0.12;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            view = model.clamp({
                ...view,
                x:
                    view.x +
                    (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
                y: view.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
            });
            paintView();
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoom(1.3);
        } else if (event.key === '-') {
            event.preventDefault();
            zoom(1 / 1.3);
        } else if (event.key === '0' || event.key === 'Home') {
            event.preventDefault();
            $('mapFit').click();
        }
    });
    viewport.addEventListener('dblclick', (event) => {
        event.preventDefault();
        zoom(2, point(event.clientX, event.clientY));
    });
    viewport.addEventListener(
        'wheel',
        (event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, point(event.clientX, event.clientY));
        },
        { passive: false }
    );
    const gesture = () => {
        const points = [...pointers.values()];
        if (points.length < 2) return null;
        const [a, b] = points;
        return {
            distance: Math.hypot(a.x - b.x, a.y - b.y),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };
    };
    viewport.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        viewport.setPointerCapture(event.pointerId);
        if (pointers.size === 1) {
            dragged = false;
            drag = {
                x: event.clientX,
                y: event.clientY,
                view: { ...view },
                place: event.target.closest('[data-place]')?.dataset.place
            };
        } else {
            dragged = true;
            pinch = gesture();
        }
    });
    viewport.addEventListener('pointermove', (event) => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size >= 2) {
            const next = gesture();
            if (pinch && next && pinch.distance > 0)
                zoom(next.distance / pinch.distance, point(next.x, next.y));
            pinch = next;
            return;
        }
        if (!drag) return;
        const dx = event.clientX - drag.x,
            dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) > 6) dragged = true;
        if (dragged) {
            const matrix = svg.getScreenCTM();
            if (!matrix) return;
            view = model.clamp({
                ...drag.view,
                x: drag.view.x - dx / matrix.a,
                y: drag.view.y - dy / matrix.d
            });
            paintView();
            viewport.dataset.dragging = 'true';
        }
    });
    function finish(event, canceled = false) {
        if (!pointers.has(event.pointerId)) return;
        if (
            !canceled &&
            !dragged &&
            drag?.place &&
            Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 6
        )
            select(drag.place);
        pointers.delete(event.pointerId);
        if (viewport.hasPointerCapture(event.pointerId))
            viewport.releasePointerCapture(event.pointerId);
        viewport.dataset.dragging = 'false';
        pinch = null;
        const remaining = [...pointers.values()][0];
        drag = remaining ? { x: remaining.x, y: remaining.y, view: { ...view } } : null;
    }
    viewport.addEventListener('pointerup', (event) => finish(event));
    viewport.addEventListener('pointercancel', (event) => finish(event, true));
    const account = A.auth?.getSessao();
    if (account?.tipo_usuario) {
        $('mapAccountLink').textContent = 'Meu painel';
        $('mapAccountLink').href =
            account.tipo_usuario === 'externo' ? 'community.html' : 'dashboard.html';
    }
    function openLink() {
        const match = /^#local=([a-z0-9-]+)$/.exec(window.location?.hash || '');
        if (match && model.places.some((place) => place.id === match[1])) {
            select(match[1]);
            const place = model.places.find((place) => place.id === match[1]);
            if (place.path) focusPlace(place);
        }
    }
    if (window.addEventListener) window.addEventListener('hashchange', openLink);
    filter();
    paintView();
    status.textContent = 'Escolha um local. Arraste para mover ou use os controles de ampliação.';
    openLink();
})(window.Arcadia);
