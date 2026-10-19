(function (A) {
    'use strict';
    A.contentEditor = {
        canEdit(resource, notice) {
            if (notice.automatico) return false;
            if (
                resource === 'calendar' &&
                notice.visibilidade === 'pessoal' &&
                Number(notice.id_usuario) !== Number(A.auth.getSessao().id_usuario)
            )
                return false;
            const session = A.auth.getSessao();
            return (
                session.tipo_usuario !== 'externo' &&
                (resource === 'links'
                    ? Boolean(session.is_admin)
                    : A.noticeActions.canDelete(notice)) &&
                (resource !== 'documents' ||
                    notice.status === 'solicitado' ||
                    Boolean(session.is_admin))
            );
        },
        open(resource, notice, onSuccess, initial = {}) {
            const config = A.contentFields[resource],
                fields = config.fields;
            const editing = Boolean(notice),
                session = A.auth.getSessao();
            if (
                editing
                    ? !this.canEdit(resource, notice)
                    : session.tipo_usuario === 'externo' ||
                      !session.id_usuario ||
                      (resource === 'links' && !session.is_admin) ||
                      (resource === 'notices' &&
                          !(
                              session.is_admin ||
                              ['docente', 'servidor'].includes(session.tipo_usuario)
                          ))
            )
                return;
            notice = Object.assign({}, config.defaults, initial, notice || {});
            const canPublish =
                Boolean(session.is_admin) || ['docente', 'servidor'].includes(session.tipo_usuario);
            if (resource === 'calendar' && !editing && !canPublish) notice.visibilidade = 'pessoal';
            const dialog = document.createElement('dialog');
            dialog.className = 'ar-dialog ar-notice-editor';
            dialog.setAttribute('aria-labelledby', 'noticeEditorTitle');
            const title = document.createElement('h2');
            title.id = 'noticeEditorTitle';
            title.textContent = (editing ? 'Editar: ' : 'Criar: ') + config.label;
            dialog.append(title);
            const form = document.createElement('form');
            form.className = 'ar-form-grid';
            const inputs = {};
            for (const [name, text, fieldType, max] of fields) {
                if (resource === 'notices' && name === 'publico_alvo') {
                    const group = document.createElement('fieldset');
                    group.name = name;
                    group.className = 'ar-field ar-span-2 ar-notice-audiences';
                    const legend = document.createElement('legend');
                    legend.textContent = 'Público-alvo · selecione um ou mais';
                    group.append(legend);
                    const selected = A.noticeAudiences.parse(notice[name]);
                    const choices = {};
                    for (const [key, text] of Object.entries(A.noticeAudiences.labels)) {
                        const label = document.createElement('label');
                        const check = document.createElement('input');
                        check.type = 'checkbox';
                        check.value = key;
                        check.checked = selected.includes(key);
                        choices[key] = check;
                        check.addEventListener('change', () => {
                            if (key === 'todos' && check.checked)
                                for (const [name, other] of Object.entries(choices)) {
                                    if (name !== 'todos') other.checked = false;
                                }
                            if (key !== 'todos' && check.checked) choices.todos.checked = false;
                        });
                        const caption = document.createElement('span');
                        caption.textContent = text;
                        label.append(check, caption);
                        group.append(label);
                    }
                    Object.defineProperty(group, 'value', {
                        get() {
                            return Object.entries(choices)
                                .filter(([, check]) => check.checked)
                                .map(([name]) => name);
                        }
                    });
                    inputs[name] = group;
                    form.append(group);
                    continue;
                }
                let type =
                    resource === 'calendar' && name === 'categoria'
                        ? A.calendarCategories.options
                        : fieldType;
                if (
                    resource === 'calendar' &&
                    name === 'visibilidade' &&
                    !canPublish &&
                    (!editing || notice.visibilidade === 'pessoal')
                )
                    type = { pessoal: 'Pessoal · apenas o autor' };
                if (
                    resource === 'calendar' &&
                    name === 'visibilidade' &&
                    editing &&
                    Number(notice.id_usuario) !== Number(session.id_usuario)
                )
                    type = { publico: 'Público · todos podem consultar' };
                const label = document.createElement('label');
                label.className =
                    'ar-field' +
                    (['titulo', 'resumo', 'descricao'].includes(name) ? ' ar-span-2' : '');
                label.textContent = text;
                const input = document.createElement(
                    typeof type === 'object' ? 'select' : type === 'textarea' ? 'textarea' : 'input'
                );
                input.name = name;
                if (typeof type === 'object')
                    for (const [value, text] of Object.entries(type)) {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = text;
                        input.append(option);
                    }
                else if (type === 'textarea') input.rows = 3;
                else input.type = type;
                if (max) input.maxLength = max;
                if (
                    name === 'titulo' ||
                    (resource === 'notices' && name === 'resumo') ||
                    (resource === 'projects' && name === 'descricao') ||
                    (resource === 'calendar' && name === 'data_evento')
                )
                    input.required = true;
                if (type === 'number') {
                    input.min = '0';
                    input.max = '4294967295';
                    input.step = '1';
                }
                if (type === 'checkbox')
                    input.checked = notice[name] === true || notice[name] === 1;
                else
                    input.value =
                        type === 'date'
                            ? String(notice[name] || '').slice(0, 10)
                            : String(notice[name] ?? '');
                if (resource === 'calendar' && name === 'categoria')
                    input.value = A.calendarCategories.canonical(notice[name]);
                inputs[name] = input;
                label.append(input);
                form.append(label);
            }
            if (resource === 'calendar' && A.calendarColors) {
                const preview = document.createElement('p');
                preview.className = 'ar-event-color-preview ar-span-2';
                preview.setAttribute('role', 'status');
                const swatch = document.createElement('span');
                swatch.className = 'ar-color-swatch';
                swatch.setAttribute('aria-hidden', 'true');
                const text = document.createElement('span');
                preview.append(swatch, text);
                const update = () => {
                    const name = inputs.categoria.value;
                    swatch.style.backgroundColor = A.calendarColors.read()[name];
                    text.textContent = A.calendarColors.labels[name] || name;
                    inputs.categoria.style.borderInlineStart =
                        '6px solid ' + A.calendarColors.read()[name];
                };
                inputs.categoria.addEventListener('change', update);
                update();
                inputs.categoria.parentElement.after(preview);
            }
            const cover = resource === 'notices' ? A.noticeCover?.editor(form, notice.capa) : null;
            const error = document.createElement('p');
            error.className = 'ar-notice-editor-error ar-span-2';
            error.setAttribute('role', 'alert');
            form.append(error);
            const hint = document.createElement('p');
            hint.className = 'notice-filter-hint ar-span-2';
            hint.textContent =
                'Links completos http:// ou https:// ficam clicáveis no conteúdo.' +
                (resource === 'notices'
                    ? ' Todos inclui a comunidade externa.'
                    : resource === 'documents'
                      ? ' A secretaria mantém protocolo, processamento e entrega.'
                      : '');
            form.append(hint);
            const actions = document.createElement('div');
            actions.className = 'ar-profile-actions ar-span-2';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'ar-btn ar-btn--secondary';
            cancel.textContent = 'Cancelar';
            cancel.addEventListener('click', () => dialog.close());
            const save = document.createElement('button');
            save.type = 'submit';
            save.className = 'ar-btn ar-btn--primary';
            save.textContent = editing ? 'Salvar alterações' : 'Criar registro';
            actions.append(cancel, save);
            form.append(actions);
            dialog.append(form);
            let saving = false;
            dialog.addEventListener('cancel', (event) => {
                if (saving) event.preventDefault();
            });
            dialog.addEventListener('close', () => dialog.remove(), { once: true });
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (resource === 'notices' && !inputs.publico_alvo.value.length) {
                    error.textContent = 'Selecione ao menos um público-alvo.';
                    return;
                }
                if (cover?.busy) {
                    error.textContent = 'Aguarde a imagem terminar de carregar.';
                    return;
                }
                if (saving) return;
                saving = true;
                save.disabled = true;
                cancel.disabled = true;
                error.textContent = '';
                const payload = {};
                for (const [name, , type] of fields)
                    payload[name] =
                        type === 'checkbox'
                            ? inputs[name].checked
                            : type === 'number'
                              ? inputs[name].value === ''
                                  ? null
                                  : Number(inputs[name].value)
                              : ['date', 'time', 'datetime-local'].includes(type)
                                ? inputs[name].value || null
                                : inputs[name].value;
                if (
                    resource === 'calendar' &&
                    editing &&
                    A.calendarCategories.canonical(notice.categoria) === payload.categoria
                )
                    payload.categoria = notice.categoria;
                if (cover?.changed) payload.capa = cover.value;
                try {
                    await A.api.expect(
                        editing
                            ? resource === 'notices'
                                ? A.api.put(
                                      config.endpoint + '/' + encodeURIComponent(notice[config.id]),
                                      payload
                                  )
                                : A.api.patch(
                                      '/api/content/' +
                                          resource +
                                          '/' +
                                          encodeURIComponent(notice[config.id]),
                                      payload
                                  )
                            : A.api.post(config.endpoint, payload)
                    );
                    dialog.close();
                    A.showToast(
                        resource === 'calendar' && payload.oculto
                            ? 'Evento ocultado. Você pode reexibi-lo em Editar eventos.'
                            : editing
                              ? 'Registro atualizado.'
                              : 'Registro criado.'
                    );
                    try {
                        await onSuccess(payload);
                    } catch {
                        A.showToast('Registro salvo. Recarregue a página para atualizar a lista.');
                    }
                } catch (failure) {
                    error.textContent =
                        failure.message ||
                        'Não foi possível salvar. Seus dados continuam no formulário.';
                } finally {
                    saving = false;
                    save.disabled = false;
                    cancel.disabled = false;
                }
            });
            document.body.append(dialog);
            dialog.showModal();
            inputs.titulo.focus();
            return dialog;
        }
    };
    A.noticeEditor = {
        open: (notice, onSuccess) => A.contentEditor.open('notices', notice, onSuccess)
    };
})(window.Arcadia);
