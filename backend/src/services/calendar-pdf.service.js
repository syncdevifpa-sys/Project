const path=require('path');
const crypto=require('crypto');
const colors=require('./calendar-colors.service');
const MONTHS=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function fail(status,message){throw Object.assign(new Error(message),{status});}
function date(day,month,year){if(!month||!year)return '';const value=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;return Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:'';}
function parseLine(text,{month,year}={}){
    const line=String(text).trim();let match,start,end,title,warning=[],requiresEnd=false;
    match=line.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}))?(?:\s*(?:a|até|–|-)\s*(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}))?)?\s*(?:[-–—:|]\s*)?(.+)$/i);
    if(match){requiresEnd=Boolean(match[4]);start=date(+match[1],+match[2],+(match[3]||year));end=match[4]?date(+match[4],+match[5],+(match[6]||match[3]||year)):'';title=match[7];if(!match[3])warning.push('Ano confirmado no formulário aplicado à data sem ano.');}
    else{
        match=line.match(/^(\d{1,2})(?:\s*(a|até|e)\s*(\d{1,2}))?\s+de\s+([a-zÀ-ÿ]+)(?:\s+de\s+(\d{4}))?\s*[-–—:|]?\s*(.+)$/i);
        if(match&&MONTHS.includes(normalize(match[4]))){const m=MONTHS.indexOf(normalize(match[4]))+1;start=date(+match[1],m,+(match[5]||year));end=match[3]?date(+match[3],m,+(match[5]||year)):'';title=match[6];if(!match[5])warning.push('Ano confirmado no formulário aplicado à data sem ano.');if(normalize(match[2])==='e')warning.push('Datas distintas, não um intervalo: crie eventos separados após conferir.');}
        else{match=line.match(/^(\d{1,2})(?:\s*(a|até|e)\s*(\d{1,2}))?\s*[-–—]\s*(.+)$/i);if(!match)return null;start=date(+match[1],month,year);end=match[3]?date(+match[3],month,year):'';title=match[4];warning.push(month?'Mês obtido do cabeçalho da coluna; confira no PDF.':'Mês não identificado. Preencha a data manualmente.');if(normalize(match[2])==='e')warning.push('Datas distintas, não um intervalo: crie eventos separados após conferir.');}
    }
    if(match?.[3]&&/\d\s+(?:a|até)\s+\d/i.test(line))requiresEnd=true;
    if(!/[a-zÀ-ÿ]{3}/i.test(title||''))return null;
    if(warning.some(value=>value.startsWith('Datas distintas'))){start='';end='';}
    if(!start)warning.push('Data inicial inválida ou incompleta.');
    if(end&&start&&end<start){end='';warning.push('Fim anterior ao início; mudança de mês/ano não foi inferida.');}
    if(requiresEnd&&!end){start='';warning.push('Período incompleto: preencha início e fim antes de importar.');}
    if(match?.[3]&&!end&&/\d\s+(?:a|até)\s+\d/i.test(line))warning.push('Confira o fim do período.');
    return {titulo:title.trim(),data_evento:start,data_fim:end||null,requiresEnd,warning};
}
function lines(items){
    const rows=[];for(const item of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){if(!item.text.trim())continue;let row=rows.find(row=>Math.abs(row.y-item.y)<2);if(!row){row={y:item.y,items:[]};rows.push(row);}row.items.push(item);}
    return rows.sort((a,b)=>b.y-a.y).map(row=>{let text='',end=null;for(const item of row.items.sort((a,b)=>a.x-b.x)){if(end!==null&&item.x-end>.9&&!text.endsWith(' ')&&!item.text.startsWith(' '))text+=' ';text+=item.text;end=Math.max(end??0,item.x+item.width);}return text.replace(/\s+/g,' ').trim();});
}
function candidatesFromPages(pages,{year,level}){
    const candidates=[],unparsed=[],warnings=[];let currentLevel='geral',columnWidth=null,lastMonth=0,contextYear=year;
    for(const page of pages){
        const heading=page.items.find(item=>/^(educacao basica(?: e profissional)?|(?:ensino de )?graduacao|pos[- ]graduacao)$/.test(normalize(item.text)));
        if(heading){const levelName=normalize(heading.text).includes('basica')?'basica':normalize(heading.text).startsWith('pos')?'pos':'graduacao';if(levelName!==currentLevel){lastMonth=0;contextYear=year;}currentLevel=levelName;}
        if(currentLevel!=='geral'&&currentLevel!==level)continue;
        if(page.items.some(item=>normalize(item.text).includes('minuta'))&&!warnings.includes('O PDF contém a palavra MINUTA. Confira a resolução e a versão antes de importar.'))warnings.push('O PDF contém a palavra MINUTA. Confira a resolução e a versão antes de importar.');
        const anchors=page.items.map(item=>{
            const match=normalize(item.text).match(/^([a-z]+)(?:\s*\/\s*(\d{4}))?$/);if(!match||!MONTHS.includes(match[1]))return null;
            const right=page.items.filter(other=>Math.abs(other.y-item.y)<2&&other.x>=item.x+item.width-1&&other.x<item.x+item.width+65).sort((a,b)=>a.x-b.x);
            const suffix=right.map(other=>other.text).join('').replace(/\s/g,'').match(/^\/?(20\d{2})/);const explicitYear=Number(match[2]||suffix?.[1])||null;
            const tail=right.filter(other=>other.text.trim()).at(-1);const width=explicitYear&&tail?Math.max(item.width,tail.x+tail.width-item.x):item.width;
            return {...item,width,month:MONTHS.indexOf(match[1])+1,explicitYear,center:item.x+width/2};
        }).filter(Boolean);
        const bands=[];for(const anchor of anchors.sort((a,b)=>b.y-a.y||a.x-b.x)){let band=bands.find(band=>Math.abs(band.y-anchor.y)<3);if(!band){band={y:anchor.y,anchors:[]};bands.push(band);}band.anchors.push(anchor);}
        const groups=[];
        for(let index=0;index<bands.length;index++){const band=bands[index],bottom=bands[index+1]?.y??-Infinity;band.anchors.sort((a,b)=>a.x-b.x);if(band.anchors.length>1)columnWidth=band.anchors[1].center-band.anchors[0].center;const cols=band.anchors.map(anchor=>({anchor,items:[]}));
            for(const item of page.items.filter(item=>item.y<band.y-3&&item.y>bottom+3)){const center=item.x+item.width/2;let col=cols[0];for(const other of cols)if(Math.abs(other.anchor.center-center)<Math.abs(col.anchor.center-center))col=other;if(cols.length===1&&columnWidth&&Math.abs(col.anchor.center-center)>columnWidth*.65){if(/\d[/.]\d/.test(item.text))unparsed.push({page:page.number,text:item.text});continue;}col.items.push(item);}
            for(const col of cols){if(col.anchor.explicitYear)contextYear=col.anchor.explicitYear;else if(lastMonth&&col.anchor.month<lastMonth)contextYear=null;lastMonth=col.anchor.month;groups.push({lines:lines(col.items),month:col.anchor.month,year:contextYear});}
        }
        const above=page.items.filter(item=>!bands.length||item.y>bands[0].y+3);if(above.length)groups.unshift({lines:lines(above),month:null,year});
        for(const group of groups){let candidate=null;
            for(const line of group.lines){if(/^(dias letivos|total de dias|legendas|mec|instituto|campus)/i.test(normalize(line))){candidate=null;continue;}const parsed=parseLine(line,group);if(parsed){candidate={...parsed,page:page.number,sourceText:line,level:currentLevel,reviewed:false};if(currentLevel==='geral')candidate.warning.push('Modalidade não identificada nesta página: confirme a correspondência.');if(parsed.data_evento&&+parsed.data_evento.slice(0,4)!==year)candidate.warning.push('Data fora do ano escolhido: confira a transição de ano.');candidates.push(candidate);}
                else if(candidate&&!/^(dias letivos|total de dias|legendas|mec|instituto|campus|[\d\s]+$)/i.test(normalize(line))&&/[a-zÀ-ÿ]/i.test(line)){candidate.titulo+=' '+line;candidate.sourceText+=' '+line;}
                else if(/\d[/.]\d|\d\s*(?:a|até|–|-)\s*\d/.test(line)&&/[a-zÀ-ÿ]/i.test(line))unparsed.push({page:page.number,text:line});
            }
        }
    }
    if(candidates.length>300)fail(422,'Mais de 300 candidatos encontrados. Divida o PDF por modalidade ou período.');
    for(const item of candidates){if(item.titulo.length>150){item.warning.push('Título longo: revise e reduza antes de importar.');}item.sourceText=item.sourceText.slice(0,2000);}
    if(!candidates.length)warnings.push('Nenhuma data reconhecida com descrição. Confira o texto e adicione eventos manualmente.');
    if(unparsed.length>100)warnings.push('Somente os primeiros 100 trechos não reconhecidos são exibidos. Confira o PDF completo.');
    return {candidates,unparsed:unparsed.slice(0,100),warnings};
}
async function extractCalendarPdf(buffer,metadata){
    if(!Buffer.isBuffer(buffer)||buffer.length>4*1024*1024||buffer.length<8||buffer.subarray(0,5).toString()!=='%PDF-')fail(400,'Envie um PDF válido de até 4 MB.');
    const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const fonts=path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts').replace(/\\/g,'/')+'/';
    const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:false,disableAutoFetch:true,disableStream:true,stopAtErrors:false,standardFontDataUrl:fonts,maxImageSize:0,verbosity:0});
    let timer;try{
        const doc=await Promise.race([task.promise,new Promise((_,reject)=>{timer=setTimeout(()=>{task.destroy();reject(Object.assign(new Error('O PDF demorou demais para ser lido. Divida o arquivo.'),{status:422}));},15000);})]);
        if(doc.numPages>30)fail(422,'Limite de 30 páginas. Divida o PDF por calendário.');const pages=[];let count=0;
        for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),content=await page.getTextContent();const items=content.items.filter(item=>typeof item.str==='string').map(item=>({text:item.str,x:item.transform[4],y:item.transform[5],width:item.width,height:Math.abs(item.transform[3])}));count+=items.reduce((sum,item)=>sum+item.text.length,0);if(count>500000)fail(422,'Texto muito extenso. Divida o PDF.');const fills=colors.filledRectangles(await page.getOperatorList(),pdfjs.OPS);pages.push({number:n,items,fills});}
        if(count<40)fail(422,'PDF sem texto selecionável. OCR não está disponível: use uma versão com texto ou cadastre os eventos manualmente.');
        const text=pages.flatMap(page=>lines(page.items)).join(' ');
        const years=[...new Set([...normalize(text).matchAll(/calendarios? academicos?\s+(?:de\s+)?(20\d{2})/g)].map(match=>Number(match[1])))];
        if(years.length>1)fail(422,'O PDF reúne calendários de anos diferentes. Divida o arquivo por ano antes de importar.');
        if(years.length===1&&years[0]!==metadata.year)fail(400,`O PDF identifica calendário acadêmico ${years[0]}. Confirme esse ano no formulário; as datas não foram convertidas para ${metadata.year}.`);
        const reference=(text.match(/RESOLU[ÇC][ÃA]O\s+CONSUP\/IFPA\s+N[º°O]?\s*\d+,?\s+DE\s+\d{1,2}\s+DE\s+[a-zÀ-ÿ]+\s+DE\s+\d{4}/i)||text.match(/RESOLU[ÇC][ÃA]O\s+CONSUP\/IFPA\s+N[º°O]?\s*\d+/i))?.[0]?.trim()||'';
        const parsed=candidatesFromPages(pages,metadata);
        parsed.colorAnalysis=colors.extractColoredDays(pages,metadata);
        colors.mergeColorCandidates(parsed,parsed.colorAnalysis);
        if(!years.length)parsed.warnings.push('Ano do calendário não reconhecido no cabeçalho. Confirme o ano escolhido diretamente no PDF.');
        if(!normalize(text).includes('campus belem'))parsed.warnings.push('Campus Belém não identificado no texto: confirme a origem do documento.');
        return {...parsed,detected:{years,reference,campus:normalize(text).includes('campus belem')?'Belém':null},pages:pages.length,hash:crypto.createHash('sha256').update(buffer).digest('hex')};
    }catch(error){if(error.status)throw error;fail(422,error.name==='PasswordException'?'PDF protegido por senha. Envie uma cópia sem proteção.':'Não foi possível ler este PDF. Use uma versão com texto selecionável.');}
    finally{clearTimeout(timer);await task.destroy();}
}
module.exports={extractCalendarPdf,candidatesFromPages,parseLine,normalize};

