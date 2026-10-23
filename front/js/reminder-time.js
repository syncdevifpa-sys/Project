(function(A){
    'use strict';
    function fromUTC(instant,zone) {
        const date=new Date(instant);
        if(!Number.isFinite(date.getTime())) throw new Error('Data inválida.');
        let parts;
        try { parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date); }
        catch { throw new Error('Fuso horário inválido.'); }
        const p=Object.fromEntries(parts.map((x)=>[x.type,x.value]));
        return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    }
    function toUTC(value,zone) {
        if(typeof value!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) throw new Error('Data e horário inválidos.');
        const target=Date.parse(value+':00.000Z');
        if(!Number.isFinite(target) || new Date(target).toISOString().slice(0,16)!==value) throw new Error('Data e horário inválidos.');
        let guess=target;
        for(let i=0;i<4;i++) {
            const local=Date.parse(fromUTC(guess,zone)+':00.000Z');
            if(local===target) break;
            guess+=target-local;
        }
        if(fromUTC(guess,zone)!==value) throw new Error('Esse horário não existe nesse fuso. Escolha outro horário.');
        for(const delta of [-7200000,-3600000,-1800000,1800000,3600000,7200000]) {
            if(fromUTC(guess+delta,zone)===value) throw new Error('Esse horário é ambíguo por mudança de horário local. Escolha outro horário.');
        }
        return new Date(guess).toISOString();
    }
    const api={toUTC,fromUTC};
    if(typeof module!=='undefined'&&module.exports) module.exports=api;
    else A.reminderTime=api;
})(typeof window==='undefined'?null:window.Arcadia);
