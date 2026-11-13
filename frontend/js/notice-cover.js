/* Capas opcionais: somente imagens locais rasterizadas, sem conteúdo executável. */
(function (A) {
    'use strict';
    const valid = (value) =>
        typeof value === 'string' &&
        value.length <= 750000 &&
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    const escapeAttribute = (value) =>
        String(value || '').replace(
            /[&<>"']/g,
            (letter) =>
                ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letter]
        );
    const markup = (value, description = '') =>
        valid(value)
            ? '<div class="ar-notice-cover"' +
              (description ? '' : ' aria-hidden="true"') +
              '><img src="' +
              value +
              '" alt="' +
              escapeAttribute(description) +
              '" loading="lazy" decoding="async"></div>'
            : '';
    function decorate(card, value, description = '') {
        if (!valid(value)) return;
        card.classList.add('ar-notice-with-cover');
        card.insertAdjacentHTML('afterbegin', markup(value, description));
    }
    function editor(parent, initial) {
        const group = document.createElement('div');
        group.className = 'ar-cover-editor ar-span-2';
        const label = document.createElement('label');
        label.textContent = 'Imagem de capa (opcional)';
        const upload = document.createElement('input');
        upload.type = 'file';
        upload.accept = 'image/jpeg,image/png,image/webp';
        label.append(upload);
        const preview = document.createElement('div');
        preview.className = 'ar-cover-preview';
        const hint = document.createElement('p');
        hint.setAttribute('role', 'status');
        hint.textContent =
            'JPG, PNG ou WEBP de até 10 MB. Transcreva no texto da publicação datas, contatos e demais informações do cartaz. A imagem será comprimida antes de salvar.';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ar-btn ar-btn--quiet';
        remove.textContent = 'Remover capa';
        const adjust = document.createElement('button');
        adjust.type = 'button';
        adjust.className = 'ar-btn ar-btn--secondary';
        adjust.textContent = 'Editar imagem';
        adjust.addEventListener('click', async () => {
            if (!valid(state.value) || !A.editAvatar || state.busy) return;
            state.busy = true;
            adjust.disabled = true;
            try {
                const blob = await (await fetch(state.value)).blob();
                const result = await A.editAvatar(
                    new File([blob], 'capa.jpg', { type: blob.type }),
                    { cover: true }
                );
                if (result && valid(result)) {
                    state.value = result;
                    state.changed = true;
                    render();
                    hint.textContent =
                        'Enquadramento preparado. Salve a publicação para confirmar.';
                } else if (result)
                    hint.textContent = 'A imagem ficou muito grande. Escolha uma imagem menor.';
            } catch (error) {
                hint.textContent = error.message;
            } finally {
                state.busy = false;
                adjust.disabled = false;
            }
        });
        const state = { value: initial || '', changed: false, busy: false };
        function render() {
            preview.innerHTML = markup(state.value);
            preview.hidden = !valid(state.value);
            remove.hidden = !valid(state.value);
            adjust.hidden = !valid(state.value) || !A.editAvatar;
        }
        upload.addEventListener('change', async () => {
            const file = upload.files[0];
            if (!file) return;
            state.busy = true;
            remove.disabled = true;
            hint.textContent = 'Preparando imagem…';
            let url;
            try {
                if (
                    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                    file.size > 10 * 1024 * 1024
                )
                    throw Error('Escolha uma imagem JPG, PNG ou WEBP de até 10 MB.');
                if (A.editAvatar) {
                    const edited = await A.editAvatar(file, { cover: true });
                    if (!edited) {
                        hint.textContent = 'Edição cancelada. A capa anterior foi mantida.';
                        return;
                    }
                    if (!valid(edited))
                        throw Error(
                            'A imagem ficou muito grande. Reduza o tamanho antes de enviar.'
                        );
                    state.value = edited;
                    state.changed = true;
                    render();
                    hint.textContent =
                        'Enquadramento preparado. Salve a publicação para confirmar.';
                    return;
                }
                url = URL.createObjectURL(file);
                const image = new Image();
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = () => reject(Error('Não foi possível abrir esta imagem.'));
                    image.src = url;
                });
                const scale = Math.min(1, 1280 / image.naturalWidth, 1280 / image.naturalHeight);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                let value;
                for (const quality of [0.85, 0.7, 0.55, 0.4]) {
                    value = canvas.toDataURL('image/jpeg', quality);
                    if (value.length <= 680000) break;
                }
                if (value.length > 680000)
                    throw Error('A imagem ficou muito grande. Escolha uma imagem menor.');
                state.value = value;
                state.changed = true;
                render();
                hint.textContent = 'Capa preparada. Salve a publicação para confirmar.';
            } catch (error) {
                hint.textContent = error.message;
            } finally {
                if (url) URL.revokeObjectURL(url);
                state.busy = false;
                remove.disabled = false;
                upload.value = '';
            }
        });
        remove.addEventListener('click', () => {
            state.value = '';
            state.changed = true;
            render();
            hint.textContent = 'Capa removida da prévia. Salve para confirmar.';
        });
        group.append(label, preview, hint, adjust, remove);
        parent.append(group);
        render();
        return state;
    }
    /* A fotografia mantém tamanho e fonte; somente a névoa acompanha a proximidade do topo. */
    function enableReveal(media) {
        const detail = media.closest('.ar-detail');
        if (!detail || media.dataset.revealReady) return () => {};
        media.dataset.revealReady = 'true';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ar-cover-reveal-toggle';
        function reveal(value) {
            detail.classList.toggle('is-cover-revealed', value);
            button.setAttribute('aria-pressed', String(value));
            button.textContent = value ? 'Mostrar efeito da capa' : 'Ver imagem sem efeito';
        }
        reveal(false);
        button.addEventListener('click', () => reveal(!detail.classList.contains('is-cover-revealed')));
        media.append(button);
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (media.isConnected) {
                      const nearTop = media.getBoundingClientRect().top >= 56;
                      reveal(nearTop);
                      detail.classList.toggle('is-cover-scrolled', !nearTop);
                  }
            });
        };
        window.addEventListener('scroll', onScroll, { passive:true });
        const dialog = media.closest('dialog');
        dialog?.addEventListener('scroll', onScroll, { passive:true, capture:true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            dialog?.removeEventListener('scroll', onScroll, true);
            if (frame) cancelAnimationFrame(frame);
        };
    }
    /* O link nativo continua disponível; selecionar texto e acionar botões não abre o cartão. */
    function linkCard(card, primary) {
        if (!primary || card.dataset.cardLinked) return;
        card.dataset.cardLinked = 'true';
        card.classList.add('ar-clickable-card');
        card.addEventListener('click', event => {
            if (event.defaultPrevented || event.button > 0 || event.target.closest('a,button,input,select,textarea,summary,[contenteditable]')) return;
            if (window.getSelection()?.toString()) return;
            primary.click();
        });
    }
    function openProject(project) {
        const dialog = document.createElement('dialog');
        dialog.className = 'ar-dialog ar-project-reader';
        const heading = document.createElement('h2');
        heading.textContent = project.titulo;
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'ar-iconbtn'; close.textContent = '×';
        close.setAttribute('aria-label','Fechar projeto');
        close.addEventListener('click',()=>dialog.close());
        const content = document.createElement('section');
        content.className = 'ar-detail';
        if (valid(project.capa)) content.insertAdjacentHTML('afterbegin','<div class="ar-publication-media">'+markup(project.capa,'Capa: '+project.titulo)+'</div>');
        const body = document.createElement('div');
        A.noticeText.render(body,project.descricao || '');
        content.append(heading,body);
        if (!A.dialogShell) dialog.append(close);
        dialog.append(content);
        document.body.append(dialog);
        const media = content.querySelector('.ar-publication-media');
        const cleanup = media ? enableReveal(media) : ()=>{};
        dialog.addEventListener('close',()=>{cleanup();dialog.remove();},{once:true});
        A.dialogShell ? A.dialogShell.open(dialog) : dialog.showModal();
    }
    A.noticeCover = { valid, markup, decorate, editor, enableReveal, linkCard, openProject };
})((window.Arcadia = window.Arcadia || {}));
