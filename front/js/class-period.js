(function (A) {
    'use strict';
    function fields(editor, subject = {}, allowLegacy = false) {
        editor.fields.append(document.createElement('hr'));
        const heading = document.createElement('h3');heading.textContent = 'Período letivo da oferta';editor.fields.append(heading);
        const hint = document.createElement('p');hint.className = 'ac-meta';
        hint.textContent = 'Informe quando esta disciplina é oferecida, por exemplo 2026.1, 2026.2 ou 2026 anual. Este campo não é o período curricular do aluno.';editor.fields.append(hint);
        const year = editor.field('Ano letivo', {type:'number',value:subject.ano_letivo || '',required:true});year.min='2000';year.max='2100';
        const legacy = allowLegacy && subject.regime_letivo === 'legado';
        const regime = editor.select('Regime da oferta', [['','Selecione o regime'],...(legacy ? [['legado','Manter período não informado']] : []),['anual','Anual'],['semestral','Semestral']], subject.regime_letivo || '');regime.required=true;
        const semester = editor.select('Semestre letivo',[['','Selecione o semestre'],['1','Primeiro semestre'],['2','Segundo semestre']],subject.semestre || '');
        const preview = document.createElement('p');preview.setAttribute('role','status');preview.className='ac-meta';editor.fields.append(preview);
        const confirm = editor.field('Confirmo a alteração do período; as datas das aulas e os registros vinculados não serão movidos.', {type:'checkbox'});
        const previous = subject.ano_letivo && subject.regime_letivo ? key(subject) : null;
        function key(row){return row.ano_letivo+'.'+(row.regime_letivo==='semestral'?row.semestre:row.regime_letivo==='anual'?'anual':'legado');}
        function value(){return {ano_letivo:Number(year.value),regime_letivo:regime.value,semestre:regime.value==='semestral'?Number(semester.value):0};}
        function update(){
            const semestral=regime.value==='semestral';semester.disabled=!semestral;semester.required=semestral;semester.parentElement.hidden=!semestral;
            const changed=previous && key(value())!==previous;
            confirm.parentElement.hidden=!changed;confirm.required=!!changed;
            preview.textContent=regime.value==='anual' ? year.value+' · anual' : semestral&&semester.value ? year.value+'.'+semester.value : legacy&&regime.value==='legado' ? 'Oferta legada: nenhum semestre será presumido.' : 'Escolha o regime e, quando necessário, o semestre.';
        }
        year.addEventListener('input',update);regime.addEventListener('change',update);semester.addEventListener('change',update);update();
        function read(){
            const period=value();
            if(legacy && regime.value==='legado' && Number(year.value)===Number(subject.ano_letivo))return {};
            if(!['anual','semestral'].includes(period.regime_letivo))throw new Error('Escolha o regime anual ou semestral para informar o período.');
            if(period.regime_letivo==='semestral' && ![1,2].includes(period.semestre))throw new Error('Selecione o primeiro ou segundo semestre.');
            if(!Number.isInteger(period.ano_letivo)||period.ano_letivo<2000||period.ano_letivo>2100)throw new Error('Informe um ano letivo entre 2000 e 2100.');
            if(previous && key(period)!==previous && !confirm.checked)throw new Error('Confirme a alteração do período antes de salvar.');
            return {...period,...(previous ? {periodo_anterior:previous,confirmar_periodo:confirm.checked===true}: {})};
        }
        return {read};
    }
    A.classPeriod={fields};
})(window.Arcadia);
