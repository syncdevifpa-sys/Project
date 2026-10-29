// Etapas do aluno vêm da configuração do curso, não do semestre de uma oferta.
(function (A) {
    const states = new WeakMap();
    function attach(course, stage, courses, selectedCourse, selectedStage) {
        if (!course || !stage) return;
        let state = states.get(course);
        if (!state) {
            state = {};
            state.update = (value) => {
                const selected = state.courses.find(
                    (row) => String(row.id_curso) === String(course.value)
                );
                const valid =
                    selected &&
                    ['anual', 'semestral'].includes(selected.regime_etapas) &&
                    Number.isInteger(selected.total_etapas) &&
                    selected.total_etapas >= 1 &&
                    selected.total_etapas <= 20;
                stage.replaceChildren();
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = valid
                    ? 'Selecione sua etapa atual'
                    : selected
                      ? 'Etapas ainda não configuradas pela equipe'
                      : 'Selecione o curso primeiro';
                stage.append(placeholder);
                stage.disabled = !valid;
                if (valid)
                    for (let n = 1; n <= selected.total_etapas; n++) {
                        const option = document.createElement('option');
                        option.value = String(n);
                        option.textContent = `${n}º ${selected.regime_etapas === 'anual' ? 'ano' : 'semestre'}`;
                        stage.append(option);
                    }
                stage.value = value === undefined ? '' : String(value || '');
            };
            course.addEventListener('change', () => state.update());
            states.set(course, state);
        }
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
        course.value = selectedCourse ? String(selectedCourse) : '';
        state.update(selectedStage);
    }
    A.courseStages = { attach };
})((window.Arcadia = window.Arcadia || {}));
