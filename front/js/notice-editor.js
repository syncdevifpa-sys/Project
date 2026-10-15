(function (A) {
    'use strict';
    A.contentEditor = {
        canEdit(resource, notice) { const session=A.auth.getSessao();return session.tipo_usuario!=='externo' && (resource==='links'?Boolean(session.is_admin):A.noticeActions.canDelete(notice)) && (resource!=='documents'||notice.status==='solicitado'||Boolean(session.is_admin)); },
        open(resource, notice, onSuccess) {
            const config=A.contentFields[resource],fields=config.fields;
            const editing=Boolean(notice),session=A.auth.getSessao();
            if (editing ? !this.canEdit(resource,notice) : session.tipo_usuario==='externo' || !session.id_usuario || resource==='links'&&!session.is_admin || ['notices','calendar'].includes(resource)&&!(session.is_admin||['docente','servidor'].includes(session.tipo_usuario))) return;
            notice=Object.assign({},config.defaults,notice||{});
            const dialog=document.createElement('dialog');dialog.className='ar-dialog ar-notice-editor';dialog.setAttribute('aria-labelledby','noticeEditorTitle');
            const title=document.createElement('h2');title.id='noticeEditorTitle';title.textContent=(editing?'Editar: ':'Criar: ')+config.label;dialog.append(title);
            const form=document.createElement('form');form.className='ar-form-grid';const inputs={};
            for (const [name,text,type,max] of fields) {
                const label=document.createElement('label');label.className='ar-field'+(['titulo','resumo','descricao'].includes(name)?' ar-span-2':'');label.textContent=text;
                const input=document.createElement(typeof type==='object'?'select':type==='textarea'?'textarea':'input');input.name=name;
                if (typeof type==='object') for (const [value,text] of Object.entries(type)) { const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option); }
                else if (type==='textarea') input.rows=3;else input.type=type;
                if (max) input.maxLength=max;
                if (name==='titulo'||resource==='notices'&&name==='resumo'||resource==='projects'&&name==='descricao'||resource==='calendar'&&name==='data_evento') input.required=true;
                if (type==='number') { input.min='0';input.max='4294967295';input.step='1'; }
                if (type==='checkbox') input.checked=notice[name]===true||notice[name]===1;
                else input.value=type==='date'?String(notice[name]||'').slice(0,10):String(notice[name]??'');
                inputs[name]=input;label.append(input);form.append(label);
            }
            const cover=resource==='notices'?A.noticeCover?.editor(form,notice.capa):null;
            const error=document.createElement('p');error.className='ar-notice-editor-error ar-span-2';error.setAttribute('role','alert');form.append(error);
            const hint=document.createElement('p');hint.className='notice-filter-hint ar-span-2';hint.textContent='Links completos http:// ou https:// ficam clicáveis no conteúdo.'+(resource==='notices'?' Todos inclui a comunidade externa.':resource==='documents'?' A secretaria mantém protocolo, processamento e entrega.':'');form.append(hint);
            const actions=document.createElement('div');actions.className='ar-profile-actions ar-span-2';
            const cancel=document.createElement('button');cancel.type='button';cancel.className='ar-btn ar-btn--secondary';cancel.textContent='Cancelar';cancel.addEventListener('click',()=>dialog.close());
            const save=document.createElement('button');save.type='submit';save.className='ar-btn ar-btn--primary';save.textContent=editing?'Salvar alterações':'Criar registro';actions.append(cancel,save);form.append(actions);dialog.append(form);
            let saving=false;
            dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
            dialog.addEventListener('close',()=>dialog.remove(),{once:true});
            form.addEventListener('submit',async event=>{
                event.preventDefault();if(cover?.busy){error.textContent='Aguarde a imagem terminar de carregar.';return;}if(saving)return;saving=true;save.disabled=true;cancel.disabled=true;error.textContent='';
                const payload={};for(const [name,,type] of fields)payload[name]=type==='checkbox'?inputs[name].checked:type==='number'?(inputs[name].value===''?null:Number(inputs[name].value)):['date','time','datetime-local'].includes(type)?(inputs[name].value||null):inputs[name].value;
                if(cover?.changed)payload.capa=cover.value;
                try {
                    await A.api.expect(editing?(resource==='notices'?A.api.put(config.endpoint+'/'+encodeURIComponent(notice[config.id]),payload):A.api.patch('/api/content/'+resource+'/'+encodeURIComponent(notice[config.id]),payload)):A.api.post(config.endpoint,payload));
                    dialog.close();A.showToast(editing?'Registro atualizado.':'Registro criado.');
                    try { await onSuccess(); } catch { A.showToast('Registro salvo. Recarregue a página para atualizar a lista.'); }
                } catch(failure) { error.textContent=failure.message||'Não foi possível salvar. Seus dados continuam no formulário.'; }
                finally { saving=false;save.disabled=false;cancel.disabled=false; }
            });
            document.body.append(dialog);dialog.showModal();inputs.titulo.focus();return dialog;
        }
    };
    A.noticeEditor={open:(notice,onSuccess)=>A.contentEditor.open('notices',notice,onSuccess)};
})(window.Arcadia);
