/* Leitura de SQL preservando literais, identificadores, comentários e parâmetros. */
function tokens(sql) {
    const out=[];
    for(let i=0;i<sql.length;) {
        const rest=sql.slice(i); let match;
        if ((match=/^\s+/.exec(rest))) { i+=match[0].length; continue; }
        if(rest.startsWith('--') || rest.startsWith('#')) { const end=sql.indexOf('\n',i); i=end<0?sql.length:end+1; continue; }
        if(rest.startsWith('/*')) { const end=sql.indexOf('*/',i+2); if(end<0) throw Error('Comentário SQL incompleto.'); i=end+2; continue; }
        if (['\'', '"', String.fromCharCode(96)].includes(sql[i])) {
            const quote=sql[i],start=i++; let value=''; let closed=false;
            while(i<sql.length) {
                if(sql[i]===quote) { if(sql[i+1]===quote) { value+=quote; i+=2; continue; } i++;closed=true;break; }
                if(sql[i]==='\\' && quote!==String.fromCharCode(96)) { const c=sql[++i];value+=({n:'\n',r:'\r',t:'\t','0':'\0'}[c]??c);i++; }
                else value+=sql[i++];
            }
            if(!closed) throw Error('Literal SQL incompleto.');
            out.push({kind:quote===String.fromCharCode(96)?'identifier':'string',text:quote===String.fromCharCode(96)?'"'+value.replaceAll('"','""')+'"':"'"+value.replaceAll("'","''")+"'",value});continue;
        }
        if((match=/^(?:\$\d+|[A-Za-z_][A-Za-z_0-9$]*|\d+(?:\.\d+)?|<=>|<>|!=|<=|>=|\|\||::|.)/.exec(rest))) {
            const text=match[0]; out.push({kind:/^[A-Za-z_]/.test(text)?'word':text==='?'?'param':'symbol',text});i+=text.length;
        } else throw Error('SQL não reconhecido.');
    }
    return out;
}
const render=list=>list.map(t=>typeof t==='string'?t:t.text).join(' ');
function split(list, separator=',') {
    const result=[];let depth=0,start=0;
    list.forEach((t,i)=>{if(t.text==='(')depth++;if(t.text===')')depth--;if(depth===0 && t.text===separator){result.push(list.slice(start,i));start=i+1;}});
    result.push(list.slice(start));return result.filter(x=>x.length);
}
function close(list,start) { let depth=0;for(let i=start;i<list.length;i++){if(list[i].text==='(')depth++;if(list[i].text===')' && --depth===0)return i;}throw Error('Parênteses SQL incompletos.'); }
module.exports={tokens,render,split,close};
