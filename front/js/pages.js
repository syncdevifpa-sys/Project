// Telas do portal: os dados exibidos e as confirmações vêm da API.
(function (A) {
    'use strict';
    const api = A.api;
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const value = id => document.getElementById(id)?.value.trim() || '';
    const categories = { Enrollment: 'matricula', Calls: 'edital', Events: 'evento', Cancellations: 'cancelamento', Calendar: 'calendario', Holiday: 'feriado' };
    const audiences = { All: 'todos', Student: 'discente', Professor: 'docente', Staff: 'servidor' };
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

    function form(formId, buttonId, modalId, payload, base, reload) {
        const element = document.getElementById(formId);
        const modal = document.getElementById(modalId);
        document.getElementById(buttonId)?.addEventListener('click', () => {
            if (A.auth.exigirLogin()) A.openDialog(modal);
        });
        element?.addEventListener('submit', async e => {
            e.preventDefault();
            const button = element.querySelector('[type="submit"]');
            button.disabled = true;
            try {
                const result = await api.expect(api.post(base, payload()));
                A.closeDialog(modal);
                element.reset();
                A.showToast(result.protocol ? `Solicitação registrada: ${result.protocol}` : 'Registro salvo com sucesso.');
                await reload();
            } catch (e) { error(e); }
            finally { button.disabled = false; }
        });
    }

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
        const canManage = ['docente', 'servidor'].includes(A.auth.getSessao().tipo_usuario);
        $('#btnNewNotice').style.display = canManage ? '' : 'none';
        $('#btnDeleteSel').style.display = canManage ? '' : 'none';
        const bar = filterBar('#chipbarCategories', categories, () => rows, 'categoria', render);
        function visible() {
            const text = value('filterTextNotices').toLowerCase();
            const audience = $$('[data-filter-publico]:checked').map(c => audiences[c.dataset.filterPublico]);
            const status = $$('[data-filter-situacao]:checked').map(c => noticeStatuses[c.dataset.filterSituacao]);
            return bar.visible().filter(r => (!text || `${r.titulo} ${r.resumo}`.toLowerCase().includes(text)) && audience.includes(r.publico_alvo) && status.includes(r.situacao));
        }
        function noticeCard(r) {
            return card(r.titulo, r.resumo, `${esc(label(categories, r.categoria))} · ${esc(label(audiences, r.publico_alvo))} · ${date(r.data_publicacao)}`,
                `<a class="ar-link" href="aviso.html?id=${encodeURIComponent(r.id_aviso)}">Abrir aviso</a>`);
        }
        function render() {
            const list = visible();
            grid.innerHTML = list.map(noticeCard).join('') || '<p>Nenhum aviso encontrado.</p>';
            table.innerHTML = list.map(r => `<tr data-id="${esc(r.id_aviso)}"><td><input type="checkbox" class="row-select" aria-label="Selecionar aviso"></td><td><a href="aviso.html?id=${encodeURIComponent(r.id_aviso)}">${esc(r.titulo)}</a></td><td>${esc(label(categories, r.categoria))}</td><td>${esc(label(audiences, r.publico_alvo))}</td><td>${date(r.data_publicacao)}</td><td>${esc(label(noticeStatuses, r.situacao))}</td><td>${canManage ? `<button type="button" class="ar-btn ar-btn--sm btn-delete" data-id="${esc(r.id_aviso)}">Excluir</button>` : ''}</td></tr>`).join('');
            board.innerHTML = '<div class="ar-card-grid">' + list.map(noticeCard).join('') + '</div>';
            $('#noticesSummary').textContent = `${list.length} avisos`;
            bar.counts();
            $$('[data-filter-publico], [data-filter-situacao]').forEach(input => {
                const count = input.closest('label').querySelector('.ar-check-count');
                if (count) count.textContent = rows.filter(r => input.dataset.filterPublico ? r.publico_alvo === audiences[input.dataset.filterPublico] : r.situacao === noticeStatuses[input.dataset.filterSituacao]).length;
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
            try {
                for (const id of ids) await api.expect(api.del('/api/notices/' + encodeURIComponent(id)));
                A.showToast('Avisos excluídos.');
            } catch (e) { error(e); }
            await reload();
        }
        function csv(ids) {
            const list = ids ? rows.filter(r => ids.includes(String(r.id_aviso))) : visible();
            const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
            const content = [['Título', 'Resumo', 'Categoria', 'Público', 'Situação'], ...list.map(r => [r.titulo, r.resumo, r.categoria, r.publico_alvo, r.situacao])].map(r => r.map(cell).join(',')).join('\r\n');
            const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }));
            const a = document.createElement('a'); a.href = url; a.download = 'avisos.csv'; a.click(); URL.revokeObjectURL(url);
        }
        form('formNewNotice', 'btnNewNotice', 'modalNewNotice', () => ({
            titulo: value('noticeTitle'), resumo: value('noticeSummary'),
            categoria: categories[$('#choiceCategory [aria-pressed="true"]')?.dataset.val] || 'matricula',
            publico_alvo: audiences[$('#choiceAudience [aria-pressed="true"]')?.dataset.val] || 'todos',
            urgente: $('#noticeUrgent').checked, fixado: $('#noticePinned').checked
        }), '/api/notices', reload);
        $$('#choiceCategory .ar-chip, #choiceAudience .ar-chip').forEach(c => c.addEventListener('click', () => {
            c.parentElement.querySelectorAll('.ar-chip').forEach(other => other.setAttribute('aria-pressed', String(other === c)));
        }));
        $('#filterTextNotices').addEventListener('input', render);
        $$('[data-filter-publico], [data-filter-situacao]').forEach(c => c.addEventListener('change', render));
        table.addEventListener('change', selection);
        table.addEventListener('click', e => { const btn = e.target.closest('.btn-delete'); if (btn) remove([btn.dataset.id]).catch(error); });
        $('#checkSelectAll').addEventListener('change', e => { $$('.row-select').forEach(c => { c.checked = e.target.checked; }); selection(); });
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
                A.auth.getSessao().tipo_usuario === 'discente' ? `<button type="button" class="ar-btn ar-btn--secondary" data-register="${esc(r.id_projeto)}">Inscrever-se</button><button type="button" class="ar-btn ar-btn--ghost" data-cancel="${esc(r.id_projeto)}">Cancelar inscrição</button>` : '')).join('') || '<p>Nenhum projeto aprovado encontrado.</p>';
            bar.counts();
        }
        async function reload() { rows = await api.expect(api.get('/api/projects')); render(); }
        form('formNovoProjeto', 'btnNovoProjeto', 'modalNovoProjeto', () => ({ titulo: value('projetoTitulo'), descricao: value('projetoResumo'), eixo: value('projetoEixo') }), '/api/projects', reload);
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
        const canManage = ['docente', 'servidor'].includes(A.auth.getSessao().tipo_usuario);
        $('#btnNewEvent').style.display = canManage ? '' : 'none';
        const bar = filterBar('.ar-chipbar', categories, () => rows, 'categoria', render);
        $('.ar-panel-label').textContent = 'Calendário acadêmico';
        function render() {
            container.innerHTML = bar.visible().map(r => `<div class="ar-row"><span class="ar-row-date">${date(r.data_evento)}</span><span class="ar-row-main"><div class="ar-row-title">${esc(r.titulo)}</div><div class="ar-row-meta">${esc(r.descricao || '')} ${esc(r.local || '')}</div></span><span class="ar-badge">${esc(label(categories, r.categoria))}</span></div>`).join('') || '<p>Nenhum evento encontrado.</p>';
            bar.counts();
        }
        async function reload() { rows = await api.expect(api.get('/api/calendar')); render(); }
        form('formNewEvent', 'btnNewEvent', 'modalNewEvent', () => ({ titulo: value('eventTitle'), data_evento: value('eventDate'), descricao: value('eventDesc') }), '/api/calendar', reload);
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
                return card(r.titulo, r.descricao || r.motivo, `${esc(r.protocolo || '')} · ${esc(label(statuses, r.status))}`, action);
            }).join('') || '<p>Nenhuma solicitação encontrada.</p>';
            bar.counts();
        }
        async function reload() { rows = await api.expect(api.get('/api/documents/my')); render(); }
        form('formNovoDoc', 'btnNovoDoc', 'modalNovoDoc', () => ({ titulo: value('docTitulo'), motivo: value('docDescricao'), descricao: value('docDescricao') }), '/api/documents', reload);
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
            grid.innerHTML = bar.visible().map(r => card(r.nome_social || r.nome, r.sobre || r.setor || '', esc(label(audiences, r.tipo_usuario)))).join('') || '<p>Nenhuma pessoa encontrada.</p>';
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
        $('.ar-steps').remove();
        $$('.ar-h2').slice(1).forEach(el => el.parentElement.remove());
        title.textContent = 'Carregando aviso...'; desc.textContent = ''; body.textContent = ''; info.innerHTML = '';
        if (!id) { title.textContent = 'Selecione um aviso no mural.'; return; }
        const r = await api.expect(api.get('/api/notices/' + encodeURIComponent(id)));
        title.textContent = r.titulo;
        document.title = r.titulo;
        desc.textContent = r.resumo;
        body.textContent = r.descricao || r.resumo || '';
        body.style.whiteSpace = 'pre-wrap';
        $('.ar-detail-eyebrow').innerHTML = `<span class="ar-tag">${esc(r.referencia || label(categories, r.categoria))}</span><span class="ar-tag">${esc(label(audiences, r.publico_alvo))}</span>`;
        $('.ar-detail-status').textContent = label(noticeStatuses, r.situacao);
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
        const row = (r, href, when) => `<a class="ar-row ar-row--nav" href="${href}"><span class="ar-row-main"><div class="ar-row-title">${esc(r.titulo)}</div><div class="ar-row-meta">${esc(r.resumo || r.descricao || '')}</div></span><span class="ar-row-trail">${date(when)}</span></a>`;
        panels[0].innerHTML = results[3].status === 'fulfilled' ? results[3].value.filter(r => String(r.data_evento).slice(0, 10) >= new Date().toLocaleDateString('sv-SE')).slice(0, 5).map(r => row(r, 'calendario.html', r.data_evento)).join('') || '<p>Nenhuma data próxima.</p>' : '<p>Não foi possível carregar o calendário.</p>';
        panels[1].innerHTML = results[4].status === 'fulfilled' ? results[4].value.slice(0, 5).map(r => row(r, 'aviso.html?id=' + encodeURIComponent(r.id_aviso), r.data_publicacao)).join('') || '<p>Nenhum aviso publicado.</p>' : '<p>Não foi possível carregar os avisos.</p>';
    }

    document.addEventListener('DOMContentLoaded', () => {
        const page = location.pathname.split('/').pop();
        const handler = { 'avisos.html': notices, 'projetos.html': projects, 'calendario.html': calendar, 'documentos.html': documents, 'pessoas.html': people, 'aviso.html': noticeDetail, 'inicio.html': dashboard }[page];
        if (handler) handler().catch(e => {
            error(e);
            const target = $('#noticesCardsGrid') || $('#gridProjetos') || $('.ar-card-grid') || $('.ar-panel-body');
            if (target) target.innerHTML = '<p>Não foi possível carregar os dados. Recarregue a página para tentar novamente.</p>';
        });
    });
})(window.Arcadia);
