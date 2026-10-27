const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function model(){const A={};vm.runInNewContext(fs.readFileSync('front/js/campus-map-model.js','utf8'),{window:{Arcadia:A}});return A.campusMapModel;}
test('planta preserva blocos identificados e não atribui ponto a informações pendentes',()=>{
 const m=model(),ids=m.places.map(row=>row.id);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['a','b','c','d','e','f','g','g1','g2','h','i','j','l','m','n','n1','o','p','q','q1','r','s','t','u','v','x','z'])assert.ok(ids.includes(id));
 for(const row of m.places){if(row.kind==='pendente')assert.equal(row.path,'');else {assert.ok(row.path.startsWith('M'));assert.ok(row.x>=0&&row.x<=800&&row.y>=0&&row.y<=1580);}}
 assert.equal(m.search('DRIA')[0].id,'e');assert.equal(m.search('Telecomunicações')[0].id,'e');
 assert.deepEqual(Array.from(m.search('Design'),row=>row.id),['a']);assert.deepEqual(Array.from(m.search('Química'),row=>row.id),['c','d']);
 assert.deepEqual(Array.from(m.search('Auditório Central'),row=>row.id),['b']);
 assert.match(m.places.find(row=>row.id==='a').notes[1],/Design no 1º andar/);
 assert.equal(m.places.find(row=>row.id==='verde').path,'M421 830H587V1023H421Z');
 assert.equal(m.search('biblioteca')[0].id,'f');assert.ok(m.search('miniauditorio').some(row=>row.id==='f'));
 assert.equal(m.search('sala de lutas')[0].id,'q');assert.equal(m.search('inexistente').length,0);
});
test('zoom limita ampliação e deslocamento sem sair do campus nem mudar dados dos locais',()=>{
 const m=model(),before=JSON.stringify(m.places),view=m.zoom(m.bounds,2);assert.equal(view.width,400);assert.equal(view.height,790);assert.equal(view.x,200);
 const limit=m.zoom(view,100);assert.equal(limit.width,800/6);
 assert.equal(m.zoom(view,.01).width,800);assert.equal(m.clamp({...view,x:-300,y:99999}).x,0);assert.equal(m.clamp({...view,x:0,y:99999}).y,790);
 assert.equal(JSON.stringify(m.places),before);
});
function ui(){
 const A={campusMapModel:model(),auth:{getSessao:()=>({})}},ids=new Map();
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.value='';this.classList={add(){}};this.captures=new Set();}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  setAttribute(key,value){this.attrs[key]=value;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
  querySelectorAll(tag){return this.children.flatMap(child=>[...(child.tag===tag?[child]:[]),...child.querySelectorAll(tag)]);}
  closest(){return this.dataset.place?this:this.parent?.closest()||null;}
  addEventListener(type,fn){this.events[type]=fn;}
  focus(){this.focused=true;}click(){this.onclick?.();}
  setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
  getScreenCTM(){return {a:1,d:1,inverse:()=>({})};}createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};}
  emit(type,args={}){this.events[type]?.({target:this,preventDefault(){},stopPropagation(){},button:0,pointerId:1,clientX:100,clientY:100,...args});}
 }
 for(const id of ['campusMap','mapViewport','mapBlocks','mapInfo','mapPlaceList','mapStatus','mapZoom','mapSearch','mapKind','mapResults','mapZoomIn','mapZoomOut','mapFit','mapAccountLink','mapCategories'])ids.set(id,new Element('div'));
 for(const value of ['todos','ensino','laboratorios','servicos','esporte','convivencia']){
  const button=new Element('button');button.dataset.category=value;ids.get('mapCategories').append(button);
 }
 ids.get('mapKind').value='todos';
 vm.runInNewContext(fs.readFileSync('front/js/campus-map.js','utf8'),{window:{Arcadia:A},document:{getElementById:id=>ids.get(id),createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)}});
 return {ids,A};
}
test('busca e lista oferecem os mesmos dados; local pendente não cria marcador no SVG',()=>{
 const f=ui(),get=id=>f.ids.get(id);assert.equal(get('mapBlocks').children.length,f.A.campusMapModel.places.filter(row=>row.path).length);
 get('mapSearch').value='DRIA';get('mapSearch').emit('input');assert.equal(get('mapPlaceList').children.length,1);get('mapPlaceList').children[0].children[0].onclick();
 assert.equal(get('mapInfo').children[0].textContent,'Bloco E · DRIA, DEN e laboratórios');assert.equal(get('mapInfo').focused,true);assert.equal(get('mapZoom').textContent,'250%');
 get('mapSearch').value='Recursos Pesqueiros';get('mapSearch').emit('input');get('mapPlaceList').children[0].children[0].onclick();assert.match(get('mapStatus').textContent,/Localização a confirmar/);
 assert.equal(get('mapBlocks').children.some(row=>row.dataset.place==='esportes'),false);
 get('mapSearch').value='Nada aqui';get('mapSearch').emit('input');assert.equal(get('mapPlaceList').children.length,0);assert.match(get('mapResults').textContent,/Nenhum local/);
});
test('controles de teclado, pan e toque não abrem bloco ao arrastar',()=>{
 const f=ui(),get=id=>f.ids.get(id),viewport=get('mapViewport'),svg=get('campusMap');
 viewport.emit('keydown',{key:'+'});assert.notEqual(get('mapZoom').textContent,'100%');const before=svg.attrs.viewBox;viewport.emit('keydown',{key:'ArrowRight'});assert.notEqual(svg.attrs.viewBox,before);
 const block=get('mapBlocks').children.find(row=>row.dataset.place==='f');
 viewport.emit('pointerdown',{target:block});viewport.emit('pointermove',{clientX:160});viewport.emit('pointerup',{clientX:160});assert.notEqual(block.attrs['aria-pressed'],'true');
 viewport.emit('pointerdown',{target:block});viewport.emit('pointerup',{target:block});assert.equal(block.attrs['aria-pressed'],'true');
 viewport.emit('keydown',{key:'0'});assert.equal(get('mapZoom').textContent,'100%');
 viewport.emit('pointerdown',{pointerId:1,clientX:100});viewport.emit('pointerdown',{pointerId:2,clientX:200});viewport.emit('pointermove',{pointerId:2,clientX:300});assert.equal(get('mapZoom').textContent,'200%');viewport.emit('pointercancel',{pointerId:1});viewport.emit('pointerup',{pointerId:2});
});
test('página pública usa referência atribuída sem API paga nem rotas ou identidades inventadas',()=>{
 const html=fs.readFileSync('front/campus-map.html','utf8');assert.match(html,/Não é um mapa de rotas nem uma planta oficial atualizada/);assert.match(html,/engBRASIL25/);assert.match(html,/assets\/campus-map-reference-2025.png/);
 assert.ok(fs.statSync('front/assets/campus-map-reference-2025.png').size>0);
 assert.ok(html.includes('tabindex="0"'));assert.ok(html.includes('id="mapPlaceList"'));assert.doesNotMatch(html,/Google Maps|maps\.google|api_key|geolocation|syncdevifpa@gmail/);
 assert.ok(html.indexOf('js/campus-map-model.js')<html.indexOf('js/campus-map.js'));
});

test('setores mantêm andares informados, incertezas e alcance das fontes oficiais',()=>{
 const m=model(),place=id=>m.places.find(row=>row.id===id);
 assert.match(place('c').notes.join(' '),/ADS.*térreo/);
 assert.match(place('d').notes.join(' '),/Física no térreo/);
 for(const id of ['c','d'])assert.match(place(id).notes.join(' '),/Química no 1º andar/);
 assert.match(place('e').notes[0],/descanso.*1º andar/);
 assert.match(place('e').notes[1],/a confirmar/);
 assert.match(place('j').notes[0],/Ambulatório no térreo.*porta de vidro/);
 assert.match(place('j').notes[1],/corredor transversal.*escada/);
 assert.match(place('n1').notes[0],/regência estudantil.*Achados e Perdidos/);
 assert.match(place('m').notes[0],/professores.*ensino médio.*Geografia/);
 assert.match(place('f').notes[0],/Miniauditório no 2º andar/);
 assert.equal(place('j').dashed,undefined);
 for(const id of ['c','e','j'])assert.ok(place(id).references.every(ref=>new URL(ref.url).hostname.endsWith('.ifpa.edu.br')));
 for(const id of ['c','d','e','m','n','s','t','pesqueiros'])assert.ok(m.search('', 'pendente').some(row=>row.id===id));
 assert.match(place('v').notes[0],/térreo; dormitórios no 1º e 2º/);
 assert.match(place('z').notes.join(' '),/restrito/);
 const f=ui();f.ids.get('mapSearch').value='DRIA';f.ids.get('mapSearch').emit('input');f.ids.get('mapPlaceList').children[0].children[0].onclick();
 assert.ok(f.ids.get('mapInfo').querySelectorAll('a').some(link=>link.href==='https://belem.ifpa.edu.br/secretaria-academica'));
});

test('correções da equipe distinguem Estradas, serviços e setores sem localização',()=>{
 const m=model(),place=id=>m.places.find(row=>row.id===id);
 for(const id of ['g','s','t'])assert.match(place(id).notes.join(' '),/único pavimento \(térreo\)/);
 assert.equal(m.search('Estradas')[0].id,'g');
 assert.deepEqual(Array.from(m.search('Matemática'),row=>row.id),['m']);
 assert.ok(!m.places.some(row=>row.id==='professores'));
 assert.equal(m.search('lanchonete')[0].id,'p');
 for(const query of ['Recursos Pesqueiros','Aquicultura'])assert.deepEqual(Array.from(m.search(query),row=>row.id),['pesqueiros']);
 assert.equal(place('pesqueiros').path,'');
 assert.equal(place('pesqueiros').kind,'pendente');
});

test('filtros de atividade combinam busca e tipo sem atribuir ponto a local pendente',()=>{
 const m=model();
 assert.deepEqual(Array.from(m.search('','todos','esporte'),row=>row.id),['q','x','campo']);
 assert.equal(m.search('lanchonete','todos','servicos')[0].id,'p');
 assert.equal(m.search('lanchonete','todos','esporte').length,0);
 assert.equal(m.search('Recursos Pesqueiros','pendente','ensino')[0].path,'');
 const f=ui(),get=id=>f.ids.get(id),chips=get('mapCategories').children;
 chips.find(row=>row.dataset.category==='esporte').onclick();
 assert.equal(get('mapPlaceList').children.length,3);
 assert.equal(chips.find(row=>row.dataset.category==='esporte').attrs['aria-pressed'],'true');
 assert.equal(chips.find(row=>row.dataset.category==='todos').attrs['aria-pressed'],'false');
 get('mapSearch').value='Ginásio';get('mapSearch').emit('input');
 assert.equal(get('mapPlaceList').children.length,1);
 get('mapPlaceList').children[0].children[0].onclick();
 assert.equal(get('mapBlocks').children.find(row=>row.dataset.place==='q').attrs['aria-pressed'],'true');
 assert.equal(get('mapPlaceList').children[0].children[0].attrs['aria-pressed'],'true');
 get('mapSearch').value='';get('mapSearch').emit('input');
 chips.find(row=>row.dataset.category==='todos').onclick();
 assert.equal(get('mapPlaceList').children.length,f.A.campusMapModel.places.length);
});
