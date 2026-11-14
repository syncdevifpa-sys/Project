/* Limite por curso: duração oficial mais uma etapa do mesmo regime. */
(function (A) {
    const states = new WeakMap();
    function attach(course, stage, courses, selectedCourse, selectedStage) {
        if (!course || !stage) return;
        let state = states.get(course);
        if (!state) {
            state = { enabled: !course.disabled, stage };
            if (course.parentElement) {
                state.duration = document.createElement('small');
                state.duration.className = 'ar-course-duration';
                state.duration.id = (course.id || 'course') + '-duration';
                state.duration.setAttribute('role', 'status');
                state.duration.hidden = true;
                course.parentElement.append(state.duration);
                course.setAttribute('aria-describedby', [course.getAttribute('aria-describedby'), state.duration.id].filter(Boolean).join(' '));
            }
            state.update = (value) => {
                const selected = state.courses.find(
                    (row) => String(row.id_curso) === String(course.value)
                );
                const regime = selected?.regime_referencia || selected?.regime_etapas;
                const total = Number(selected?.etapas_referencia ?? selected?.total_etapas);
                const valid =
                    selected &&
                    ['anual', 'semestral'].includes(regime) &&
                    Number.isInteger(total) &&
                    total >= 1 &&
                    total <= 20;
                const maximum = total + 1;
                if (state.duration) {
                    state.duration.textContent = selected?.duracao_texto ? 'Duração de referência: ' + selected.duracao_texto + (valid ? ' · Permitido até o ' + maximum + 'º ' + (regime === 'anual' ? 'ano' : 'semestre') : '') : '';
                    state.duration.hidden = !state.duration.textContent;
                }
                stage.replaceChildren();
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = valid
                    ? 'Selecione sua etapa atual'
                    : selected
                      ? 'Etapas ainda não configuradas pela equipe'
                      : 'Selecione o curso primeiro';
                stage.append(placeholder);
                stage.disabled = !valid || !state.enabled;
                stage.required = valid && state.enabled;
                if (valid)
                    for (let n = 1; n <= maximum; n++) {
                        const option = document.createElement('option');
                        option.value = String(n);
                        option.textContent = `${n}º ${regime === 'anual' ? 'ano' : 'semestre'}`;
                        stage.append(option);
                    }
                const number = Number(value);
                stage.value = valid && Number.isInteger(number) && number >= 1 && number <= maximum ? String(number) : '';
            };
            course.addEventListener('change', () => state.update());
            states.set(course, state);
        }
        const previousCourse = selectedCourse === undefined ? course.value : selectedCourse;
        const previousStage = selectedStage === undefined ? stage.value : selectedStage;
        state.courses = courses.filter((row) => row.ativo === true || Number(row.ativo) === 1);
        course.replaceChildren();
        const first = document.createElement('option');
        first.value = '';
        first.textContent = 'Selecione seu curso';
        course.append(first);
        for (const row of state.courses) {
            const option = document.createElement('option');
            option.value = String(row.id_curso);
            option.textContent = row.nome;
            course.append(option);
        }
        course.value = state.courses.some(row=>String(row.id_curso)===String(previousCourse)) ? String(previousCourse) : '';
        state.update(previousStage);
    }
    A.courseStages = { attach, setEnabled(course, enabled) {
        const state = states.get(course);
        if (!state) return;
        state.enabled = enabled;
        const stage = state.stage;
        state.update(stage.value);
    } };
})((window.Arcadia = window.Arcadia || {}));
