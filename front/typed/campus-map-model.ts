// Planta esquemática adaptada da referência de 2025 fornecida pela equipe.
(function () {
    type Kind = 'bloco' | 'espaco' | 'acesso' | 'pendente';
    type Place = { id: string; name: string; label: string; kind: Kind; x: number; y: number; path: string; notes: string[]; source: 'planta-2025' | 'equipe'; references?: { title: string; url: string }[]; dashed?: boolean };
    type View = { x: number; y: number; width: number; height: number };
    const bounds: View = { x: 0, y: 0, width: 800, height: 1580 };
    const places: Place[] = [
        {id:'a',name:'Bloco A · Auditório Central e Design',label:'A',kind:'bloco',x:320,y:1398,path:'M190 1375H455V1422H190Z',notes:['Auditório Central no térreo; Design no 1º andar, conforme confirmação da equipe.','Recepção e Diretoria no térreo do conjunto A/B; a distribuição desses setores entre os blocos ainda precisa ser confirmada.'],source:'equipe'},
        {id:'b',name:'Bloco B',label:'B',kind:'bloco',x:320,y:1307,path:'M190 1280H455V1335H190Z',notes:['Recepção e Diretoria no térreo do conjunto A/B; a distribuição desses setores entre os blocos ainda precisa ser confirmada.'],source:'equipe'},
        {id:'c',name:"Bloco C · ADS e Informática",label:'C',kind:'bloco',x:552,y:1370,path:'M510 1268H588V1325H612V1435H510Z',notes:["Laboratórios de Análise e Desenvolvimento de Sistemas (ADS) no térreo, conforme informação da equipe.", "Laboratórios de Química no 1º andar do conjunto C/D; distribuição entre os blocos a confirmar.", "Publicação oficial de 09/06/2026 identifica os laboratórios de Informática 02 e 05 no bloco C; não informa o andar."],source:'equipe',references:[{"title": "IFPA · Workshop PETRVS (09/06/2026): laboratórios 02 e 05, bloco C", "url": "https://belem.ifpa.edu.br/publicacoes/3086-ifpa-campus-belem-promove-workshop-petrvs-para-fortalecimento-da-gestao-institucional"}]},
        {id:'d',name:"Bloco D · Física e Química",label:'D',kind:'bloco',x:644,y:1370,path:'M615 1268H670V1435H615Z',notes:["Laboratórios de Física no térreo, conforme informação da equipe.", "Laboratórios de Química no 1º andar do conjunto C/D; distribuição entre os blocos a confirmar."],source:'equipe'},
        {id:'e',name:"Bloco E · DRIA, DEN e laboratórios",label:'E',kind:'bloco',x:631,y:1140,path:'M595 1038H667V1243H595Z',notes:["DRIA, Diretoria de Ensino (DEN) e sala de descanso dos professores no 1º andar, conforme informação da equipe.", "Laboratórios de Telecomunicações, Eletrotécnica e Eletrônica: indicação da equipe para o 1º e 2º andares, a confirmar.", "DRIA: Departamento de Registros e Indicadores Acadêmicos. Atende matrículas, documentos acadêmicos, aproveitamento de estudos, transferências, certificações e diplomas. A página oficial confirma os serviços, mas não a localização."],source:'equipe',references:[{"title": "IFPA · Secretaria Acadêmica: serviços da DRIA", "url": "https://belem.ifpa.edu.br/secretaria-academica"}]},
        {id:'f',name:'Bloco F · Biblioteca',label:'F',kind:'bloco',x:500,y:1136,path:'M435 1038H548V1100L572 1115V1170L560 1205L530 1215V1235H485V1218H455V1110H435Z',notes:['Biblioteca indicada na referência de 2025.'],source:'planta-2025'},
        {id:'g',name:"Bloco G · Recursos Pesqueiros e Aquicultura",label:'G',kind:'bloco',x:631,y:925,path:'M595 825H667V1023H595Z',notes:["Recursos Pesqueiros e Aquicultura no conjunto G/S, conforme indicação da equipe; distribuição das salas e andares a confirmar."],source:'equipe'},
        {id:'g1',name:'Bloco G1',label:'G1',kind:'bloco',x:692,y:968,path:'M679 928H705V1007H679Z',notes:['Bloco identificado na planta de referência.'],source:'planta-2025'},
        {id:'g2',name:'Bloco G2',label:'G2',kind:'bloco',x:692,y:866,path:'M679 828H705V904H679Z',notes:['Bloco identificado na planta de referência.'],source:'planta-2025'},
        {id:'h',name:'Bloco H · Salas multiuso',label:'H',kind:'bloco',x:250,y:1211,path:'M99 1183H406V1241H99Z',notes:['Salas multiuso indicadas na referência de 2025.'],source:'planta-2025'},
        {id:'i',name:'Bloco I',label:'I',kind:'bloco',x:250,y:1146,path:'M99 1120H406V1171H99Z',notes:['Posição e contorno aproximados conforme a referência de 2025.'],source:'planta-2025',dashed:true},
        {id:'j',name:"Bloco J · Localização de setores a conferir",label:'J',kind:'bloco',x:250,y:1080,path:'M99 1044H406V1115H99Z',notes:["Ambulatório indicado neste bloco pela equipe; localização a confirmar diante da divergência com a publicação institucional.", "Notícia oficial de 14/02/2025 registra a inauguração do bloco J do Campus Belém com 24 laboratórios de Eletrônica e Eletrotécnica, sala de automação, miniauditório e seis salas de aula. Não confirma a localização do ambulatório nem os andares."],source:'equipe',references:[{"title": "IFPA · Inauguração do bloco J do Campus Belém (14/02/2025)", "url": "https://conceicaodoaraguaia.ifpa.edu.br/ultimas-noticias/989-presidente-lula-assina-ordem-de-servico-para-construcao-de-tres-novos-campi-do-ifpa"}]},
        {id:'l',name:'Bloco L',label:'L',kind:'bloco',x:250,y:958,path:'M99 928H406V989H99Z',notes:['Contorno tracejado na planta de referência.'],source:'planta-2025',dashed:true},
        {id:'m',name:"Bloco M · Miniauditório e áreas acadêmicas",label:'M',kind:'bloco',x:245,y:823,path:'M65 788H406V858H270V908H210V866H193V913H100V866H65Z',notes:["Miniauditório no 2º andar, conforme informação da equipe.", "Webconferência e laboratório de informática indicados na referência de 2025.", "Agrimensura, Geografia e Cartografia no conjunto N/M; distribuição entre blocos e andares a confirmar."],source:'equipe'},
        {id:'n',name:"Bloco N · Agrimensura, Geografia e Cartografia",label:'N',kind:'bloco',x:245,y:705,path:'M65 650H195V663H242V674H406V728H242V744H265V779H65Z',notes:["Agrimensura, Geografia e Cartografia no conjunto N/M, conforme indicação da equipe; distribuição entre blocos e andares a confirmar."],source:'equipe'},
        {id:'n1',name:'Bloco N1',label:'N1',kind:'bloco',x:430,y:700,path:'M419 671H441V729H419Z',notes:['Bloco identificado na planta de referência.'],source:'planta-2025'},
        {id:'o',name:'Bloco O · Salas de aula',label:'O',kind:'bloco',x:495,y:725,path:'M460 632H530V818H460Z',notes:['Salas de aula nos blocos O e P, conforme informação da equipe.'],source:'equipe'},
        {id:'p',name:'Bloco P · Salas de aula',label:'P',kind:'bloco',x:640,y:771,path:'M578 733H703V809H578Z',notes:['Salas de aula nos blocos O e P, conforme informação da equipe.'],source:'equipe'},
        {id:'q',name:"Bloco Q · Ginásio e lutas",label:'Q',kind:'bloco',x:263,y:601,path:'M124 458H404V620H124Z M183 495V593H381V495Z',notes:["Ginásio no térreo; sala de lutas e hall de troféus no 1º andar, conforme informação da equipe."],source:'equipe'},
        {id:'q1',name:'Bloco Q1',label:'Q1',kind:'bloco',x:81,y:537,path:'M65 502H97V573H65Z',notes:['Bloco identificado na planta de referência.'],source:'planta-2025'},
        {id:'r',name:"Bloco R · Refeitório",label:'R',kind:'bloco',x:502,y:469,path:'M471 437H540V588H492V566H483V521H471Z M419 595H444V657H419Z',notes:["Refeitório ao lado do bloco S, conforme informação da equipe; a planta de 2025 o indica junto ao conjunto R."],source:'equipe'},
        {id:'s',name:"Bloco S · Biologia e áreas aquícolas",label:'S',kind:'bloco',x:581,y:540,path:'M550 434H578V466H612V621H550Z',notes:["Salas de Biologia e Microscopia no conjunto S/T, conforme informação da equipe; distribuição entre os blocos e andares a confirmar.", "Recursos Pesqueiros e Aquicultura no conjunto G/S; distribuição das salas e andares a confirmar.", "Refeitório ao lado deste bloco."],source:'equipe'},
        {id:'t',name:"Bloco T · Biologia e Microscopia",label:'T',kind:'bloco',x:672,y:537,path:'M640 453H703V622H640Z',notes:["Salas de Biologia e Microscopia no conjunto S/T, conforme informação da equipe; distribuição entre os blocos e andares a confirmar."],source:'equipe'},
        {id:'u',name:'Bloco U',label:'U',kind:'bloco',x:354,y:391,path:'M334 357H373V424H334Z',notes:['Bloco identificado na planta de referência.'],source:'planta-2025'},
        {id:'v',name:"Bloco V · Eventos e dormitórios",label:'V',kind:'bloco',x:239,y:395,path:'M169 378H310V411H169Z',notes:["Espaço de eventos no térreo; dormitórios no 1º e 2º andares, conforme informação da equipe."],source:'equipe'},
        {id:'x',name:"Bloco X · Quadras e eventos",label:'X',kind:'bloco',x:273,y:230,path:'M173 126L193 116H373V345H193L173 336Z',notes:["Quadras de esportes; espaço também utilizado para eventos de grande porte, esportivos ou não, conforme informação da equipe.", "A planta de referência de 2025 representa duas quadras neste bloco."],source:'equipe'},
        {id:'z',name:"Bloco Z · Galpão de veículos",label:'Z',kind:'bloco',x:113,y:230,path:'M75 134H151V329H75Z',notes:["Galpão destinado à guarda de ônibus do instituto, conforme informação da equipe.", "Área de acesso restrito; consulte a administração para orientações de acesso."],source:'equipe'},
        {id:'campo',name:'Campo',label:'Campo',kind:'espaco',x:566,y:220,path:'M422 130H707V310H422Z',notes:['Campo representado na planta de referência.'],source:'planta-2025'},
        {id:'verde',name:'Área verde',label:'Área verde',kind:'espaco',x:507,y:950,path:'M421 830H587V1023H421Z',notes:['Área verde entre os blocos O/P, G e F, conforme marcação fornecida pela equipe. O contorno é esquemático.'],source:'equipe'},
        {id:'hidroponia',name:'Hidroponia',label:'Hidroponia',kind:'espaco',x:455,y:389,path:'M422 321H496V409H422Z',notes:['Hidroponia indicada na referência de 2025.'],source:'planta-2025'},
        {id:'adolfo',name:'Espaço Adolfo Santos',label:'Adolfo Santos',kind:'espaco',x:265,y:1350,path:'M190 1338H330V1365H190Z',notes:['Espaço indicado junto aos blocos A e B na referência de 2025.'],source:'planta-2025'},
        {id:'chico',name:'Espaço Chico Mendes',label:'Chico Mendes',kind:'espaco',x:393,y:1350,path:'M345 1338H455V1365H345Z',notes:['Espaço indicado junto aos blocos A e B na referência de 2025.'],source:'planta-2025'},
        {id:'pedestres',name:'Acesso de pedestres · Av. Almirante Barroso',label:'Pedestres',kind:'acesso',x:505,y:1480,path:'M475 1459H535V1500H475Z',notes:['Entrada de pedestres indicada na referência de 2025. Não representa rota de navegação.'],source:'planta-2025'},
        {id:'veiculos',name:'Acesso de veículos · Trav. Timbó',label:'Veículos',kind:'acesso',x:56,y:1305,path:'M43 1278H73V1333H43Z',notes:['Entrada de veículos indicada na referência de 2025.'],source:'planta-2025'},
        {id:'professores',name:"Matemática · Local a confirmar",label:'',kind:'pendente',x:0,y:0,path:'',notes:["Bloco e distribuição das salas de Matemática ainda precisam ser confirmados."],source:'equipe'},
    ];
    function search(query: string, kind = 'todos'): Place[] {
        const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
        const text=normalize(query);
        return places.filter(place=>(kind==='todos'||place.kind===kind||(kind==='pendente'&&place.notes.some(note=>/a confirmar|a conferir/.test(note))))&&normalize([place.name,...place.notes].join(' ')).includes(text));
    }
    function clamp(view: View): View {
        const width=Math.max(bounds.width/6,Math.min(bounds.width,view.width)),height=width*bounds.height/bounds.width;
        return {width,height,x:Math.max(0,Math.min(bounds.width-width,view.x)),y:Math.max(0,Math.min(bounds.height-height,view.y))};
    }
    function zoom(view: View, factor: number, point = {x:view.x+view.width/2,y:view.y+view.height/2}): View {
        if(!Number.isFinite(factor)||factor<=0)return clamp(view);
        const width=Math.max(bounds.width/6,Math.min(bounds.width,view.width/factor)),ratio=width/view.width;
        return clamp({x:point.x-(point.x-view.x)*ratio,y:point.y-(point.y-view.y)*ratio,width,height:width*bounds.height/bounds.width});
    }
    const api={bounds,places,search,clamp,zoom};
    const target=window as Window & {Arcadia?:{[key:string]:unknown;campusMapModel?:typeof api}};
    target.Arcadia=target.Arcadia||{};target.Arcadia.campusMapModel=api;
})();
