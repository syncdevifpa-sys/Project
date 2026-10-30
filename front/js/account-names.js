(function (A) {
    'use strict';
    async function start() {
        const session = A.auth?.getSessao();
        if (!session?.logado || !A.token.get()) return;
        const token = A.token.get();
        const valid = () => A.token.get() === token;
        const make = (tag, text) => {
            const n = document.createElement(tag);
            if (text) n.textContent = text;
            return n;
        };
        const call = (url, method = 'GET', body) =>
            A.api.expect(A.api.request(url, { method, body }));
        const external = session.tipo_usuario === 'externo';
        const endpoint = external ? '/api/external/nomes' : '/api/auth/nomes';
        const fullInput = document.getElementById('campoNome');
        if (fullInput) {
            fullInput.readOnly = true;
            fullInput.setAttribute('aria-describedby', 'nameChangeHelp');
        }
        if (/settings\.html$/.test(location.pathname)) {
            const host =
                document.getElementById('profileSharing') || document.querySelector('main');
            if (!host) return;
            const section = make('section');
            section.className = 'ar-card ar-account-names';
            section.append(make('h2', 'Como seu nome aparece'));
            const help = make(
                'p',
                'O nome de exibição é opcional e aparece junto do nome completo em Pessoas. O nome completo só muda após análise administrativa. Não informe documentos ou senhas.'
            );
            help.id = 'nameChangeHelp';
            section.append(help);
            const status = make('p', 'Carregando…');
            status.setAttribute('role', 'status');
            const fieldset = make('fieldset');
            fieldset.disabled = true;
            const form = make('form'),
                label = make('label', 'Nome de exibição (opcional)'),
                display = make('input');
            label.className = 'ar-field';
            display.maxLength = 100;
            display.autocomplete = 'nickname';
            label.append(display);
            const save = make('button', 'Salvar nome de exibição');
            save.type = 'submit';
            save.className = 'ar-btn';
            fieldset.append(label);
            fieldset.append(save);
            form.append(fieldset);
            const requestForm = make('form'),
                requestFields = make('fieldset'),
                newLabel = make('label', 'Novo nome completo'),
                newName = make('input');
            newLabel.className = 'ar-field';
            newName.required = true;
            newName.maxLength = 100;
            newName.autocomplete = 'name';
            newLabel.append(newName);
            const send = make('button', 'Solicitar alteração do nome completo');
            send.type = 'submit';
            send.className = 'ar-btn';
            requestFields.disabled = true;
            requestFields.append(newLabel, send);
            requestForm.append(requestFields);
            const history = make('p');
            section.append(form, requestForm, history, status);
            host.after(section);
            async function load() {
                const result = await call(endpoint);
                if (!valid()) return;
                display.value = result.nome_exibicao;
                fieldset.disabled = !result.disponivel;
                requestFields.disabled = !result.disponivel || result.pedido?.estado === 'pendente';
                history.textContent = result.pedido
                    ? `Última solicitação: ${result.pedido.nome_solicitado} · ${{ pendente: 'Em análise', aprovado: 'Aprovada', recusado: 'Recusada' }[result.pedido.estado]}${result.pedido.motivo ? ' · ' + result.pedido.motivo : ''}`
                    : '';
                status.textContent = result.disponivel
                    ? ''
                    : 'A administração precisa habilitar account-names.sql. Seu nome atual foi preservado.';
                if (fullInput) fullInput.value = result.nome;
                const title = document.getElementById('confProfileName');
                if (title)
                    title.textContent =
                        A.formatPersonName?.(result.nome_exibicao || result.nome) ||
                        result.nome_exibicao ||
                        result.nome;
                return result;
            }
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                fieldset.disabled = true;
                try {
                    const result = await call(endpoint, 'PUT', {
                        nome_exibicao: display.value
                    });
                    if (!valid()) return;
                    const name =
                        A.formatPersonName?.(result.nome_exibicao || result.nome) ||
                        result.nome_exibicao ||
                        result.nome;
                    document.querySelectorAll('.ar-user-name,#confProfileName').forEach((n) => {
                        n.textContent = name;
                    });
                    status.textContent = 'Nome de exibição salvo.';
                } catch (e) {
                    if (valid()) status.textContent = e.message;
                } finally {
                    if (valid()) fieldset.disabled = false;
                }
            });
            requestForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                requestFields.disabled = true;
                try {
                    await call(endpoint + '/solicitacoes', 'POST', {
                        nome_solicitado: newName.value
                    });
                    if (valid()) await load();
                } catch (e) {
                    if (valid()) {
                        status.textContent = e.message;
                        requestFields.disabled = false;
                    }
                }
            });
            try {
                await load();
            } catch (e) {
                if (valid()) status.textContent = e.message;
            }
        }
        if (/admin\.html$/.test(location.pathname) && session.is_admin && !external) {
            const section = make('details');
            section.className = 'ar-card ar-account-names';
            section.append(make('summary', 'Alterações de nome completo'));
            const content = make('div'),
                status = make('p');
            status.setAttribute('role', 'status');
            section.append(status, content);
            document.querySelector('main').append(section);
            async function load() {
                try {
                    const rows = await call('/api/admin/name-requests');
                    if (!valid()) return;
                    content.replaceChildren();
                    status.textContent = rows.length
                        ? `${rows.length} ${rows.length === 1 ? 'solicitação' : 'solicitações'} em análise.`
                        : 'Nenhuma solicitação de nome.';
                    for (const row of rows) {
                        const item = make('article');
                        item.className = 'ar-card';
                        item.append(
                            make('h3', `${row.nome_anterior} → ${row.nome_solicitado}`),
                            make(
                                'p',
                                `Conta ${row.tipo === 'external' ? 'externa' : 'institucional'} · ID ${row.id_conta}`
                            )
                        );
                        const label = make('label', 'Resposta administrativa'),
                            reason = make('textarea');
                        label.className = 'ar-field';
                        reason.maxLength = 1000;
                        label.append(reason);
                        item.append(label);
                        for (const [state, title] of [
                            ['aprovado', 'Aprovar nome'],
                            ['recusado', 'Recusar pedido']
                        ]) {
                            const button = make('button', title);
                            button.type = 'button';
                            button.className = 'ar-btn';
                            button.addEventListener('click', async () => {
                                button.disabled = true;
                                try {
                                    await call(
                                        '/api/admin/name-requests/' + row.id_pedido,
                                        'PATCH',
                                        { estado: state, motivo: reason.value }
                                    );
                                    if (valid()) await load();
                                } catch (e) {
                                    if (valid()) {
                                        status.textContent = e.message;
                                        button.disabled = false;
                                    }
                                }
                            });
                            item.append(button);
                        }
                        content.append(item);
                    }
                } catch (e) {
                    if (valid()) status.textContent = e.message;
                }
            }
            section.addEventListener('toggle', () => {
                if (section.open) load();
            });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})(window.Arcadia);
