(function (A) {
    'use strict';
    async function init() {
        const host = document.getElementById('taskReminders');
        if (!host || !A.auth.estaLogado() || A.auth.getSessao().tipo_usuario === 'externo') return;
        const call = (path, method = 'GET', body) => A.api.expect(A.api.request('/api/reminders' + path, { method, body }));
        const make = (tag, text, cls) => {
            const n = document.createElement(tag);
            if (text !== undefined) n.textContent = text;
            if (cls) n.className = cls;
            return n;
        };
        const status = make('p'); status.setAttribute('role', 'status');
        const controls = make('div'), list = make('div', undefined, 'ar-task-reminders-list');
        host.append(controls, status, list);
        let prefs = {}, reminders = [];
        function button(text, action) {
            const b = make('button', text, 'ar-btn ar-btn--secondary'); b.type = 'button';
            b.onclick = async () => { b.disabled = true; try { await action(b); } catch (e) { status.textContent = e.message; } finally { b.disabled = false; } };
            return b;
        }
        function time(row) {
            if (!row.agendado_utc) return 'Data antiga: revise o horário e o fuso antes de agendar.';
            try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: row.fuso_horario }).format(new Date(row.agendado_utc)) + ' · ' + row.fuso_horario; }
            catch { return 'Revise a data do lembrete.'; }
        }
        async function reload() {
            [prefs, reminders] = await Promise.all([call('/preferences'), call('')]);
            controls.replaceChildren(); list.replaceChildren();
            const consentLabel = make('label'), consent = make('input');
            consent.type = 'checkbox'; consent.checked = prefs.email_lembretes;
            consentLabel.append(consent, document.createTextNode(' Quero receber lembretes no e-mail da minha conta'));
            consent.disabled = !prefs.email_confirmado && !prefs.email_lembretes;
            consent.onchange = async () => {
                consent.disabled = true;
                try { const result = await call('/preferences', 'PUT', { email_lembretes: consent.checked }); await reload(); status.textContent = result.message; }
                catch (e) { consent.checked = !consent.checked; status.textContent = e.message; }
                finally { consent.disabled = !prefs.email_confirmado && !prefs.email_lembretes; }
            };
            controls.append(make('p', prefs.email_confirmado ? 'Destino fixo: ' + prefs.email : 'Confirme o e-mail da sua conta para ativar notificações.'), consentLabel,
                make('p', prefs.envio_habilitado ? 'O envio depende do processamento periódico do servidor. Você pode desativar os avisos a qualquer momento.' : 'O envio por e-mail ainda não está disponível. Seus lembretes continuam salvos aqui.'),
                button('Criar lembrete', () => editor()));
            if (!reminders.length) list.append(make('p', 'Nenhum lembrete cadastrado.'));
            for (const row of reminders) {
                const card = make('article');
                card.append(make('h3', row.titulo), make('p', time(row)), make('p', row.ativo ? 'Ativo' : 'Desativado'));
                if (row.tarefa) card.append(make('p', 'Tarefa: ' + row.tarefa));
                if (row.descricao) card.append(make('p', row.descricao));
                if (row.enviar_email) card.append(make('p', 'E-mail autorizado para este lembrete.'));
                const delivery = { enviado: 'E-mail enviado.', reservado: 'Envio reservado. Se houve interrupção, revise antes de reagendar.',
                    falhou: 'Não foi possível confirmar o envio. Não haverá nova tentativa automática.', cancelado: 'Envio cancelado. Revise o lembrete para reagendar.' };
                if (delivery[row.envio_estado]) card.append(make('p', delivery[row.envio_estado]));
                const actions = make('div', undefined, 'ar-reminder-actions');
                actions.append(button('Editar', () => editor(row)), button('Excluir', async () => {
                    if (!(await A.confirmAction({ title: 'Excluir este lembrete?', message: 'O lembrete e o envio ainda não iniciado serão cancelados. Uma mensagem já entregue não pode ser recolhida.', items: [row.titulo], confirmLabel: 'Excluir lembrete' }))) return;
                    await call('/' + row.id_lembrete, 'DELETE'); await reload(); status.textContent = 'Lembrete excluído.';
                }));
                card.append(actions); list.append(card);
            }
        }
        async function editor(row = {}) {
            const tasks = await A.api.expect(A.api.get('/api/tasks'));
            const dialog = make('dialog', undefined, 'ar-reminder-editor');
            const h = make('h2', row.id_lembrete ? 'Editar lembrete' : 'Criar lembrete'); h.id = 'reminderEditorTitle';
            dialog.setAttribute('aria-labelledby', h.id);
            const form = make('form'), feedback = make('p'); feedback.setAttribute('role', 'status');
            function field(label, type, value = '') {
                const wrap = make('label', label), input = make(type === 'textarea' || type === 'select' ? type : 'input');
                if (input.tagName === 'INPUT') input.type = type;
                input.value = value; wrap.append(input); form.append(wrap); return input;
            }
            const title = field('Título', 'text', row.titulo || ''); title.required = true; title.maxLength = 150;
            const description = field('Descrição (opcional)', 'textarea', row.descricao || ''); description.maxLength = 3000;
            const task = field('Tarefa (opcional)', 'select');
            const none = make('option', 'Sem tarefa'); none.value = ''; task.append(none);
            for (const item of tasks) {
                if (item.status === 'concluida' && Number(row.id_tarefa) !== Number(item.id_tarefa)) continue;
                const option = make('option', item.titulo + (item.status === 'concluida' ? ' · concluída' : '')); option.value = item.id_tarefa; task.append(option);
            }
            task.value = row.id_tarefa || '';
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Fortaleza';
            const local = new Date(row.agendado_utc || Date.now() + 3600000);
            const localValue = new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            const when = field('Data e horário · ' + zone, 'datetime-local', localValue); when.required = true;
            const activeLabel = make('label', undefined, 'ar-reminder-check'), active = make('input');
            active.type = 'checkbox'; active.checked = row.ativo === undefined || !!row.ativo;
            activeLabel.append(active, document.createTextNode('Lembrete ativo'));
            const emailLabel = make('label', undefined, 'ar-reminder-check'), email = make('input');
            email.type = 'checkbox'; email.checked = !!row.enviar_email && !!prefs.email_lembretes && !!prefs.email_confirmado;
            email.disabled = !prefs.email_lembretes || !prefs.email_confirmado;
            emailLabel.append(email, document.createTextNode('Enviar também por e-mail (opcional)'));
            const actions = make('div', undefined, 'ar-reminder-actions');
            actions.append(button('Cancelar', () => dialog.close()));
            const save = make('button', 'Salvar lembrete', 'ar-btn ar-btn--primary'); save.type = 'submit'; actions.append(save);
            form.append(activeLabel, emailLabel, feedback, actions); dialog.append(h, form); document.body.append(dialog);
            const previous = document.activeElement;
            dialog.addEventListener('close', () => { dialog.remove(); if (previous?.isConnected) previous.focus(); });
            form.onsubmit = async (e) => {
                e.preventDefault(); save.disabled = true;
                try {
                    const date = new Date(when.value);
                    if (!Number.isFinite(date.getTime())) throw new Error('Informe uma data válida.');
                    const roundtrip = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    if (roundtrip !== when.value) throw new Error('Esse horário não existe no fuso atual. Escolha outro horário.');
                    const body = {
                        titulo: title.value, descricao: description.value, tipo: row.tipo || 'prazo', id_tarefa: task.value ? Number(task.value) : null,
                        fuso_horario: zone, ativo: active.checked, enviar_email: email.checked
                    };
                    if (active.checked || !row.id_lembrete || date.getTime() > Date.now()) body.agendado_utc = date.toISOString();
                    await call(row.id_lembrete ? '/' + row.id_lembrete : '', row.id_lembrete ? 'PUT' : 'POST', body);
                    dialog.close(); await reload(); status.textContent = 'Lembrete salvo.';
                } catch (error) { (dialog.isConnected ? feedback : status).textContent = error.message; }
                finally { save.disabled = false; }
            };
            dialog.showModal(); title.focus();
        }
        try { await reload(); } catch (e) { status.textContent = e.message; }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window.Arcadia);
