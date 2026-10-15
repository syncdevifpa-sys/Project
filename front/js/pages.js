// Telas do portal: os dados exibidos e as confirmações vêm da API.
(function (A) {
    'use strict';
    const api = A.api;
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const value = id => document.getElementById(id)?.value.trim() || '';
    const categories = { Enrollment: 'matricula', Calls: 'edital', Events: 'evento', Cancellations: 'cancelamento', Calendar: 'calendario', Holiday: 'feriado' };
    const audiences = { All: 'todos', Student: 'discente', Professor: 'docente', Staff: 'servidor', External: 'externo' };
    const tracks = { Research: 'pesquisa', Extension: 'extensao', Teaching: 'ensino', Innovation: 'inovacao' };
    const statuses = { Ready: 'pronto', 'In review': 'em_analise', Requested: 'solicitado', Pending: 'pendente' };
    const noticeStatuses = { Published: 'publicado', Draft: 'rascunho', Archived: 'arquivado' };
    const displayLabels = {
        matricula: 'Matrícula', edital: 'Edital', evento: 'Evento', cancelamento: 'Cancelamento', calendario: 'Calendário', feriado: 'Feriado',
        todos: 'Todos', discente: 'Aluno', docente: 'Professor', servidor: 'Servidor', externo: 'Público externo',
        pesquisa: 'Pesquisa', extensao: 'Extensão', ensino: 'Ensino', inovacao: 'Inovação',
        pronto: 'Pronto', em_analise: 'Em análise', solicitado: 'Solicitado', pendente: 'Pendente',
        publicado: 'Publicado', rascunho: 'Rascunho', arquivado: 'Arquivado'
    };
    const label = (map, v) => displayLabels[v] || v || '—';
    const date = v => v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—';
    const safeUrl = v => {
        try { const u = new URL(v, api.BASE); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; }
        catch { return ''; }
    };
    const error = e => A.showToast(e.message || 'Não foi possível conectar ao servidor.');
    const card = (title, description, meta, action = '') => `<article class="ar-card"><h3 class="ar-card-title">${esc(title)}</h3><p class="ar-card-desc">${esc(description)}</p><p class="ar-card-meta">${meta}</p>${action}</article>`;
    const editAction = (kind,row,id) => A.contentEditor?.canEdit(kind,row) ? `<button type="button" class="ar-btn ar-btn--secondary" data-edit-content="${esc(id)}">Editar</button>` : '';
    function editableGrid(target,kind,rows,reload){target.addEventListener('click',event=>{const button=event.target.closest('[data-edit-content]');if(button){const row=rows().find(row=>String(row[A.contentFields[kind].id])===button.dataset.editContent);if(row)A.contentEditor.open(kind,row,reload);}});}
    function linkDescriptions(selector){$$(selector).forEach(element=>A.noticeText.render(element,element.textContent));}

    function filterBar(selector, map, rows, field, render) {
        let filter = null;
        const chips = $$(selector + ' .ar-chip');
        chips.forEach(chip => {
            const text = chip.dataset.vinculo || chip.dataset.filterKey || chip.textContent.replace(/\(\d+\)/g, '').trim();
            const count = chip.querySelector('.ar-sup');
            if (count) count.textContent = '(0)';
            chip.addEventListener('click', () => {
                filter = text === 'All' ? null : map[text];
                chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
                render();
            });
        });
        return {
            visible: () => rows().filter(row => !filter || row[field] === filter),
            counts: () => chips.forEach(chip => {
                const text = chip.dataset.vinculo || chip.dataset.filterKey || chip.textContent.replace(/\(\d+\)/g, '').trim();
                const count = chip.querySelector('.ar-sup');
                if (count) count.textContent = '(' + rows().filter(r => text === 'All' || r[field] === map[text]).length + ')';
                const hero = $('.ar-hero-count');
                if (hero) hero.textContent = '(' + rows().length + ')';
                const nav = $('a[aria-current="page"] .ar-sup');
                if (nav) nav.textContent = '(' + rows().length + ')';
            })
        };
    }

    async function notices() {
        let rows = [];
        const grid = $('#noticesCardsGrid');
        const table = $('[data-view-panel="tabela"] tbody');
        const board = $('[data-view-panel="quadro"]');
        const canManage = Boolean(A.auth.getSessao().is_admin) || ['docente', 'servidor'].includes(A.auth.getSessao().tipo_usuario);
        $('#btnNewNotice').style.display = canManage ? '' : 'none';
        $('#btnDeleteSel').style.display = 'none';
        const bar = filterBar('#chipbarCategories', categories, () => rows, 'categoria', render);
        const filterDetails = $('#noticeFilterDetails');
        const filterMedia = window.matchMedia('(max-width: 600px)');
        function filterLayout() { filterDetails.open = !filterMedia.matches; }
        filterMedia.addEventListener('change', filterLayout); filterLayout();
        function visible() {
            const text = value('filterTextNotices').toLowerCase();
            const type = $('#filterNoticeType').value;
            const audience = $$('[data-filter-publico]:checked').map(c => audiences[c.dataset.filterPublico]);
            const status = $$('[data-filter-situacao]:checked').map(c => noticeStatuses[c.dataset.filterSituacao]);
            return bar.visible().filter(r => (!type || (r.tipo_publicacao||'aviso')===type) && (!text || `${r.titulo} ${r.resumo}`.toLowerCase().includes(text)) && A.noticeFilters.audienceMatches(r, audience) && status.includes(r.situacao));
        }
        function noticeCard(r) {
            const html = card(r.titulo, r.resumo, `${r.tipo_publicacao==='noticia'?'Notícia':'Aviso'} · ${esc(label(categories, r.categoria))} · ${esc(label(audiences, r.publico_alvo))} · ${date(r.data_publicacao)}`,
                `<a class="ar-link" href="notice.html?id=${encodeURIComponent(r.id_aviso)}">Abrir publicação</a>${A.noticeActions.canDelete(r) ? `<button type="button" class="ar-btn ar-btn--secondary btn-edit" data-id="${esc(r.id_aviso)}">Editar publicação</button><button type="button" class="ar-btn ar-btn--quiet btn-delete" data-id="${esc(r.id_aviso)}">Excluir publicação</button>` : ''}`);
            return A.noticeCover?.valid(r.capa) ? html.replace('class="ar-card"', 'class="ar-card ar-notice-with-cover"').replace('<h3', A.noticeCover.markup(r.capa)+'<h3') : html;
        }
        function render() {
            const all = $('[data-filter-publico="All"]').checked;
            const specific = $$('[data-filter-publico]:not([data-filter-publico="All"])');
            specific.forEach(input => { input.disabled = all; });
            $('#noticeAudienceHint').textContent = A.noticeFilters.audienceHint(all, specific.filter(input => input.checked).length);
            const selectedStatuses = $$('[data-filter-situacao]:checked');
            $('#noticeFilterSummary').textContent = `${all ? 'Todos os públicos' : specific.filter(input => input.checked).length + ' públicos'} · ${selectedStatuses.map(input=>label(noticeStatuses,noticeStatuses[input.dataset.filterSituacao])).join(', ')||'Nenhuma situação'} · ${$('#filterNoticeType').value==='noticia'?'Notícias':$('#filterNoticeType').value==='aviso'?'Avisos':'Avisos e notícias'}`;
            const list = visible();
            grid.innerHTML = list.map(noticeCard).join('') || '<p>Nenhum aviso encontrado.</p>';
            table.innerHTML = list.map(r => `<tr data-id="${esc(r.id_aviso)}"><td><input type="checkbox" class="row-select" aria-label="Selecionar aviso" ${A.noticeActions.canDelete(r) ? '' : 'disabled'}></td><td><a href="notice.html?id=${encodeURIComponent(r.id_aviso)}">${esc(r.titulo)}</a></td><td>${esc(label(categories, r.categoria))}</td><td>${esc(label(audiences, r.publico_alvo))}</td><td>${date(r.data_publicacao)}</td><td>${esc(label(noticeStatuses, r.situacao))}</td><td>${A.noticeActions.canDelete(r) ? `<button type="button" class="ar-btn ar-btn--sm btn-edit" data-id="${esc(r.id_aviso)}">Editar</button><button type="button" class="ar-btn ar-btn--sm btn-delete" data-id="${esc(r.id_aviso)}">Excluir</button>` : ''}</td></tr>`).join('');
            board.innerHTML = '<div class="ar-card-grid">' + list.map(noticeCard).join('') + '</div>';
            $$('#noticesCardsGrid .ar-card-desc, [data-view-panel="quadro"] .ar-card-desc').forEach(element => A.noticeText.render(element, element.textContent));
            $('#noticesSummary').textContent = `${list.length} ${list.length===1?'publicação':'publicações'}`;
            $('#btnDeleteSel').style.display = rows.some(r => A.noticeActions.canDelete(r)) ? '' : 'none';
            bar.counts();
            $$('[data-filter-publico], [data-filter-situacao]').forEach(input => {
                const count = input.closest('label').querySelector('.ar-check-count');
                if (count) count.textContent = input.dataset.filterPublico ? A.noticeFilters.audienceCount(rows, audiences[input.dataset.filterPublico]) : rows.filter(r => r.situacao === noticeStatuses[input.dataset.filterSituacao]).length;
            });
            $('#checkSelectAll').checked = false;
            selection();
        }
        async function reload() {
            rows = await api.expect(api.get('/api/notices'));
            render();
        }
        function selected() { return $$('.row-select:checked').map(c => c.closest('tr').dataset.id); }
        function selection() {
            const ids = selected();
            $('#selectionBar').style.display = ids.length ? 'block' : 'none';
            $('#selCountText').textContent = `${ids.length} selecionados`;
        }
        async function remove(ids) {
            try { await A.noticeActions.remove(rows.filter(r => ids.includes(String(r.id_aviso))), reload); }
            catch (e) { error(e); await reload(); }
        }
        function csv(ids) {
            const list = ids ? rows.filter(r => ids.includes(String(r.id_aviso))) : visible();
            const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
            const content = [['Título', 'Resumo', 'Categoria', 'Público', 'Situação'], ...list.map(r => [r.titulo, r.resumo, r.categoria, r.publico_alvo, r.situacao])].map(r => r.map(cell).join(',')).join('\r\n');
            const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }));
            const a = document.createElement('a'); a.href = url; a.download = 'avisos.csv'; a.click(); URL.revokeObjectURL(url);
        }
        $('#btnNewNotice').addEventListener('click', () => { if (A.auth.exigirLogin()) A.noticeEditor.open(null, reload); });
        $('#filterTextNotices').addEventListener('input', render);
        $('#filterNoticeType').addEventListener('change', render);
        $$('[data-filter-publico], [data-filter-situacao]').forEach(c => c.addEventListener('change', render));
        table.addEventListener('change', selection);
        [table, grid, board].forEach(panel => panel.addEventListener('click', e => { const edit = e.target.closest('.btn-edit'); if (edit) { const notice = rows.find(r => String(r.id_aviso) === edit.dataset.id); if (notice) A.noticeEditor.open(notice, reload); return; } const btn = e.target.closest('.btn-delete'); if (btn) remove([btn.dataset.id]).catch(error); }));
        $('#checkSelectAll').addEventListener('change', e => { $$('.row-select:not(:disabled)').forEach(c => { c.checked = e.target.checked; }); selection(); });
        $('#btnClearSel').addEventListener('click', () => { $$('.row-select').forEach(c => { c.checked = false; }); selection(); });
        $('#btnDeleteSel').addEventListener('click', () => remove(selected()).catch(error));
        $('#btnExportCsv').addEventListener('click', () => csv());
        $('#btnExportSel').addEventListener('click', () => csv(selected()));
        grid.innerHTML = '<p>Carregando avisos...</p>'; table.innerHTML = ''; board.innerHTML = '';
        await reload();
    }

    async function projects() {
        let rows = [];
        const grid = $('#gridProjetos');
        const bar = filterBar('#chipbarProjetos', tracks, () => rows, 'eixo', render);
        function render() {
            grid.innerHTML = bar.visible().map(r => card(r.titulo, r.descricao, `${esc(label(tracks, r.eixo))} · ${esc(r.responsavel_nome || '')} · ${esc(r.vagas)} vagas`,
                (A.auth.getSessao().tipo_usuario === 'discente' && r.aprovacao==='aprovado' ? `<button type="button" class="ar-btn ar-btn--secondary" data-register="${esc(r.id_projeto)}">Inscrever-se</button><button type="button" class="ar-btn ar-btn--ghost" data-cancel="${esc(r.id_projeto)}">Cancelar inscrição</button>` : '')+editAction('projects',r,r.id_projeto))).join('') || '<p>Nenhum projeto encontrado.</p>';
            linkDescriptions('#gridProjetos .ar-card-desc');
            bar.counts();
        }
        async function reload() { rows = await api.expect(api.get('/api/projects')); if(A.auth.getSessao().id_usuario){const mine=await api.expect(api.get('/api/projects/my'));rows=[...new Map([...rows,...mine].map(row=>[row.id_projeto,row])).values()];}render(); }
        $('#btnNovoProjeto')?.addEventListener('click',()=>{if(A.auth.exigirLogin())A.contentEditor.open('projects',null,reload);});
        editableGrid(grid,'projects',()=>rows,reload);
        grid.addEventListener('click', async e => {
            const button = e.target.closest('[data-register], [data-cancel]');
            if (!button) return;
            button.disabled = true;
            try {
                const id = button.dataset.register || button.dataset.cancel;
                await api.expect(button.dataset.register ? api.post(`/api/projects/${id}/register`) : api.del(`/api/projects/${id}/register`));
                A.showToast(button.dataset.register ? 'Inscrição realizada.' : 'Inscrição cancelada.');
            } catch (e) { error(e); }
            finally { button.disabled = false; }
        });
        grid.innerHTML = '<p>Carregando projetos...</p>';
        await reload();
    }

    async function calendar() {
        let rows = [];
        const container = $('.ar-panel-body');
        const canManage = Boolean(A.auth.getSessao().is_admin) || ['docente', 'servidor'].includes(A.auth.getSessao().tipo_usuario);
        $('#btnNewEvent').style.display = canManage ? '' : 'none';
        $('#btnImportCalendar').style.display = canManage ? '' : 'none';
        $('#btnImportCalendar').addEventListener('click',()=>A.calendarImport.open(reload));
        const canDelete=Boolean(A.calendarActions?.canDelete()),selectedEvents=new Set();
        let deleting=false;
        if(canDelete){
            const controls=document.createElement('div');controls.className='ar-profile-actions';
            for(const [text,action] of [['Marcar todos visíveis',()=>{for(const row of bar.visible())selectedEvents.add(String(row.id_evento));syncSelection();}],['Desmarcar todos',()=>{selectedEvents.clear();syncSelection();}],['Apagar selecionados',()=>removeEvents([...selectedEvents])]]){
                const button=document.createElement('button');button.type='button';button.className='ar-btn ar-btn--quiet ar-btn--sm';button.textContent=text;button.addEventListener('click',()=>{if(!deleting)action();});controls.append(button);
            }
            $('.ar-panel-head').append(controls);
            container.addEventListener('change',event=>{const id=event.target.dataset.calendarSelect;if(id){if(event.target.checked)selectedEvents.add(id);else selectedEvents.delete(id);}});
            container.addEventListener('click',event=>{const button=event.target.closest('[data-calendar-delete]');if(button)removeEvents([button.dataset.calendarDelete]);});
        }
        function syncSelection(){container.querySelectorAll('[data-calendar-select]').forEach(input=>{input.checked=selectedEvents.has(input.dataset.calendarSelect);});}
        async function removeEvents(ids){
            if(deleting)return;deleting=true;
            try{await A.calendarActions.remove(rows.filter(row=>ids.includes(String(row.id_evento))),reload);}catch(failure){error(failure);}finally{deleting=false;}
        }
        const sourcePicker=$('#calendarSourceFilter');
        const scoped=()=>rows.filter(row=>!sourcePicker.value||(row.periodo_letivo||'__avulsos__')===sourcePicker.value);
        const bar = filterBar('.ar-chipbar', categories, scoped, 'categoria', render);
        sourcePicker.addEventListener('change',render);
        $('.ar-panel-label').textContent = 'Calendário acadêmico';
        function render() {
            selectedEvents.clear();
            container.innerHTML = bar.visible().map(r => {
                const iso=String(r.data_evento||'').slice(0,10),month=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][Number(iso.slice(5,7))-1]||'—';
                const dates=date(r.data_evento)+(r.data_fim?' a '+date(r.data_fim):'')+(r.hora_inicio?' · '+String(r.hora_inicio).slice(0,5):'')+(r.hora_fim?'–'+String(r.hora_fim).slice(0,5):'');
                const description=esc(r.descricao||'')+' '+esc(r.local||'');
                const details=(r.descricao||'').includes('PDF SHA-256:')?'<details><summary>Descrição e fonte</summary><div class="ar-row-meta">'+description+'</div></details>':'<div class="ar-row-meta">'+description+'</div>';
                return '<div class="ar-row">'+(canDelete?'<input type="checkbox" data-calendar-select="'+esc(r.id_evento)+'" aria-label="Selecionar '+esc(r.titulo)+'">':'')+'<span class="ar-row-date" aria-label="'+esc(date(r.data_evento))+'"><b>'+esc(iso.slice(8,10))+'</b><small>'+month+'</small></span><span class="ar-row-main"><div class="ar-row-title">'+esc(r.titulo)+'</div><div class="ar-row-meta">'+esc(dates)+' · '+esc(r.periodo_letivo||'Evento avulso')+'</div>'+details+'</span><span class="ar-badge">'+esc(label(categories,r.categoria))+'</span>'+editAction('calendar',r,r.id_evento)+(canDelete?'<button type="button" class="ar-btn ar-btn--quiet ar-btn--sm" data-calendar-delete="'+esc(r.id_evento)+'">Apagar</button>':'')+'</div>';
            }).join('') || '<p>Nenhum evento encontrado.</p>';
            linkDescriptions('.ar-panel-body .ar-row-meta');
            bar.counts();
        }
        async function reload() {
            rows=await api.expect(api.get('/api/calendar'));const selected=sourcePicker.value;sourcePicker.replaceChildren();
            const all=document.createElement('option');all.value='';all.textContent='Todos os calendários';sourcePicker.append(all);
            const groups=[...new Set(rows.map(row=>row.periodo_letivo||'__avulsos__'))];for(const group of groups){const option=document.createElement('option');option.value=group;option.textContent=group==='__avulsos__'?'Eventos avulsos':group;sourcePicker.append(option);}sourcePicker.value=groups.includes(selected)?selected:'';render();
        }
        $('#btnNewEvent').addEventListener('click',()=>{if(A.auth.exigirLogin())A.contentEditor.open('calendar',null,reload);});
        editableGrid(container,'calendar',()=>rows,reload);
        container.innerHTML = '<p>Carregando calendário...</p>';
        await reload();
    }

    async function documents() {
        if (!A.auth.exigirLogin()) return;
        let rows = [];
        const grid = $('.ar-card-grid');
        const bar = filterBar('.ar-chipbar', statuses, () => rows, 'status', render);
        function render() {
            grid.innerHTML = bar.visible().map(r => {
                const url = r.status === 'pronto' && r.arquivo ? safeUrl(r.arquivo) : '';
                const action = url ? `<a class="ar-link" href="${esc(url)}" target="_blank" rel="noopener">Baixar documento</a>` : r.status === 'solicitado' ? `<button class="ar-btn ar-btn--ghost" type="button" data-cancel="${esc(r.id_documento)}">Cancelar solicitação</button>` : '';
                return card(r.titulo, r.descricao || r.motivo, `${esc(r.protocolo || '')} · ${esc(label(statuses, r.status))}`, action+editAction('documents',r,r.id_documento));
            }).join('') || '<p>Nenhuma solicitação encontrada.</p>';
            linkDescriptions('.ar-card-grid .ar-card-desc');
            bar.counts();
        }
        async function reload() { rows = await api.expect(api.get('/api/documents/my')); render(); }
        $('#btnNovoDoc').addEventListener('click',()=>{if(A.auth.exigirLogin())A.contentEditor.open('documents',null,reload);});
        editableGrid(grid,'documents',()=>rows,reload);
        grid.addEventListener('click', async e => {
            const button = e.target.closest('[data-cancel]');
            if (!button) return;
            button.disabled = true;
            try { await api.expect(api.del('/api/documents/' + button.dataset.cancel)); await reload(); A.showToast('Solicitação cancelada.'); }
            catch (e) { error(e); button.disabled = false; }
        });
        grid.innerHTML = '<p>Carregando solicitações...</p>';
        await reload();
    }

    async function people() {
        let rows = [];
        const grid = $('#gridPessoas');
        const bar = filterBar('#chipbarPessoas', audiences, () => rows, 'tipo_usuario', render);
        function render() {
            const people = bar.visible();
            grid.replaceChildren(...people.map(r => A.personCard(r, label(audiences, r.tipo_usuario))));
            if (!people.length) grid.textContent = 'Nenhuma pessoa encontrada.';
            bar.counts();
        }
        grid.innerHTML = '<p>Carregando pessoas...</p>';
        rows = await api.expect(api.get('/api/users'));
        render();
    }

    async function noticeDetail() {
        const id = new URLSearchParams(location.search).get('id');
        const title = $('.ar-detail-title');
        const desc = $('.ar-detail-desc');
        const info = $('.ar-info');
        const body = $('.body');
        const actions = $('.ar-detail-actions');
        actions.innerHTML = '';
        $('.ar-steps')?.remove();
        $$('.ar-h2').slice(1).forEach(el => el.parentElement.remove());
        title.textContent = 'Carregando aviso...'; desc.textContent = ''; body.textContent = ''; info.innerHTML = '';
        if (!id) { title.textContent = 'Selecione um aviso no mural.'; return; }
        const r = await api.expect(api.get('/api/notices/' + encodeURIComponent(id)));
        if (A.noticeActions.canDelete(r)) {
            const edit = document.createElement('button');
            edit.type = 'button'; edit.className = 'ar-btn ar-btn--secondary'; edit.textContent = 'Editar publicação';
            edit.addEventListener('click', () => A.noticeEditor.open(r, noticeDetail)); actions.append(edit);
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'ar-btn ar-btn--secondary'; button.textContent = 'Excluir publicação';
            button.addEventListener('click', async () => {
                button.disabled = true;
                try { await A.noticeActions.remove([r], () => { location.href = 'notices.html'; }); }
                catch (e) { error(e); }
                finally { button.disabled = false; }
            });
            actions.append(button);
        }
        const detail = title.closest('.ar-detail');
        detail?.querySelector('.ar-notice-cover')?.remove();
        if (detail && A.noticeCover?.valid(r.capa)) detail.insertAdjacentHTML('afterbegin', A.noticeCover.markup(r.capa));
        title.textContent = r.titulo;
        document.title = r.titulo;
        A.noticeText.render(desc, r.resumo);
        A.noticeText.render(body, r.descricao || r.resumo || '');
        body.style.whiteSpace = 'pre-wrap';
        $('.ar-detail-eyebrow').innerHTML = `<span class="ar-tag">${esc(r.referencia || label(categories, r.categoria))}</span><span class="ar-tag">${esc(label(audiences, r.publico_alvo))}</span>`;
        $('.ar-detail-status').textContent = `${r.tipo_publicacao==='noticia'?'Notícia':'Aviso'} · ${label(noticeStatuses, r.situacao)}`;
        info.innerHTML = `<div class="ar-info-item">Publicado: ${date(r.data_publicacao)}</div><div class="ar-info-item">Prazo: ${date(r.data_prazo)}</div><div class="ar-info-item">Vagas: ${esc(r.vagas ?? '—')}</div>`;
        const crumb = $('.ar-crumbs [aria-current="page"]');
        if (crumb) crumb.textContent = r.titulo;
        if (A.auth.estaLogado()) {
            await api.expect(api.post('/api/read-notices/' + encodeURIComponent(id)));
        }
    }

    async function dashboard() {
        if (!A.auth.exigirLogin()) return;
        const stats = $$('.ar-stat-value');
        const captions = $$('.ar-stat-cap');
        stats.forEach(el => { el.textContent = '—'; });
        captions.forEach(el => { el.textContent = ''; });
        const panels = $$('.ar-panel-body');
        panels.forEach(el => { el.innerHTML = '<p>Carregando...</p>'; });
        const requests = ['/api/read-notices/unread/count', '/api/tasks', '/api/documents/my', '/api/calendar', '/api/notices'];
        const results = await Promise.allSettled(requests.map(path => api.expect(api.get(path))));
        results.forEach((r, i) => { if (r.status === 'rejected') error(r.reason); });
        if (results[0].status === 'fulfilled') stats[0].textContent = results[0].value.unread;
        if (results[1].status === 'fulfilled') stats[1].textContent = results[1].value.filter(r => r.status !== 'concluida').length;
        if (results[2].status === 'fulfilled') stats[2].textContent = results[2].value.filter(r => r.status !== 'pronto').length;
        const row = (r, href, when) => `<a class="ar-row ar-row--nav ar-dashboard-row" href="${href}"><span class="ar-row-main"><div class="ar-row-title">${esc(r.titulo)}</div><div class="ar-row-meta">${esc(r.resumo || r.descricao || '')}</div></span><span class="ar-row-trail">${date(when)}</span></a>`;
        panels[0].innerHTML = results[3].status === 'fulfilled' ? results[3].value.filter(r => String(r.data_evento).slice(0, 10) >= new Date().toLocaleDateString('sv-SE')).slice(0, 5).map(r => row(r, 'calendar.html', r.data_evento)).join('') || '<p>Nenhuma data próxima.</p>' : '<p>Não foi possível carregar o calendário.</p>';
        panels[1].innerHTML = results[4].status === 'fulfilled' ? results[4].value.slice(0, 5).map(r => row(r, 'notice.html?id=' + encodeURIComponent(r.id_aviso), r.data_publicacao)).join('') || '<p>Nenhum aviso publicado.</p>' : '<p>Não foi possível carregar os avisos.</p>';
    }

    document.addEventListener('DOMContentLoaded', () => {
        const page = location.pathname.split('/').pop();
        const handler = { 'notices.html': notices, 'projects.html': projects, 'calendar.html': calendar, 'documents.html': documents, 'people.html': people, 'notice.html': noticeDetail, 'dashboard.html': dashboard }[page];
        if (handler) handler().catch(e => {
            error(e);
            const target = $('#noticesCardsGrid') || $('#gridProjetos') || $('.ar-card-grid') || $('.ar-panel-body') || $('.ar-detail-title');
            if (target) target.innerHTML = '<p>Não foi possível carregar os dados. Recarregue a página para tentar novamente.</p>';
        });
    });
})(window.Arcadia);
