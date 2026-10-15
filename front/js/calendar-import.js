(function(A){
    'use strict';
    A.calendarImport={open(onSuccess){
        const session=A.auth.getSessao();if(!session.is_admin&&!['docente','servidor'].includes(session.tipo_usuario))return;
        const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
        const dialog=make('dialog');dialog.className='ar-dialog ar-notice-editor ar-calendar-import';dialog.setAttribute('aria-labelledby','calendarImportTitle');
        const heading=make('h2','Importar calendário em PDF');heading.id='calendarImportTitle';dialog.append(heading,make('p','Extraia uma prévia, confira o PDF e selecione os eventos. Nada será gravado até sua confirmação. Os eventos do calendário são públicos.'));
        const form=make('form');form.className='ar-form-grid';const fields={};
        function field(name,label,type,value){const wrap=make('label',label);wrap.className='ar-field';const input=make('input');input.name=name;input.type=type;if(value!==undefined)input.value=value;wrap.append(input);form.append(wrap);fields[name]=input;return input;}
        const file=field('file','PDF com texto selecionável (até 4 MB)','file');file.accept='application/pdf,.pdf';file.required=true;
        const year=field('year','Ano do calendário','number','');year.min='2000';year.max='2100';year.required=true;
        const levelWrap=make('label','Modalidade');levelWrap.className='ar-field';const level=make('select');for(const [value,label] of Object.entries({basica:'Educação básica e profissional',graduacao:'Graduação',pos:'Pós-graduação'})){const option=make('option',label);option.value=value;level.append(option);}levelWrap.append(level);form.append(levelWrap);
        const label=field('label','Identificação / versão da fonte','text','');label.placeholder='Ex.: IFPA Belém — Resolução 1544/2025';label.maxLength=120;label.required=true;
        const source=field('source','Link da fonte (opcional; não será baixado)','url','https://belem.ifpa.edu.br/calendario-academico');source.maxLength=1000;
        const confirmed=field('metadataConfirmed','Conferi campus Belém, ano, modalidade e versão no PDF','checkbox');confirmed.required=true;
        const reference=make('a','Referência oficial: calendários do Campus Belém');reference.href='https://belem.ifpa.edu.br/calendario-academico';reference.target='_blank';reference.rel='noopener noreferrer';form.append(reference);
        const extract=make('button','Extrair prévia');extract.type='submit';extract.className='ar-btn ar-btn--secondary';form.append(extract);dialog.append(form);
        const status=make('p');status.setAttribute('role','status');dialog.append(status);const result=make('section');dialog.append(result);
        const footer=make('div');footer.className='ar-profile-actions';const cancel=make('button','Fechar');cancel.type='button';cancel.className='ar-btn ar-btn--secondary';footer.append(cancel);dialog.append(footer);
        let preview=null,rows=[],saving=false,blobUrl=null,revision=0;
        function clear(){preview=null;rows=[];result.replaceChildren();}
        form.addEventListener('change',event=>{revision++;clear();if(event.target!==confirmed)confirmed.checked=false;status.textContent='Dados alterados. Confirme os dados e extraia a prévia novamente.';});
        cancel.addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});dialog.addEventListener('close',()=>{if(blobUrl)URL.revokeObjectURL(blobUrl);dialog.remove();},{once:true});
        function addRow(candidate={titulo:'',data_evento:'',data_fim:null,page:'manual',sourceText:'Adicionado após conferência do PDF.',warning:['Evento manual: confira a data e a descrição.']}){
            const card=make('article');card.className='ar-calendar-import-row';const row={candidate};
            const origin=make('p','Página '+candidate.page+' · '+(candidate.warning||[]).join(' '));origin.className='notice-filter-hint';card.append(origin);
            const quote=make('details'),summary=make('summary','Ver trecho extraído');quote.append(summary,make('p',candidate.sourceText));card.append(quote);
            function input(name,text,type,value){const wrap=make('label',text);wrap.className='ar-field';const node=make('input');node.type=type;node.value=value||'';if(name==='titulo')node.maxLength=150;wrap.append(node);card.append(wrap);row[name]=node;}
            input('titulo','Título revisado','text',candidate.titulo);input('data_evento','Data inicial','date',candidate.data_evento);input('data_fim','Data final (opcional)','date',candidate.data_fim);
            const categoryWrap=make('label','Categoria');categoryWrap.className='ar-field';const category=make('select');for(const [value,text] of Object.entries({evento:'Evento',matricula:'Matrícula',edital:'Edital',cancelamento:'Cancelamento',feriado:'Feriado'})){const option=make('option',text);option.value=value;category.append(option);}categoryWrap.append(category);card.append(categoryWrap);row.categoria=category;
            input('reviewed','Conferi o trecho, o título e as datas no PDF','checkbox');input('selected','Importar este evento','checkbox');row.selected.disabled=true;
            row.reviewed.addEventListener('change',()=>{row.selected.disabled=!row.reviewed.checked;if(!row.reviewed.checked)row.selected.checked=false;});
            result.append(card);rows.push(row);
        }
        function render(data){
            clear();preview=data;status.textContent=`${data.candidates.length} candidatos em ${data.pages} páginas. Confira cada linha; itens ambíguos precisam de correção. Nenhum evento gravado.`;
            for(const warning of data.warnings)result.append(make('p',warning));
            if(data.detected)result.append(make('p',`Identificação no texto: ${data.detected.reference||'Resolução não reconhecida'} · ${data.detected.campus||'Campus a conferir'} · ano ${data.detected.years.join(', ')||'a conferir'}`));
            if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(file.files[0]);const original=make('a','Abrir o PDF selecionado para conferência');original.href=blobUrl;original.target='_blank';original.rel='noopener noreferrer';result.append(original);
            if(data.unparsed.length){const unresolved=make('details');unresolved.append(make('summary',`${data.unparsed.length} trechos sem reconhecimento seguro`));for(const line of data.unparsed)unresolved.append(make('p',`Página ${line.page}: ${line.text}`));result.append(unresolved);}
            for(const candidate of data.candidates)addRow(candidate);
            const manual=make('button','Adicionar evento manual à prévia');manual.type='button';manual.className='ar-btn ar-btn--secondary';manual.addEventListener('click',()=>addRow());result.append(manual);
            const publishLabel=make('label','Confirmo a publicação dos eventos selecionados no calendário público');publishLabel.className='ar-field';const publish=make('input');publish.type='checkbox';publishLabel.append(publish);result.append(publishLabel);
            const commit=make('button','Importar eventos selecionados');commit.type='button';commit.className='ar-btn ar-btn--primary';result.append(commit);
            commit.addEventListener('click',async()=>{
                const selected=rows.filter(row=>row.selected.checked);if(!publish.checked||!selected.length){status.textContent='Selecione eventos revisados e confirme a publicação no calendário público.';return;}
                const events=selected.map(row=>({titulo:row.titulo.value.trim(),data_evento:row.data_evento.value,data_fim:row.data_fim.value||null,categoria:row.categoria.value,reviewed:row.reviewed.checked,requiresEnd:row.candidate.requiresEnd===true,sourceText:row.candidate.sourceText}));
                if(events.some(event=>!event.titulo||event.titulo.length>150||!event.data_evento||event.requiresEnd&&!event.data_fim||event.data_fim&&event.data_fim<event.data_evento)){status.textContent='Corrija título (até 150 caracteres) e datas dos eventos selecionados. Períodos precisam de início e fim.';return;}
                saving=true;commit.disabled=true;cancel.disabled=true;
                try{const saved=await A.api.expect(A.api.post('/api/calendar-import/commit',{previewToken:preview.previewToken,events,confirmed:true,publicCalendarConfirmed:true}));status.textContent=saved.message;clear();try{await onSuccess();}catch{A.showToast('Importação concluída. Recarregue o calendário.');}}
                catch(error){status.textContent=error.message;}
                finally{saving=false;commit.disabled=false;cancel.disabled=false;}
            });
        }
        form.addEventListener('submit',async event=>{
            event.preventDefault();const selected=file.files[0];if(!selected||!confirmed.checked||selected.size>4*1024*1024||!(/\.pdf$/i.test(selected.name))){status.textContent='Selecione um PDF de até 4 MB e confirme os dados do calendário.';return;}
            clear();const currentRevision=revision;extract.disabled=true;status.textContent='Lendo o PDF e preparando a prévia…';
            try{const signature=new TextDecoder().decode(await selected.slice(0,5).arrayBuffer());if(signature!=='%PDF-')throw new Error('O arquivo não tem assinatura de PDF válida.');const params=new URLSearchParams({year:year.value,level:level.value,label:label.value,source:source.value});const data=await A.api.expect(A.api.request('/api/calendar-import/preview?'+params,{method:'POST',body:selected,raw:true,contentType:'application/pdf'}));if(currentRevision!==revision){status.textContent='Dados alterados durante a leitura. Extraia novamente.';return;}render(data);}
            catch(error){status.textContent=error.message;}
            finally{extract.disabled=false;}
        });
        document.body.append(dialog);dialog.showModal();file.focus();return dialog;
    }};
})(window.Arcadia);
