(function(A){
    'use strict';
    const days=['','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const call=(path,method='GET',body)=>A.api.expect(A.api.request('/api/classes'+path,{method,body}));
    async function exceptions(subject,schedule,canManage){
        const dialog=node('dialog');dialog.className='ar-dialog ar-notice-editor';dialog.setAttribute('aria-labelledby','classExceptionsTitle');
        const title=node('h2','Exceções de aula');title.id='classExceptionsTitle';const list=node('div'),status=node('p');status.setAttribute('role','status');const close=node('button','Fechar');close.type='button';close.className='ar-btn';close.onclick=()=>dialog.close();dialog.append(title,list,status,close);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();let current=[];
        const endpoint='/'+subject+'/schedule/'+schedule.id_horario+'/exceptions';
        async function refresh(){try{current=await call(endpoint);if(!dialog.isConnected)return;list.replaceChildren(...current.map(row=>node('p',`${row.data.split('-').reverse().join('/')} · ${row.cancelada?'Aula cancelada':'Aula restabelecida'}${row.motivo?' · '+row.motivo:''}`)));status.textContent=current.length?'':'Nenhuma exceção registrada.';}catch(e){status.textContent=e.message;}}
        if(canManage){const form=node('form');form.className='ar-calendar-import-row';const dateLabel=node('label','Data da aula');dateLabel.className='ar-field';const date=node('input');date.type='date';date.required=true;date.min=schedule.vigencia_inicio;date.max=schedule.vigencia_fim;dateLabel.append(date);const reasonLabel=node('label','Motivo (opcional)');reasonLabel.className='ar-field';const reason=node('input');reason.maxLength=300;reasonLabel.append(reason);const label=node('label','Cancelar somente esta aula');const canceled=node('input');canceled.type='checkbox';canceled.checked=true;label.append(canceled);const save=node('button','Salvar exceção');save.type='submit';save.className='ar-btn';form.append(dateLabel,reasonLabel,label,save);form.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{const previous=current.find(row=>row.data===date.value);await call(endpoint,'PUT',{data:date.value,cancelada:canceled.checked,motivo:reason.value,versao:previous?.versao||0});await refresh();}catch(e){status.textContent=e.message;}finally{save.disabled=false;}};dialog.insertBefore(form,close);}
        await refresh();
    }
    const gridFilters = new WeakMap();
    function renderGrid(host, rows, caption = 'Horários semanais das aulas', options = {}) {
        const policy = A.campusTimetable;
        host.replaceChildren();
        if (!policy) {host.append(node('p','A grade de horários não carregou. Atualize a página.'));return;}
        const entries = rows.map(row => ({...row,
            day:row.dia_semana != null ? Number(row.dia_semana) : row.data ? (new Date(row.data).getUTCDay() || 7) : 0,
            start:policy.minutes(row.hora_inicio),end:policy.minutes(row.hora_fim)
        })).filter(row => row.day >= 1 && row.day <= 7 && Number.isFinite(row.start) && row.end > row.start);
        const shift = options.turno || (new Set(entries.map(row=>row.turno).filter(Boolean)).size===1 ? entries.find(row=>row.turno)?.turno : undefined);
        const keys = Object.keys(policy.shifts);
        let filter = gridFilters.get(host);
        if (!filter) { filter = { all: true, selected: new Set(keys) }; gridFilters.set(host, filter); }
        const controls = node('fieldset'); controls.className = 'ac-week-filters';
        controls.append(node('legend', 'Exibir turnos'));
        const fields = new Map();
        for (const [key, text] of [['all', 'Tudo'], ...keys.map(key => [key, policy.shifts[key].label])]) {
            const label = node('label'), input = node('input'); input.type = 'checkbox';
            input.checked = key === 'all' ? filter.all : filter.selected.has(key);
            label.append(input, node('span', text)); controls.append(label); fields.set(key, input);
            input.onchange = () => {
                if (key === 'all') filter.all = input.checked;
                else if (input.checked) filter.selected.add(key);
                else filter.selected.delete(key);
                update();
            };
        }
        const count = node('p'); count.className = 'ac-meta'; count.setAttribute('role', 'status');
        const content = node('div'); host.append(controls, count, content);
        function update() {
            for (const key of keys) fields.get(key).disabled = filter.all;
            const visible = filter.all ? keys : keys.filter(key => filter.selected.has(key));
            content.replaceChildren();
            if (!visible.length) {
                count.textContent = 'Nenhum turno selecionado. Marque um turno ou Tudo para exibir a grade.';
                return;
            }
            const frames = visible.flatMap(key => policy.slots(key));
            const shown = entries.filter(row => frames.some(frame => frame.tipo === 'aula' && row.start < frame.end && row.end > frame.start));
            count.textContent = shown.length + ' de ' + entries.length + ' horário(s) nesta visualização.';
            const weekdays=[...new Set([1,2,3,4,5,...entries.map(row=>row.day)])].sort((a,b)=>a-b);
            const warnings=entries.filter(row=>!policy.validate(row,shift));
            if(warnings.length){const warning=node('p','Há horários fora da grade de Belém. Eles foram preservados e precisam de revisão; confira as datas e horas originais nos detalhes.');warning.setAttribute('role','status');content.append(warning);}
            const region=node('div');region.className='ac-week-grid-scroll';region.tabIndex=0;
            region.setAttribute('role','region');region.setAttribute('aria-label',caption+'; role horizontalmente para consultar todos os dias');
            const table=node('table');table.className='ac-week-grid';table.append(node('caption',caption));
            const head=node('thead'),header=node('tr');const corner=node('th','Horário');corner.setAttribute('scope','col');header.append(corner);
            for(const day of weekdays){const cell=node('th',days[day]);cell.setAttribute('scope','col');header.append(cell);}
            head.append(header);table.append(head);let body=node('tbody');
            let previousShift;
            for(const frame of frames){
                if (visible.length > 1 && previousShift !== frame.turno) {
                    if (previousShift) { table.append(body); body = node('tbody'); }
                    const divider = node('tr'), label = node('th', policy.shifts[frame.turno].label);
                    label.setAttribute('scope', 'rowgroup'); label.setAttribute('colspan', String(weekdays.length + 1));
                    divider.className = 'ac-week-shift'; divider.append(label); body.append(divider);
                    previousShift = frame.turno;
                }
                const line=node('tr'),time=node('th',policy.label(frame.start)+'–'+policy.label(frame.end));time.setAttribute('scope','row');line.append(time);
                if(frame.tipo==='intervalo'){
                    const interval=node('td','Intervalo · 20 minutos');interval.setAttribute('colspan',String(weekdays.length));interval.className='ac-week-break';line.append(interval);
                }else for(const day of weekdays){
                    const cell=node('td'),matches=entries.filter(row=>row.day===day&&row.start<frame.end&&row.end>frame.start);
                    if(!matches.length){cell.className='ac-week-empty';cell.append(node('span','Sem aula'));}
                    for(const row of matches){
                        const block=node('div');block.className='ac-week-class'+(row.cancelada?' ac-cancelled':'');
                        block.append(node('strong',row.titulo || row.disciplina || row.nome || 'Aula'));
                        if(row.cancelada)block.append(node('span','Aula cancelada'));
                        if(row.professor)block.append(node('span',row.professor));
                        const room=policy.room(row);if(room.value)block.append(node('span','Sala: '+room.value+(room.source==='turma'?' · oficial da turma':'')));
                        if(!policy.validate(row,shift))block.append(node('span','Revisar: '+policy.label(row.start)+'–'+policy.label(row.end)));
                        cell.append(block);
                    }
                    line.append(cell);
                }
                body.append(line);
            }
            table.append(body);region.append(table);content.append(region);
        }
        update();
    }

    function mount(host, offering) {
        const subject = Number(offering.id_disciplina);
        const canManage = offering.canManage === true;
        const root = node('section');
        root.className = 'ac-schedule';
        root.setAttribute('aria-label', 'Horários da disciplina');
        host.replaceChildren(root);
        if (!Number.isSafeInteger(subject) || subject <= 0) {
            root.append(node('p', 'Selecione uma disciplina para consultar seus horários.'));
            return;
        }
        const toolbar = node('div'); toolbar.className = 'ac-schedule-toolbar';
        toolbar.append(node('h3', 'Horários de ' + (offering.nome || 'aula')));
        const help = node('details'); help.className = 'ac-schedule-help';
        const helpToggle = node('summary', '?'); helpToggle.setAttribute('aria-label', 'Ajuda sobre os horários');
        const hint = node('div'); hint.className = 'ac-schedule-help-content';
        hint.append(node('p', 'Fuso: Belém (America/Belem). A sala da aula é opcional; sem ela, a Agenda usa a sala oficial da turma.'),
            node('p', 'Seis aulas de 50 minutos por turno, com intervalo de 20 minutos após a terceira. Horários antigos fora da grade são preservados para revisão.'));
        help.append(helpToggle, hint); toolbar.append(help); root.append(toolbar);
        help.addEventListener('keydown', event => {
            if (event.key === 'Escape') { help.open = false; helpToggle.focus(); event.stopPropagation(); }
        });
        if (offering.regime_letivo === 'legado') {
            root.append(node('p', 'Esta oferta é de ' + offering.ano_letivo + ' e não tem semestre informado. Defina as datas reais de vigência; nenhum semestre será presumido.'));
        }
        const status = node('p');
        status.setAttribute('role', 'status');
        const list = node('div');
        list.className = 'ac-schedule-list';
        const retry = node('button', 'Tentar carregar novamente');
        retry.type = 'button';
        retry.className = 'ar-btn';
        retry.hidden = true;
        const grid = node('div');
        const actionsList = node('details');
        actionsList.className = 'ac-schedule-actions-list';
        actionsList.append(node('summary', canManage ? 'Lista e ações dos horários' : 'Detalhes dos horários'), list);
        root.append(status, retry, grid, actionsList);
        let generation = 0;
        let editing = null;
        let inputs, weekday, save, legend, cancel, nextDay, dialog, feedback, add, returnFocus;
        function showEditor(trigger) {
            returnFocus = trigger || document.activeElement;
            feedback.textContent = '';
            dialog.showModal(); weekday.focus();
        }

        function resetEditor() {
            editing = null;
            if (!inputs) return;
            for (const input of Object.values(inputs)) input.value = '';
            weekday.value = '';
            nextDay.checked = false;
            legend.textContent = 'Adicionar horário semanal';
            save.textContent = 'Adicionar horário';
            cancel.hidden = false;
        }

        function edit(row, trigger) {
            editing = row;
            weekday.value = String(row.dia_semana);
            for (const [key, input] of Object.entries(inputs)) input.value = row[key] || '';
            nextDay.checked = A.campusTimetable.minutes(row.hora_fim) >= 1440;
            if (nextDay.checked) inputs.hora_fim.value = A.campusTimetable.clock(A.campusTimetable.minutes(row.hora_fim) % 1440);
            legend.textContent = 'Editar horário semanal';
            save.textContent = 'Salvar alterações';
            cancel.hidden = false;
            showEditor(trigger);
        }

        async function refresh(successMessage = '') {
            const current = ++generation;
            status.textContent = 'Carregando horários…';
            list.setAttribute('aria-busy', 'true');
            retry.hidden = true;
            try {
                const rows = await call('/' + subject + '/schedule');
                if (!Array.isArray(rows)) throw new Error('O servidor não devolveu uma lista de horários válida.');
                if (current !== generation || !root.isConnected) return false;
                if (offering.showGrid !== false) renderGrid(grid, rows.map(row=>({...row,nome:offering.nome})), 'Horários de ' + (offering.nome || 'aula'), {turno:offering.turno});
                list.replaceChildren();
                for (const row of rows) {
                    const item = node('article');
                    item.className = 'ac-schedule-item';
                    const copy = node('div');
                    copy.append(node('h4', days[Number(row.dia_semana)] || 'Dia não informado'));
                    copy.append(node('p', A.campusTimetable.label(A.campusTimetable.minutes(row.hora_inicio)) + '–' + A.campusTimetable.label(A.campusTimetable.minutes(row.hora_fim))));
                    if(row.precisa_revisao)copy.append(node('p','Fora da grade atual de Belém. Revise este horário; nenhum dado foi movido.'));
                    copy.append(node('p', row.vigencia_inicio.split('-').reverse().join('/') + ' a ' + row.vigencia_fim.split('-').reverse().join('/')));
                    const room=A.campusTimetable.room(row);
                    if (room.value) copy.append(node('p', 'Sala: ' + room.value + (room.source==='turma'?' · oficial da turma':'')));
                    const actions = node('div');
                    actions.className = 'ac-actions';
                    if (canManage) {
                        const change = node('button', 'Editar horário');
                        change.type = 'button'; change.className = 'ar-btn';
                        change.onclick = () => edit(row, change);
                        const remove = node('button', 'Retirar horário');
                        remove.type = 'button'; remove.className = 'ar-btn ar-btn--quiet';
                        remove.onclick = async () => {
                            if (!await A.confirmAction({title:'Retirar horário semanal?',message:'A recorrência sairá da Agenda. O registro e as exceções serão preservados.',confirmLabel:'Retirar horário'})) return;
                            remove.disabled = true;
                            try {
                                await call('/' + subject + '/schedule/' + row.id_horario, 'DELETE', {versao:row.versao});
                                if (editing?.id_horario === row.id_horario) resetEditor();
                                await refresh('Horário retirado da oferta e da Agenda.');
                                offering.onChange?.();
                            } catch (error) { status.textContent = error.message; remove.disabled = false; }
                        };
                        actions.append(change, remove);
                    }
                    const changes = node('button', 'Exceções de aula');
                    changes.type = 'button'; changes.className = 'ar-btn ar-btn--quiet';
                    changes.onclick = () => exceptions(subject, row, canManage);
                    actions.append(changes);
                    item.append(copy, actions);
                    list.append(item);
                }
                status.textContent = successMessage || (rows.length ? rows.length + ' horário(s) cadastrado(s).' : 'Nenhum horário semanal cadastrado nesta oferta.');
                return true;
            } catch (error) {
                if (current !== generation || !root.isConnected) return false;
                status.textContent = (successMessage ? successMessage + ' Não foi possível atualizar a lista: ' : '') + error.message;
                retry.hidden = false;
                return false;
            } finally {
                if (current === generation) list.setAttribute('aria-busy', 'false');
            }
        }
        retry.onclick = () => refresh();

        if (canManage) {
            dialog = node('dialog'); dialog.className = 'ac-editor ac-schedule-editor';
            dialog.setAttribute('aria-labelledby', 'scheduleEditorTitle-' + subject);
            const form = node('form');
            form.className = 'ac-schedule-form';
            add = node('button', 'Adicionar horário'); add.type = 'button'; add.className = 'ar-btn ar-btn--primary';
            add.onclick = () => { resetEditor(); showEditor(add); };
            toolbar.append(add);
            dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
            dialog.addEventListener('cancel', event => { if (save.disabled) event.preventDefault(); });
            const fields = node('fieldset');
            fields.className = 'ac-schedule-fields';
            legend = node('legend', 'Adicionar horário semanal');
            legend.id = 'scheduleEditorTitle-' + subject;
            fields.append(legend);
            inputs = {};
            function field(key, label, type) {
                const wrap = node('label', label);
                const input = node('input');
                input.name = key;
                input.type = type;
                input.required = key !== 'sala';
                if (type === 'time') input.step = '60';
                if (key === 'sala') input.maxLength = 100;
                const year = Number(offering.ano_letivo);
                if (type === 'date' && Number.isInteger(year)) {
                    input.min = year + '-01-01';
                    input.max = (year + 1) + '-12-31';
                }
                inputs[key] = input;
                wrap.append(input); fields.append(wrap);
            }
            const label = node('label', 'Dia da semana');
            weekday = node('select'); weekday.name = 'dia_semana'; weekday.required = true;
            const placeholder = node('option', 'Selecione um dia'); placeholder.value = '';
            weekday.append(placeholder);
            days.slice(1).forEach((text,index) => {const option=node('option',text);option.value=String(index+1);weekday.append(option);});
            weekday.value = '';
            label.append(weekday); fields.append(label);
            field('hora_inicio','Início da aula','time');
            field('hora_fim','Fim da aula','time');
            const nextLabel=node('label','A aula termina no dia seguinte');nextDay=node('input');nextDay.type='checkbox';nextLabel.className='ac-schedule-next-day';nextLabel.append(nextDay);fields.append(nextLabel);
            field('vigencia_inicio','Primeiro dia de vigência','date');
            field('vigencia_fim','Último dia de vigência','date');
            field('sala','Sala desta aula (opcional)','text');
            const actions = node('div'); actions.className = 'ac-actions';
            save = node('button', 'Adicionar horário'); save.type = 'submit'; save.className = 'ar-btn ar-btn--primary';
            cancel = node('button', 'Cancelar'); cancel.type = 'button'; cancel.className = 'ar-btn'; cancel.hidden = true;
            cancel.onclick = () => dialog.close();
            actions.className += ' ac-schedule-editor-actions';
            actions.append(cancel,save);
            feedback = node('p'); feedback.className = 'ac-feedback'; feedback.setAttribute('role', 'status');
            const body = node('div'); body.className = 'ac-schedule-editor-body'; body.append(fields,feedback);
            form.append(body,actions);
            form.onsubmit = async event => {
                event.preventDefault();
                if (!form.checkValidity()) {form.reportValidity();return;}
                if (save.disabled) return;
                const record = editing;
                save.disabled = true;
                add.disabled = true;
                feedback.textContent = 'Salvando horário…';
                cancel.disabled = true;
                try {
                    const result = await call('/' + subject + '/schedule' + (record ? '/' + record.id_horario : ''),record ? 'PUT':'POST',{
                        dia_semana:Number(weekday.value),
                        ...Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value])),
                        fim_dia_seguinte: nextDay.checked===true,
                        hora_fim: nextDay.checked ? A.campusTimetable.clock(A.campusTimetable.minutes(inputs.hora_fim.value)+1440) : inputs.hora_fim.value,
                        ...(record ? {versao:record.versao}:{})
                    });
                    if (!Number.isSafeInteger(result?.id_horario) || result.id_horario <= 0) throw new Error('O servidor não confirmou a gravação do horário. Atualize a lista antes de tentar novamente.');
                    add.disabled = false;
                    dialog.close();
                    resetEditor();
                    await refresh(result.message || 'Horário salvo na oferta e na Agenda.');
                    offering.onChange?.();
                } catch (error) {feedback.textContent = error.message;}
                finally {save.disabled = false;cancel.disabled = false;add.disabled = false;}
            };
            dialog.append(form); root.append(dialog);
        }
        refresh();
        return root;
    }

    function open(subject, canManage) {
        const dialog=node('dialog');
        dialog.className='ar-dialog ar-notice-editor';
        const close=node('button','Fechar');close.type='button';close.className='ar-btn';close.onclick=()=>dialog.close();
        const host=node('div');dialog.append(host,close);document.body.append(dialog);
        dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
        mount(host,{id_disciplina:subject,canManage});
        return dialog;
    }

    function initAgenda(){const host=document.querySelector('[data-class-weekly-agenda]');if(!host)return;const session=A.auth.getSessao();if(!A.auth.estaLogado()||session.tipo_usuario==='externo'||(session.tipo_usuario==='servidor'&&!session.is_admin)){host.remove();return;}
        const label=node('label','Semana a partir de');label.className='ar-field';const date=node('input');date.type='date';date.required=true;date.value=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Belem'}).format(new Date());label.append(date);
        const button=node('button','Consultar horários');button.type='submit';button.className='ar-btn';const form=node('form');form.className='ac-week-toolbar';form.append(label,button);const status=node('p');status.setAttribute('role','status');const list=node('div');host.append(form,status,list);let generation=0;
        async function load(){if(!date.value)return;const current=++generation;const from=date.value,to=new Date(Date.parse(from)+6*86400000).toISOString().slice(0,10);button.disabled=true;status.textContent='Carregando horários…';try{const rows=await call('/schedule?from='+from+'&to='+to);if(current!==generation)return;renderGrid(list,rows,'Horários das aulas · '+from.split('-').reverse().join('/')+' a '+to.split('-').reverse().join('/'));status.textContent=rows.length?'Fuso: Belém. Horários cadastrados nas ofertas de Turmas.':'Nenhuma aula cadastrada para esta semana.';}catch(e){if(current===generation)status.textContent=e.message;}finally{if(current===generation)button.disabled=false;}}
        form.onsubmit=event=>{event.preventDefault();load();};host.addEventListener('toggle',()=>{if(host.open)load();});
    }
    A.classSchedule={open,mount,renderGrid};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAgenda);else initAgenda();
})(window.Arcadia);
