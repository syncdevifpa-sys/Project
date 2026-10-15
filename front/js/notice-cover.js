// Capas opcionais: somente imagens locais rasterizadas, sem conteúdo executável.
(function (A) {
    'use strict';
    const valid = value => typeof value === 'string' && value.length <= 750000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    const markup = value => valid(value) ? '<div class="ar-notice-cover" aria-hidden="true"><img src="' + value + '" alt="" loading="lazy" decoding="async"></div>' : '';
    function decorate(card, value) {
        if (!valid(value)) return;
        card.classList.add('ar-notice-with-cover'); card.insertAdjacentHTML('afterbegin', markup(value));
    }
    function editor(parent, initial) {
        const group = document.createElement('div'); group.className = 'ar-cover-editor ar-span-2';
        const label = document.createElement('label'); label.textContent = 'Imagem de capa (opcional)';
        const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'image/jpeg,image/png,image/webp'; label.append(upload);
        const preview = document.createElement('div'); preview.className = 'ar-cover-preview';
        const hint = document.createElement('p'); hint.setAttribute('role','status'); hint.textContent = 'Prefira uma imagem horizontal. A capa terá um degradê suave; publicações sem foto continuam disponíveis.';
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ar-btn ar-btn--quiet'; remove.textContent = 'Remover capa';
        const state = { value: initial || '', changed: false, busy: false };
        function render() { preview.innerHTML = markup(state.value); preview.hidden = !valid(state.value); remove.hidden = !valid(state.value); }
        upload.addEventListener('change', async () => {
            const file = upload.files[0]; if (!file) return;
            state.busy = true; remove.disabled = true; hint.textContent = 'Preparando imagem…'; let url;
            try {
                if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15*1024*1024) throw Error('Escolha uma imagem JPG, PNG ou WEBP de até 15 MB.');
                url = URL.createObjectURL(file); const image = new Image();
                await new Promise((resolve,reject) => { image.onload=resolve; image.onerror=()=>reject(Error('Não foi possível abrir esta imagem.')); image.src=url; });
                const scale = Math.min(1, 1280/image.naturalWidth, 1280/image.naturalHeight);
                const canvas = document.createElement('canvas'); canvas.width=Math.max(1,Math.round(image.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
                const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
                let value; for (const quality of [.85,.7,.55,.4]) { value=canvas.toDataURL('image/jpeg',quality); if(value.length<=680000)break; }
                if(value.length>680000)throw Error('A imagem ficou muito grande. Escolha uma imagem menor.');
                state.value=value; state.changed=true; render(); hint.textContent='Capa preparada. Salve a publicação para confirmar.';
            } catch(error) { hint.textContent=error.message; }
            finally { if(url)URL.revokeObjectURL(url); state.busy=false; remove.disabled=false; upload.value=''; }
        });
        remove.addEventListener('click',()=>{state.value='';state.changed=true;render();hint.textContent='Capa removida da prévia. Salve para confirmar.';});
        group.append(label,preview,hint,remove); parent.append(group); render(); return state;
    }
    A.noticeCover = { valid, markup, decorate, editor };
})(window.Arcadia = window.Arcadia || {});
