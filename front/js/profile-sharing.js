// Preferências independentes dos dados de login e do formulário principal.
(function () {
    'use strict';
    async function start() {
        const root = document.getElementById('profileSharing');
        const A = window.Arcadia;
        if (!root || !A?.auth.getSessao().logado || !A.token.get()) return;
        const external = A.auth.getSessao().tipo_usuario === 'externo';
        const endpoint = external ? '/api/external/compartilhamento' : '/api/auth/compartilhamento';
        const make = (tag, text) => {
            const node = document.createElement(tag);
            if (text) node.textContent = text;
            return node;
        };
        const icon = (kind) => {
            const paths = {
                email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
                text: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
                tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.7L8.7 10.5a16 16 0 0 0 4.8 4.8l1.3-1.3a2 2 0 0 1 1.7-.6l2.8.5a2 2 0 0 1 2.7 3z"/>',
                photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m21 15-5-5L5 21"/>'
            };
            const node = make('span');
            node.className = 'ar-sharing-icon';
            node.setAttribute('aria-hidden', 'true');
            node.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                paths[kind] +
                '</svg>';
            return node;
        };
        root.append(make('h2', external ? 'Foto da minha conta' : 'O que outras pessoas podem ver'));
        root.append(
            make(
                'p',
                external ? 'Edite sua foto de identificação. Sua conta externa não é publicada no diretório Pessoas.' : 'Contatos e foto são privados por padrão. Marque apenas o que deseja tornar público em Pessoas, inclusive para quem acessar sem conta. O e-mail de contato não altera seu login.'
            )
        );
        const form = make('form'),
            fieldset = make('fieldset'),
            status = make('p');
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.textContent = 'Carregando suas opções…';
        fieldset.disabled = true;
        const fields = {};
        for (const [key, title, type, limit] of external ? [] : [
            ['contato_email', 'E-mail de contato (opcional)', 'email', 150],
            ['contato_handle', '@ / identificação na rede (opcional)', 'text', 100],
            ['contato_telefone', 'Telefone de contato (opcional)', 'tel', 30]
        ]) {
            const group = make('div');
            group.className = 'ar-sharing-contact';
            const label = make('label', title);
            label.className = 'ar-field';
            const input = make('input');
            input.type = type;
            input.maxLength = limit;
            input.autocomplete = 'off';
            label.append(input, icon(type));
            group.append(label);
            fields[key] = input;
            if (key === 'contato_handle')
                group.append(
                    make(
                        'small',
                        'Informe também a rede, por exemplo: @seunome (Instagram). Este campo é exibido como texto.'
                    )
                );
            const flag = 'mostrar_' + key.slice(8);
            const visibility = make('label');
            visibility.className = 'ar-sharing-check';
            const checkbox = make('input');
            checkbox.type = 'checkbox';
            visibility.append(
                checkbox,
                make(
                    'span',
                    'Compartilhar ' +
                        (type === 'email'
                            ? 'e-mail'
                            : type === 'tel'
                              ? 'telefone'
                              : '@ / identificação')
                )
            );
            fields[flag] = checkbox;
            group.append(visibility);
            fieldset.append(group);
        }
        if (!external) {
            const photoLabel = make('label');
            photoLabel.className = 'ar-sharing-check';
            const showPhoto = make('input');
            showPhoto.type = 'checkbox';
            fields.mostrar_foto = showPhoto;
            photoLabel.append(
                showPhoto,
                icon('photo'),
                make('span', 'Mostrar minha foto para outras pessoas')
            );
            fieldset.append(photoLabel);
            if (!external) fieldset.append(
                make(
                    'p',
                    'Ocultar a foto não a remove da sua própria conta. Em Pessoas, será exibido um avatar com iniciais.'
                )
            );
        }
        let draftPhoto;
        let available = false;
        if (external) {
            const preview = make('div');
            preview.className = 'ar-sharing-photo';
            preview.textContent = 'Sem foto';
            const inputLabel = make('label', 'Foto da minha conta (opcional)');
            inputLabel.className = 'ar-field';
            const upload = make('input');
            upload.type = 'file';
            upload.accept = 'image/jpeg,image/png,image/webp';
            inputLabel.append(upload);
            const remove = make('button', 'Remover foto');
            remove.type = 'button';
            remove.className = 'ar-btn ar-btn--secondary';
            const renderPhoto = (value) => {
                preview.replaceChildren();
                if (!value) {
                    preview.textContent = 'Sem foto';
                    return;
                }
                const image = make('img');
                image.src = value;
                image.alt = 'Sua foto, visível nesta conta';
                preview.append(image);
            };
            root.renderOwnSharingPhoto = renderPhoto;
            upload.addEventListener('change', async () => {
                const file = upload.files[0];
                if (!file) return;
                try {
                    const value = await A.editAvatar(file);
                    if (value) {
                        draftPhoto = value;
                        renderPhoto(value);
                        status.textContent = 'Foto preparada. Salve as opções para confirmar.';
                    }
                } catch (error) {
                    status.textContent = error.message;
                } finally {
                    upload.value = '';
                }
            });
            remove.addEventListener('click', () => {
                draftPhoto = '';
                renderPhoto('');
                status.textContent = 'Foto removida da prévia. Salve para confirmar.';
            });
            fieldset.append(preview, inputLabel, remove);
        }
        const save = make('button', external ? 'Salvar foto' : 'Salvar compartilhamento');
        save.type = 'submit';
        save.className = 'ar-btn ar-btn--primary';
        fieldset.append(save);
        form.append(fieldset, status);
        root.append(form);
        try {
            const value = await A.api.expect(A.api.get(endpoint));
            if (!value.disponivel) {
                fieldset.disabled = false;
                save.disabled = true;
                status.textContent =
                    'Você pode preencher os contatos, mas ainda não é possível salvá-los. Falta habilitar esta opção no banco do site executando add-profile-sharing.sql. Depois, recarregue esta página. Nada será compartilhado até você salvar.';
                return;
            }
            available = true;
            for (const [key, input] of Object.entries(fields)) {
                if (input.type === 'checkbox') input.checked = value[key] === true;
                else input.value = value[key] || '';
            }
            if (external) root.renderOwnSharingPhoto(value.foto);
            fieldset.disabled = false;
            status.textContent = external ? 'Alterar sua foto não modifica contatos ou preferências anteriores.' :
                'Só os campos marcados serão compartilhados. Você pode desmarcar e salvar a qualquer momento.';
        } catch (error) {
            fieldset.disabled = false;
            save.disabled = true;
            status.textContent =
                (error.message || 'Não foi possível carregar suas opções.') +
                ' Você pode preencher os campos, mas ainda não pode salvar. Recarregue a página para tentar carregar suas preferências novamente.';
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!available) return;
            const body = {};
            for (const [key, input] of Object.entries(fields))
                body[key] = input.type === 'checkbox' ? input.checked : input.value.trim();
            if (external && draftPhoto !== undefined) body.foto = draftPhoto;
            fieldset.disabled = true;
            status.textContent = 'Salvando…';
            try {
                const result = await A.api.expect(A.api.put(endpoint, body));
                for (const key of ['contato_email', 'contato_handle', 'contato_telefone'])
                    if (fields[key]) fields[key].value = result[key] || '';
                draftPhoto = undefined;
                status.textContent = external ? 'Foto da conta salva.' : 'Opções de compartilhamento salvas.';
            } catch (error) {
                status.textContent =
                    error.message ||
                    'Não foi possível salvar. Seus valores continuam no formulário.';
            } finally {
                fieldset.disabled = false;
            }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
