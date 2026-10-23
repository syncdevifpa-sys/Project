// Ilustrações SVG de interface, com tokens reais e dados inteiramente demonstrativos.
// Não inicia servidor, consulta API/banco ou altera fotos de usuários.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '../front');
const tokens = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8').split("[data-theme='dark']")[0];
const color = (name) => tokens.match(new RegExp('--' + name + ':\\s*(#[a-f0-9]+)', 'i'))[1];
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect = (x,y,w,h,fill,r=16) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const text = (x,y,s,size=16,fill=color('ink'),weight=400) => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(s)}</text>`;
const pill = (x,y,s,fill=color('surface-sunken'),w=130) => rect(x,y,w,32,fill,16)+text(x+13,y+21,s,13);
const line = (x,y,w) => `<path d="M${x} ${y}h${w}" stroke="${color('line')}"/>`;
function icon(name,x,y,size=20) {
    const shapes = {
        menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
        folder:'<path d="M3 7h6l2 2h10v11H3zM3 7V4h6l2 3"/>',
        calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
        grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
    };
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[name] || shapes.grid}</svg>`;
}
function shell(title,accent,body,logo) {
    let nav = rect(18,18,222,764,color('surface'),28)+text(40,58,'Portal Arcádia',19,color('ink'),600);
    const entries = ['Início','Meu painel','Avisos e notícias','Projetos','Documentos','Calendário','Tarefas','Turmas'];
    entries.forEach((label,i)=>{
        const y=110+i*57, active=label===title;
        if(active)nav+=rect(30,y-25,198,44,color('surface-sunken'),12);
        nav+=icon(label==='Calendário'?'calendar':label==='Documentos'?'folder':'grid',44,y-15,18)+text(76,y,label,15,color('ink'),active?600:400);
    });
    nav+=line(40,598,180)+text(44,633,'Configurações',14,color('ink-muted'));
    return rect(0,0,1280,800,color('canvas'),0)+nav+
        rect(260,18,1002,74,color('surface'),37)+`<image x="282" y="31" width="46" height="46" href="${logo}"/>`+
        text(342,51,'Arcádia',21)+text(342,72,'IFPA Campus Belém',12,color('ink-muted'))+
        pill(1025,38,'Demonstração',color('surface-sunken'),210)+
        rect(276,120,970,156,accent,26)+text(304,178,title,38,color('ink'),500)+
        text(304,216,'Organize sua rotina e acompanhe a comunidade acadêmica.',17)+body+
        text(280,776,'Dados demonstrativos · ilustração da interface',13,color('ink-muted'));
}
function cards(rows,accent) {
    let out='';
    rows.forEach(([title,desc],i)=>{
        const x=276+i*328;
        out+=rect(x,354,314,330,color('surface'),22)+rect(x+18,372,278,110,accent,14)+
            icon('grid',x+40,405,42)+pill(x+18,500,'Exemplo',color('surface-sunken'),95)+text(x+18,557,title,21,color('ink'),600)+
            text(x+18,592,desc,14,color('ink-muted'))+text(x+18,650,'Abrir detalhes →',15);
    });
    return out;
}
async function main() {
    const image = await loadImage(path.join(root,'assets/arcadia-emblem.png'));
    const c=createCanvas(64,64);c.getContext('2d').drawImage(image,0,0,64,64);
    const logo='data:image/png;base64,'+c.toBuffer('image/png').toString('base64');
    const screens={};
    screens['notices']=shell('Avisos e notícias',color('cyan'),pill(276,300,'Avisos e notícias',color('surface'),180)+pill(468,300,'Todos os públicos',color('surface'),185)+pill(1028,300,'Quadro · Tabela · Lista',color('surface'),218)+cards([
        ['Boas-vindas ao portal','Publicação demonstrativa'],['Atividades do campus','Notícia demonstrativa'],['Orientações acadêmicas','Aviso demonstrativo']],color('cyan-soft')),logo);
    let docs=pill(276,300,'Minha biblioteca',color('surface'),170)+pill(460,300,'Documentos públicos',color('surface'),195)+pill(1015,300,'Nova pasta +',color('surface'),170);
    [['Disciplinas','Pasta pessoal'],['Materiais de estudo','Pasta pessoal'],['Projeto de exemplo','Pasta pessoal']].forEach(([name,hint],i)=>{
        const x=276+i*328;docs+=rect(x,358,314,134,color('surface'),20)+icon('folder',x+20,380,32)+text(x+20,438,name,19,color('ink'),600)+text(x+20,466,hint,13,color('ink-muted'));
    });
    docs+=rect(276,520,970,160,color('surface'),20)+text(300,557,'Documentos da biblioteca',22,color('ink'),600)+line(300,575,920)+text(300,611,'Roteiro de estudos.pdf',17)+text(300,644,'Exemplo de arquivo · visibilidade pessoal',14,color('ink-muted'));
    screens['documents']=shell('Documentos',color('pink'),docs,logo);
    let cal=pill(276,300,'Público',color('surface'),110)+pill(396,300,'Pessoal',color('surface'),110)+pill(1015,300,'Mês · Lista',color('surface'),190)+rect(276,352,970,360,color('surface'),20)+text(300,389,'Outubro 2026',24,color('ink'),600);
    ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].forEach((d,i)=>{cal+=text(302+i*134,426,d,13,color('ink-muted'));});
    for(let row=0;row<5;row++)for(let col=0;col<7;col++){
        const n=row*7+col-3,x=292+col*134,y=446+row*48;
        if(n<1 || n>31) continue;
        cal+=rect(x,y,125,44,color('surface-sunken'),8)+text(x+10,y+21,String(n),13);
        if([5,12,19].includes(n))cal+=rect(x+7,y+25,110,16,[color('cyan'),color('pink'),color('lime')][[5,12,19].indexOf(n)],4)+text(x+12,y+37,'Evento · exemplo',10);
    }
    screens['calendar']=shell('Calendário',color('cyan'),cal,logo);
    screens['projects']=shell('Projetos',color('yellow'),pill(276,300,'Todos os projetos',color('surface'),180)+pill(470,300,'Pesquisa',color('surface'),125)+pill(610,300,'Extensão',color('surface'),125)+cards([
        ['Tecnologia no campus','Projeto demonstrativo'],['Conhecimento em rede','Projeto demonstrativo'],['Ciência e comunidade','Projeto demonstrativo']],color('yellow-soft')),logo);
    let dash='';
    [['Avisos não lidos','3',color('cyan')],['Tarefas em aberto','2',color('yellow')],['Documentos em análise','1',color('pink')]].forEach(([label,value,bg],i)=>{
        const x=276+i*328;dash+=rect(x,304,314,174,bg,20)+text(x+20,343,label,16)+text(x+20,405,value,48,color('ink'),500)+text(x+20,449,'Ver detalhes →',14);
    });
    dash+=rect(276,506,970,206,color('surface'),22)+text(300,550,'Próximas datas',23,color('ink'),600)+line(300,571,920)+text(300,609,'Atividade de exemplo',18)+text(300,640,'Evento demonstrativo da agenda',14,color('ink-muted'));
    screens['hero']=shell('Meu painel',color('lime'),dash,logo);
    screens['mobile']=rect(0,0,390,844,color('canvas'),0)+rect(14,18,362,66,color('surface'),33)+icon('menu',32,40,23)+`<image x="72" y="28" width="44" height="44" href="${logo}"/>`+text(126,55,'Arcádia',22)+
        rect(18,106,354,182,color('lime'),24)+text(38,151,'Meu painel',32,color('ink'),500)+text(38,188,'Olá, estudante',20)+text(38,221,'Conta de demonstração',15)+pill(38,241,'Dados demonstrativos',color('surface'),235)+
        rect(18,310,354,139,color('cyan'),20)+text(38,347,'Avisos não lidos',16)+text(38,395,'3',39)+text(38,425,'Ver avisos →',14)+
        rect(18,465,354,139,color('yellow'),20)+text(38,502,'Tarefas em aberto',16)+text(38,549,'2',39)+text(38,579,'Ver tarefas →',14)+
        rect(18,622,354,169,color('surface'),20)+text(38,660,'Próximas datas',22,color('ink'),600)+text(38,701,'Atividade de exemplo',17)+text(38,732,'Agenda pessoal e pública',14,color('ink-muted'))+text(24,823,'Ilustração · sem dados reais',13,color('ink-muted'));
    const dir=path.join(root,'illustrations/product');fs.mkdirSync(dir,{recursive:true});
    for(const [name,body] of Object.entries(screens)){
        const mobile=name==='mobile',w=mobile?390:1280,h=mobile?844:800;
        fs.writeFileSync(path.join(dir,name+'.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>Arcádia · ${name} · dados demonstrativos</title><g font-family="Segoe UI, Arial, sans-serif" fill="${color('ink')}" color="${color('ink')}">${body}</g></svg>\n`);
    }
    console.log('Seis mockups SVG gerados offline com tokens reais e dados demonstrativos.');
}
main().catch((e)=>{console.error(e.message);process.exitCode=1;});
