(function (A) {
    'use strict';
    async function init() {
        if(!A.auth.estaLogado()) return;
        const ownerKey = () => { const session = A.auth.getSessao(); return [A.auth.estaLogado(), session.tipo_usuario, session.id_usuario, session.id_externo].join(':'); };
        const owner = ownerKey();
        const external=A.auth.getSessao().tipo_usuario==='externo';
        let host=document.getElementById('taskReminders');
        if(!host && document.body.classList.contains('ar-calendar-page')) {
            host=document.createElement('details');host.className='ar-task-reminders';host.id='taskReminders';
            const summary=document.createElement('summary');summary.textContent='Meus lembretes e notificações';host.append(summary);
            (document.querySelector('.ar-main')||document.querySelector('.ar-app')).append(host);
        }
        if(!host) return;
        function reveal() {
            A.reminderUI?.setCalendarDay?.(null);
            host.open = true;
            const summary = host.querySelector('summary');
            if (summary) summary.focus({preventScroll:true});
            host.scrollIntoView({block:'start',behavior:'auto'});
        }
        window.addEventListener('hashchange', () => {if (location.hash === '#taskReminders') reveal();});
        if (location.hash === '#taskReminders') reveal();
        const base=external?'/api/external/reminders':'/api/reminders';
        const call = (path, method = 'GET', body) => A.api.expect(A.api.request(base + path, { method, body }));
        const make = (tag, text, cls) => {
            const n = document.createElement(tag);
            if (text !== undefined) n.textContent = text;
            if (cls) n.className = cls;
            return n;
        };
        const status = make('p'); status.setAttribute('role', 'status');
        const controls = make('div'), list = make('div', undefined, 'ar-task-reminders-list');
        host.append(controls, status, list);
        let prefs = {}, reminders = [], calendarDate = null;
        const dayHost = document.body?.classList?.contains('ar-calendar-page') ? document.getElementById('calendarDayReminders') : null;
        const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Belem';
        const index = () => owner === ownerKey() ? A.reminderTime?.calendarIndex(reminders, userZone) || new Map() : new Map();
        function paintLists() {
            list.replaceChildren();
            const daily = dayHost && calendarDate ? index().get(calendarDate) || [] : [];
            const selected = new Set(daily.map(row => row.id_lembrete));
            if (dayHost) {
                dayHost.replaceChildren(); dayHost.hidden = !calendarDate;
                if (calendarDate) {
                    dayHost.append(make('h3', 'Lembretes · ' + calendarDate.split('-').reverse().join('/')),
                        make('p', 'Datas no seu fuso: ' + userZone + '. O sino indica lembretes salvos; não confirma envio de e-mail.'));
                    dayHost.append(status);
                    const dayList = make('div', undefined, 'ar-task-reminders-list');
                    for (const row of daily) dayList.append(card(row));
                    if (!daily.length) dayList.append(make('p', 'Nenhum lembrete ativo para este dia.'));
                    dayHost.append(dayList);
                }
            }
            if (!dayHost || !calendarDate) host.append(status);
            const others = owner === ownerKey() ? reminders.filter(row => !selected.has(row.id_lembrete)) : [];
            if (!others.length) list.append(make('p', daily.length ? 'Os lembretes deste dia estão na seção Lembretes acima.' : 'Nenhum lembrete cadastrado.'));
            for (const row of others) list.append(card(row));
        }
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
        let loadGeneration = 0;
        async function reload() {
            if (owner !== ownerKey()) throw new Error('A conta mudou. Atualize a página para consultar seus lembretes.');
            const generation = ++loadGeneration;
            const [settings, items] = await Promise.all([call('/preferences'), call('')]);
            if (owner !== ownerKey()) throw new Error('A conta mudou. Atualize a página para consultar seus lembretes.');
            if (generation !== loadGeneration) return;
            prefs = settings;
            reminders = [...new Map(items.map(row => [row.id_lembrete, row])).values()];
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
                make('p', prefs.envio_mensagem || (prefs.envio_habilitado ? 'O envio depende do processamento periódico do servidor. Você pode desativar os avisos a qualquer momento.' : 'O envio por e-mail ainda não está disponível. Seus lembretes continuam salvos aqui.')),
                make('p',prefs.aviso_frequencia||'Os avisos são processados diariamente e podem atrasar.'),
                button('Criar lembrete', () => editor()));
            paintLists();
            if (window.dispatchEvent) window.dispatchEvent(new Event('arcadia:reminders-changed'));
        }
        function card(row) {
                const item = make('article');
                item.append(make('h3', row.titulo), make('p', time(row)), make('p', row.ativo ? 'Ativo' : 'Desativado'));
                if (row.tarefa) item.append(make('p', 'Tarefa: ' + row.tarefa));
                if (row.descricao) item.append(make('p', row.descricao));
                item.append(make('p', row.enviar_email && prefs.email_lembretes ? 'E-mail autorizado para este lembrete.' : 'Salvo no portal · e-mail desativado.'));
                const delivery = { enviado: 'E-mail enviado.', reservado: 'Envio reservado. Se houve interrupção, revise antes de reagendar.',
                    falhou: 'Não foi possível confirmar o envio. Não haverá nova tentativa automática.', cancelado: 'Envio cancelado. Revise o lembrete para reagendar.', aguardando: 'Aguardando nova tentativa antes do envio; no máximo três tentativas.', enviando: 'Envio iniciado. Não haverá repetição automática se o resultado for incerto.' };
                if (delivery[row.envio_estado]) item.append(make('p', delivery[row.envio_estado]));
                const actions = make('div', undefined, 'ar-reminder-actions');
                if(!row.indisponivel) actions.append(button('Editar', async () => {
                    await reload();
                    const current = reminders.find(item => item.id_lembrete === row.id_lembrete);
                    if (!current || current.indisponivel) throw new Error('Este lembrete não está mais disponível.');
                    await editor(current);
                }));
                actions.append(button('Excluir', async () => {
                    if (!(await A.confirmAction({ title: 'Excluir este lembrete?', message: 'O lembrete e o envio ainda não iniciado serão cancelados. Uma mensagem já entregue não pode ser recolhida.', items: [row.titulo], confirmLabel: 'Excluir lembrete' }))) return;
                    await call('/' + row.id_lembrete, 'DELETE'); await reload(); status.textContent = 'Lembrete excluído.';
                }));
                item.append(actions); return item;
        }
        async function editor(row = {}, binding = null) {
            const event=binding?.event || row.evento;
            const eventSource=binding?.source || row.contexto;
            const linked=Boolean(event) || Boolean(row.id_evento || row.id_evento_externo);
            const tasks = linked ? [] : await A.api.expect(A.api.get('/api/tasks'));
            const open=document.querySelector('.ar-reminder-editor[open]');
            if(open){open.querySelector('input,select,button')?.focus();return;}
            const dialog = make('dialog', undefined, 'ar-reminder-editor');
            const h = make('h2', row.id_lembrete ? 'Editar lembrete' : 'Criar lembrete'); h.id = 'reminderEditorTitle';
            dialog.setAttribute('aria-labelledby', h.id);
            const form = make('form'), feedback = make('p'); feedback.setAttribute('role', 'status');
            function field(label, type, value = '') {
                const wrap = make('label', label), input = make(type === 'textarea' || type === 'select' ? type : 'input');
                if (input.tagName === 'INPUT') input.type = type;
                input.value = value; wrap.append(input); form.append(wrap); return input;
            }
            if(event) form.append(make('p','Evento: '+event.titulo+' · '+String(event.data_evento||'').slice(0,10)+(event.hora_inicio?' · '+event.hora_inicio:'')));
            if(binding?.source==='avulso') form.append(make('p','Evento automático: este lembrete será avulso e não acompanha alterações de calendário.'));
            const title = field('Título', 'text', row.titulo || event?.titulo || ''); title.required = true; title.maxLength = 150;
            const description = field('Descrição (opcional)', 'textarea', row.descricao || ''); description.maxLength = 3000;
            const task = field('Tarefa (opcional)', 'select');
            const none = make('option', 'Sem tarefa'); none.value = ''; task.append(none);
            for (const item of tasks) {
                if (item.status === 'concluida' && Number(row.id_tarefa) !== Number(item.id_tarefa)) continue;
                const option = make('option', item.titulo + (item.status === 'concluida' ? ' · concluída' : '')); option.value = item.id_tarefa; task.append(option);
            }
            task.value = row.id_tarefa || '';
            task.parentElement.hidden=external || linked;
            const browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Fortaleza';
            const zone=field('Fuso horário','select');
            for(const name of [...new Set([row.fuso_horario||browserZone,'America/Belem','America/Fortaleza','America/Sao_Paulo','UTC',browserZone])]) {
                const option=make('option',name);option.value=name;zone.append(option);
            }
            zone.value=row.fuso_horario || (eventSource==='calendario'?'America/Belem':browserZone);
            const when=field('Quando deseja ser lembrado','datetime-local',A.reminderTime.fromUTC(row.agendado_utc||Date.now()+3600000,zone.value));when.required=true;
            if(event?.hora_inicio && /^\d{4}-\d\d-\d\d/.test(String(event.data_evento))) {
                const advance=field('Antecedência em relação ao evento','select');
                for(const [minutes,label] of [['custom','Escolher data e horário'],['2880','2 dias antes'],['1440','1 dia antes'],['60','1 hora antes'],['30','30 minutos antes']]) {
                    const option=make('option',label);option.value=minutes;advance.append(option);
                }
                const applyAdvance=()=>{
                    if(advance.value==='custom') return;
                    try {
                        const start=A.reminderTime.toUTC(String(event.data_evento).slice(0,10)+'T'+String(event.hora_inicio).slice(0,5),zone.value);
                        when.value=A.reminderTime.fromUTC(new Date(start).getTime()-Number(advance.value)*60000,zone.value);
                    } catch(error) { feedback.textContent=error.message; }
                };
                advance.onchange=applyAdvance;zone.onchange=applyAdvance;
                when.oninput=()=>{advance.value='custom';};
                if(!row.id_lembrete) { advance.value='2880';applyAdvance(); }
            } else if(event) form.append(make('p','Evento sem horário definido: escolha a data e o horário do lembrete.'));
            const activeLabel = make('label', undefined, 'ar-reminder-check'), active = make('input');
            active.type = 'checkbox'; active.checked = row.ativo === undefined || !!row.ativo;
            activeLabel.append(active, document.createTextNode('Lembrete ativo'));
            const emailLabel = make('label', undefined, 'ar-reminder-check'), email = make('input');
            email.type = 'checkbox'; email.checked = !!row.enviar_email && !!prefs.email_lembretes && !!prefs.email_confirmado;
            email.disabled = !prefs.email_confirmado;
            emailLabel.append(email, document.createTextNode('Receber este lembrete por e-mail (opcional)'));
            form.append(make('p',prefs.email_confirmado?'Destino: '+prefs.email:'Confirme o e-mail da sua conta para habilitar o envio.'));
            if(!prefs.email_lembretes) form.append(make('p','Ao selecionar e salvar, você autoriza notificações de lembretes para sua conta. Os demais avisos continuam dependendo da sua escolha individual.'));
            form.append(make('p',prefs.aviso_frequencia||'Envio diário; pode chegar depois do horário escolhido. Para eventos, prefira antecedência de 48 horas.'));
            const actions = make('div', undefined, 'ar-reminder-actions');
            actions.append(button('Cancelar', () => dialog.close()));
            const save = make('button', 'Salvar lembrete', 'ar-btn ar-btn--primary'); save.type = 'submit'; actions.append(save);
            form.append(activeLabel, emailLabel, feedback, actions); dialog.append(h, form); document.body.append(dialog);
            const previous = document.activeElement;
            dialog.addEventListener('close', () => { dialog.remove(); if (previous?.isConnected) previous.focus(); });
            form.onsubmit = async (e) => {
                e.preventDefault(); save.disabled = true;
                try {
                    const instant=A.reminderTime.toUTC(when.value,zone.value);
                    const date=new Date(instant);
                    if(email.checked && !prefs.email_lembretes) {
                        await call('/preferences','PUT',{email_lembretes:true});
                        prefs.email_lembretes=true;
                    }
                    const body = {
                        titulo: title.value, descricao: description.value, tipo: row.tipo || (event?'evento':'prazo'), id_tarefa: task.value ? Number(task.value) : null,
                        id_evento:row.id_evento || (eventSource==='calendario'?Number(event.id_evento):null),
                        id_evento_externo:row.id_evento_externo || (eventSource==='agenda_externa'?Number(event.id_evento):null),
                        fuso_horario: zone.value, ativo: active.checked, enviar_email: email.checked
                    };
                    if (active.checked || !row.id_lembrete || date.getTime() > Date.now()) body.agendado_utc = date.toISOString();
                    await call(row.id_lembrete ? '/' + row.id_lembrete : '', row.id_lembrete ? 'PUT' : 'POST', body);
                    dialog.close(); await reload(); status.textContent = 'Lembrete salvo.';
                } catch (error) { (dialog.isConnected ? feedback : status).textContent = error.message; }
                finally { save.disabled = false; }
            };
            (window.Arcadia.dialogShell ? window.Arcadia.dialogShell.open(dialog) : dialog.showModal()); title.focus();
        }
        A.reminderUI={reveal,
            calendarCounts:()=>new Map([...index()].map(([day,items])=>[day,items.length])),
            setCalendarDay:day=>{ calendarDate = /^\d{4}-\d\d-\d\d$/.test(day || '') ? day : null; paintLists(); },
            open:async(event,source)=>{
            try {
                await reload();
                if(event && source!=='avulso') event=await call('/event/'+source+'/'+encodeURIComponent(event.id_evento));
                await editor({},event?{event,source}:null);
            }catch(e){status.textContent=e.message;A.showToast?.(e.message);}
        }};
        const refresh = async () => { try { await reload(); } catch (e) {
            reminders = []; prefs = {}; controls.replaceChildren(); paintLists();
            if (window.dispatchEvent) window.dispatchEvent(new Event('arcadia:reminders-changed'));
            status.textContent = e.message;
        }};
        window.addEventListener('focus', refresh);
        window.addEventListener('storage', () => { if (owner !== ownerKey()) refresh(); });
        await refresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window.Arcadia);
