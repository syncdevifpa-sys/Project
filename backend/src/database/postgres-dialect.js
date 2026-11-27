/* Fronteira de compatibilidade: valores ficam parametrizados; nenhuma substituição em literais. */
const {tokens,render,split,close}=require('./sql-lexer');
const upper=t=>t?.kind==='word'?t.text.toUpperCase():t?.text;
function dateValue(value) {
    if(!Number.isFinite(value.getTime()))throw Error('Data SQL inválida.');
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value).map(part=>[part.type,part.value]));
    return parts.year+'-'+parts.month+'-'+parts.day+' '+parts.hour+':'+parts.minute+':'+parts.second+'.'+String(value.getUTCMilliseconds()).padStart(3,'0');
}
function ordering(list,catalog) {
    const aliases=new Map();let base;
    for(let i=0;i<list.length;i++)if(['FROM','JOIN'].includes(upper(list[i]))&&list[i+1]?.kind==='word'){
        const table=list[i+1].text;aliases.set(table,table);if(!base)base=table;
        if(list[i+2]?.kind==='word'&&!['WHERE','JOIN','LEFT','RIGHT','INNER','ORDER','ON','FOR','LIMIT'].includes(upper(list[i+2])))aliases.set(list[i+2].text,table);
    }
    for(let i=0;i<list.length-1;i++)if(upper(list[i])==='ORDER'&&upper(list[i+1])==='BY'){
        let end=i+2,depth=0;
        for(;end<list.length;end++){
            const word=upper(list[end]);if(depth===0&&(['LIMIT','OFFSET','FOR','UNION'].includes(word)||word===')'))break;
            if(word==='(')depth++;if(word===')')depth--;
        }
        const rewritten=split(list.slice(i+2,end)).flatMap((part,n)=>{
            if(part.some(t=>upper(t)==='NULLS'))return [...(n?[{text:','}]:[]),...part];
            const descending=upper(part.at(-1))==='DESC',hasDirection=['ASC','DESC'].includes(upper(part.at(-1)));
            const expr=hasDirection?part.slice(0,-1):part;
            const table=expr.length===3&&expr[1].text==='.'?aliases.get(expr[0].text):base;
            const name=expr.length===1?expr[0].text:expr.length===3?expr[2].text:null;
            const type=catalog[table]?.columns.find(column=>column.name===name)?.type;
            let rendered=render(expr);
            if(type?.startsWith('enum(')){
                const choices=split(tokens(type).slice(2,-1)).map(render);
                rendered='CASE '+rendered+' '+choices.map((value,index)=>'WHEN '+value+' THEN '+index).join(' ')+' END';
            }
            return [...(n?[{text:','}]:[]),{kind:'expression',text:rendered+(descending?' DESC NULLS LAST':' ASC NULLS FIRST')}];
        });
        list.splice(i+2,end-i-2,...rewritten);i+=rewritten.length+1;
    }
    return list;
}
function expressions(list, incoming = false) {
    const out=[];
    for(let i=0;i<list.length;i++) {
        const t=list[i],name=upper(t);
        if(t.kind==='word' && list[i+1]?.text==='(') {
            const end=close(list,i+1),args=split(list.slice(i+2,end)).map(arg=>expressions(arg,incoming)),a=args.map(render);
            let value;
            if(name==='IF') value='(CASE WHEN '+(a[0].match(/^[\w.$]+$/)?'COALESCE('+a[0]+',0)<>0':a[0])+' THEN '+a[1]+' ELSE '+a[2]+' END)';
            else if(name==='IFNULL') value='COALESCE('+a.join(',')+')';
            else if(name==='UTC_TIMESTAMP') value="(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')";
            else if(name==='NOW') value='LOCALTIMESTAMP';
            else if(name==='CURDATE') value='CURRENT_DATE';
            else if(name==='DATE_ADD'||name==='DATE_SUB') {
                const interval=a[1].match(/^INTERVAL\s+(.+?)\s+(DAY|HOUR|MINUTE|SECOND|MONTH|YEAR)$/i);
                if(!interval)throw Error('Intervalo SQL não suportado: '+a[1]);
                value='(CAST('+a[0]+" AS timestamp) "+(name==='DATE_SUB'?'-':'+')+' ('+interval[1]+") * INTERVAL '1 "+interval[2]+"')";
            }
            else if(name==='DATE_FORMAT'||name==='TIME_FORMAT') {
                const format=args[1]?.[0]?.value;
                if(format===undefined)throw Error('Formato de data deve ser literal.');
                const formats={'%Y':'YYYY','%m':'MM','%d':'DD','%H':'HH24','%i':'MI','%s':'SS'};
                const pg=format.split(/(%[A-Za-z])/).map(part=>part.startsWith('%')
                    ? (formats[part] || (()=>{throw Error('Formato de data não suportado: '+part);})())
                    : part.replace(/[A-Za-z]+/g,s=>'"'+s+'"')).join('');
                value='TO_CHAR('+a[0]+", '"+pg.replaceAll("'","''")+"')";
            }
            else if(name==='FIND_IN_SET') value='COALESCE(array_position(string_to_array(CAST('+a[1]+' AS text),\',\'),CAST('+a[0]+' AS text)),0)';
            else if(name==='DATABASE') value='current_schema()';
            else if(name==='REGEXP_REPLACE') value='REGEXP_REPLACE('+a.join(',')+", 'g')";
            else if(name==='VALUES' && incoming) value='EXCLUDED.'+a[0];
            if(value!==undefined){out.push({kind:'expression',text:value});i=end;continue;}
            out.push(t,{text:'('},...args.flatMap((arg,n)=>n?[{text:','},...arg]:arg),{text:')'});i=end;continue;
        }
        out.push(t.kind==='word' && (name==='TRUE'||name==='FALSE')?{text:name==='TRUE'?'1':'0'}:name==='<=>'?{text:'IS NOT DISTINCT FROM'}:t);
    }
    return out;
}
function compile(sql,values=[],catalog={}) {
    let index=0;
    let list=tokens(sql);
    if(list.at(-1)?.text===';')list.pop();
    if(list.some(t=>t.text===';'))throw Error('Execute uma instrução SQL por chamada.');
    list=list.map(t=>t.kind==='param'?{kind:'parameter',text:'$'+(++index)}:t);
    if(index!==values.length)throw Error('Quantidade de parâmetros SQL divergente.');
    const first=upper(list[0]);
    if(first==='SHOW')throw Error('Introspecção deve usar o catálogo PostgreSQL.');
    let table,insertColumns=[],ignore=false;
    if(first==='INSERT') {
        ignore=upper(list[1])==='IGNORE';if(ignore)list.splice(1,1);
        const into=list.findIndex(t=>upper(t)==='INTO');table=list[into+1]?.text.replaceAll('"','');
        if(list[into+2]?.text==='(')insertColumns=split(list.slice(into+3,close(list,into+2))).map(part=>part[0].text.replaceAll('"',''));
    }
    // Nunca modificar literais: apenas tokens de parâmetros e palavras SQL.
    list=list.map((t,i,all)=>t.kind==='parameter' && upper(all[i+1])==='IS'
        ? {...t,text:'CAST('+t.text+' AS text)'} : upper(t)==='LIKE'?{...t,text:'ILIKE'}:t);
    const duplicate=list.findIndex((t,i)=>upper(t)==='ON'&&upper(list[i+1])==='DUPLICATE'&&upper(list[i+2])==='KEY'&&upper(list[i+3])==='UPDATE');
    const updateTokens=duplicate>=0?list.splice(duplicate).slice(4):null;
    list=ordering(expressions(list),catalog);
    let text=render(list);
    if(updateTokens) {
        const spec=catalog[table];
        const conflict=[spec?.primary,...(spec?.unique||[])].find(key=>key?.length&&key.every(column=>insertColumns.includes(column)));
        if(!conflict)throw Error('Destino de conflito não declarado para '+table);
        const assignments=split(updateTokens).map(part=>{
            const eq=part.findIndex(t=>t.text==='='),name=part[0].text;
            const rhs=expressions(part.slice(eq+1),true).map((t,n,all)=>t.kind==='word' && spec.columns?.some(c=>c.name===t.text) && all[n-1]?.text!=='.'?{...t,text:table+'.'+t.text}:t);
            return name+' = '+render(rhs);
        });
        text+=' ON CONFLICT ('+conflict.join(',')+') DO UPDATE SET '+assignments.join(',');
    } else if(ignore) text+=' ON CONFLICT DO NOTHING';
    // As três operações de junção são fixas e preservam o predicado da junção.
    text=text.replace(/^UPDATE (\w+) (\w+) JOIN (\w+) (\w+) ON (.+?) SET (.+?) WHERE ([\s\S]+)$/i,(_,t,a,j,b,on,set,where)=>'UPDATE '+t+' '+a+' SET '+set.replace(new RegExp('\\b'+a+'\\s*\\.\\s*','g'),'')+' FROM '+j+' '+b+' WHERE ('+on+') AND ('+where+')');
    text=text.replace(/^DELETE (\w+) FROM (\w+) \1 JOIN (\w+) (\w+) ON (.+?) WHERE ([\s\S]+)$/i,(_,a,t,j,b,on,where)=>'DELETE FROM '+t+' '+a+' USING '+j+' '+b+' WHERE ('+on+') AND ('+where+')');
    if(first==='SELECT' && / FOR (UPDATE|SHARE)$/.test(text) && /\bLEFT JOIN\b/.test(text)) {
        const from=list.findIndex(t=>upper(t)==='FROM');
        const base=list[from+1]?.text,alias=list[from+2]?.text;
        if(!base||!alias||['LEFT','WHERE','JOIN'].includes(alias.toUpperCase()))throw Error('Defina o alvo da trava na consulta externa.');
        text+=' OF '+alias;
    }
    // Não devolver hashes, tokens ou binários ao implementar insertId.
    if(first==='INSERT')text+=' RETURNING '+(catalog[table]?.identity || '1 AS arcadia_inserted');
    return {text,values:values.map(v=>typeof v==='boolean'?Number(v):v instanceof Date?dateValue(v):v),table,command:first};
}
module.exports={expressions,compile,dateValue};
