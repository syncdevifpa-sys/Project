// Preferências visuais locais, separadas dos dados públicos do calendário.
(function (A) {
    'use strict';
    const catalogue = A.calendarCategories;
    const defaults = Object.fromEntries(
        Object.entries(catalogue.groups).map(([name, group]) => [name, group.color])
    );
    const labels = catalogue.options;
    const shortLabels = labels;
    const descriptions = Object.fromEntries(
        Object.entries(catalogue.groups).map(([name, group]) => [name, group.description])
    );
    const valid = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    const key = () => 'arcadia-calendar-colors-' + (A.auth?.getSessao()?.id_usuario || 'visitor');
    function read() {
        try {
            const data = JSON.parse(localStorage.getItem(key()) || '{}');
            return Object.fromEntries(
                Object.entries(defaults).map(([name, value]) => [
                    name,
                    valid(data[name]) ? data[name] : value
                ])
            );
        } catch {
            return { ...defaults };
        }
    }
    function legend() {
        const root = document.getElementById('calendarColorLegend');
        if (!root) return;
        root.replaceChildren();
        for (const [name, color] of Object.entries(read())) {
            const item = document.createElement('span');
            item.className = 'ar-event-color-preview';
            const swatch = document.createElement('span');
            swatch.className = 'ar-color-swatch';
            swatch.style.backgroundColor = color;
            swatch.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span');
            text.textContent = shortLabels[name] || labels[name];
            item.title = labels[name];
            item.append(swatch, text);
            root.append(item);
        }
    }
    function apply() {
        const colors = read();
        for (const [name, value] of Object.entries(colors))
            document.documentElement.style.setProperty('--event-' + name, value);
        for (const [name, group] of Object.entries(catalogue.aliases))
            document.documentElement.style.setProperty('--event-' + name, colors[group]);
    }
    function settings() {
        const anchor = document.getElementById('accentPickerGroup');
        if (!anchor) return;
        const section = document.createElement('section');
        section.className = 'ar-calendar-color-settings';
        const heading = document.createElement('h3');
        heading.textContent = 'Cores do calendário';
        const hint = document.createElement('p');
        hint.textContent =
            'Escolha a cor de cada categoria para sua conta neste navegador. Os nomes e as explicações continuam identificando os eventos. Isso não altera as cores originais dos PDFs.';
        const fields = document.createElement('div');
        fields.className = 'ar-color-fields';
        section.append(heading, hint, fields);
        const colors = read();
        for (const name of Object.keys(defaults)) {
            const label = document.createElement('label');
            const text = document.createElement('span');
            text.className = 'ar-color-setting-copy';
            const title = document.createElement('strong');
            title.textContent = shortLabels[name] || labels[name];
            const description = document.createElement('small');
            description.id = 'calendar-color-description-' + name;
            description.textContent = descriptions[name];
            text.append(title, description);
            label.append(text);
            const input = document.createElement('input');
            input.type = 'color';
            input.setAttribute('aria-label', 'Cor de ' + (shortLabels[name] || labels[name]));
            input.setAttribute('aria-describedby', description.id);
            input.value = colors[name];
            input.addEventListener('input', () => {
                colors[name] = input.value;
                try {
                    localStorage.setItem(key(), JSON.stringify(colors));
                    apply();
                    hint.textContent = 'Cores salvas neste navegador.';
                } catch {
                    hint.textContent = 'Não foi possível salvar as cores neste navegador.';
                }
            });
            label.append(input);
            fields.append(label);
        }
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'ar-btn ar-btn--secondary';
        reset.textContent = 'Restaurar cores padrão';
        reset.addEventListener('click', () => {
            try {
                localStorage.removeItem(key());
                apply();
                fields
                    .querySelectorAll('input')
                    .forEach((input, index) => (input.value = Object.values(defaults)[index]));
                hint.textContent = 'Cores padrão restauradas.';
            } catch {
                hint.textContent = 'Não foi possível salvar a alteração.';
            }
        });
        section.append(reset);
        (anchor.closest('.ar-srow') || anchor).after(section);
    }
    A.calendarColors = { defaults, labels, descriptions, valid, read, apply };
    document.addEventListener('DOMContentLoaded', () => {
        apply();
        settings();
        legend();
    });
    window.addEventListener('storage', () => {
        apply();
        legend();
    });
})((window.Arcadia = window.Arcadia || {}));
