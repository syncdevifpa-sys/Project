// Preferências visuais locais, separadas dos dados públicos do calendário.
(function (A) {
    'use strict';
    const defaults = {
        evento: '#176b9a',
        matricula: '#3766c0',
        edital: '#7854a1',
        cancelamento: '#b52f46',
        feriado: '#ae4628',
        ferias: '#32814a',
        aniversario: '#a23980'
    };
    const labels = {
        evento: 'Eventos',
        matricula: 'Matrículas',
        edital: 'Editais',
        cancelamento: 'Cancelamentos',
        feriado: 'Feriados',
        ferias: 'Férias',
        aniversario: 'Aniversários'
    };
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
    function apply() {
        const colors = read();
        for (const [name, value] of Object.entries(colors))
            document.documentElement.style.setProperty('--event-' + name, value);
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
            'Personalize as categorias neste navegador. Os nomes continuam visíveis para identificar os eventos.';
        const fields = document.createElement('div');
        fields.className = 'ar-color-fields';
        section.append(heading, hint, fields);
        const colors = read();
        for (const name of Object.keys(defaults)) {
            const label = document.createElement('label');
            label.textContent = labels[name];
            const input = document.createElement('input');
            input.type = 'color';
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
    A.calendarColors = { defaults, labels, valid, read, apply };
    document.addEventListener('DOMContentLoaded', () => {
        apply();
        settings();
    });
    window.addEventListener('storage', apply);
})((window.Arcadia = window.Arcadia || {}));
