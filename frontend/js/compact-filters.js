(function () {
    'use strict';
    if (window.Arcadia?.setupCompactFilters) return;
    const refreshers = new WeakMap();
    function setup(root) {
        root.querySelectorAll('.ar-compact-filters').forEach(function (panel) {
            if (panel.dataset.compactReady) return;
            panel.dataset.compactReady = 'true';
            panel.open = false;
            const summary = panel.querySelector(':scope > summary');
            const body = panel.querySelector(':scope > .ar-compact-filter-body');
            if (!summary || !body) return;
            const inputs = Array.from(body.querySelectorAll('input[type=checkbox], select'));
            const defaults = inputs.map(function (input) {
                return { input, value: input.value, checked: input.checked };
            });
            const groups = Array.from(body.querySelectorAll('[role=group]'))
                .map(function (group) {
                    return { group, initial: group.querySelector('[aria-pressed=true]') };
                })
                .filter(function (group) {
                    return group.initial;
                });
            let selection;
            if (
                !summary.querySelector('#noticeFilterSummary, #taskFilterSummary') &&
                panel.id !== 'calendarOptions'
            ) {
                selection = document.createElement('span');
                selection.className = 'ar-compact-filter-selection';
                summary.append(selection);
            }
            function update() {
                if (!selection) return;
                const labels = [];
                inputs.forEach(function (input) {
                    if (input.tagName === 'SELECT' && input.selectedIndex > 0)
                        labels.push(input.options[input.selectedIndex].textContent.trim());
                });
                groups.forEach(function (entry) {
                    const chosen = entry.group.querySelector('[aria-pressed=true]');
                    if (chosen && chosen !== entry.initial)
                        labels.push(chosen.textContent.replace(/\(\d+\)/g, '').trim());
                });
                selection.textContent =
                    labels.length > 1 ? labels.length + ' selecionados' : labels[0] || '';
                selection.title = labels.join(', ');
            }
            const actions = document.createElement('div');
            actions.className = 'ar-compact-filter-actions';
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.className = 'ar-btn ar-btn--quiet';
            clear.textContent = 'Limpar filtros';
            clear.addEventListener('click', function () {
                groups.forEach(function (entry) {
                    entry.initial.click();
                });
                defaults.forEach(function (entry) {
                    const input = entry.input;
                    if (input.type === 'checkbox') {
                        if (input.checked !== entry.checked) input.click();
                    } else if (input.value !== entry.value) {
                        input.value = entry.value;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                update();
            });
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'ar-btn ar-btn--secondary';
            close.textContent = 'Concluir';
            function dismiss(focus) {
                panel.open = false;
                if (focus) summary.focus({ preventScroll: true });
            }
            close.addEventListener('click', function () {
                dismiss(true);
            });
            actions.append(clear, close);
            body.append(actions);
            panel.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && panel.open) {
                    event.preventDefault();
                    dismiss(true);
                }
            });
            function position() {
                if (!panel.open || panel.isConnected === false) return;
                if (window.innerWidth > 700) {
                    body.style.left = '0px';
                    const box = body.getBoundingClientRect();
                    const shift = Math.min(0, window.innerWidth - 16 - box.right);
                    body.style.left = Math.max(16 - box.left, shift) + 'px';
                } else body.style.removeProperty('left');
            }
            window.addEventListener?.('resize', position, { passive: true });
            window.visualViewport?.addEventListener('resize', position, { passive: true });
            panel.addEventListener('toggle', function () {
                if (!panel.open) return;
                position();
                document.querySelectorAll('.ar-compact-filters[open]').forEach(function (other) {
                    if (other !== panel) other.open = false;
                });
            });
            /* Os controladores existentes atualizam a seleção durante os eventos de clique e alteração. */
            body.addEventListener('click', function () {
                queueMicrotask(update);
            });
            body.addEventListener('change', function () {
                queueMicrotask(update);
            });
            refreshers.set(panel, update);
            update();
        });
    }
    document.addEventListener('click', function (event) {
        document.querySelectorAll('.ar-compact-filters[open]').forEach(function (panel) {
            if (!panel.contains(event.target)) panel.open = false;
        });
        queueMicrotask(function () {
            document.querySelectorAll('.ar-compact-filters').forEach(function (panel) {
                refreshers.get(panel)?.();
            });
        });
    });
    /* Tab pode sair do painel sem deixá-lo sobre o conteúdo. Não move o foco de volta. */
    document.addEventListener('focusin', function (event) {
        document.querySelectorAll('.ar-compact-filters[open]').forEach(function (panel) {
            if (!panel.contains(event.target)) panel.open = false;
        });
    });
    document.addEventListener('DOMContentLoaded', function () {
        setup(document);
    });
    document.addEventListener('arcadia:page-loaded', function () {
        setup(document);
    });
    window.Arcadia = window.Arcadia || {};
    window.Arcadia.setupCompactFilters = setup;
})();
