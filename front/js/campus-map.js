(function(A){
    'use strict';
    const model=A.campusMapModel,svg=document.getElementById('campusMap');
    if(!model||!svg)return;
    const $=id=>document.getElementById(id),viewport=$('mapViewport'),layer=$('mapBlocks'),info=$('mapInfo'),list=$('mapPlaceList'),status=$('mapStatus');
    const create=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
    const ns=(tag,attrs)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
    const groups=new Map(),pointers=new Map();let view={...model.bounds},selected='',dragged=false,drag=null,pinch=null;
    function paintView(){svg.setAttribute('viewBox',[view.x,view.y,view.width,view.height].join(' '));$('mapZoom').textContent=Math.round(model.bounds.width/view.width*100)+'%';$('mapZoomIn').disabled=view.width<=model.bounds.width/6+.00001;$('mapZoomOut').disabled=view.width>=model.bounds.width-.00001;}
    function point(clientX,clientY){const p=svg.createSVGPoint();p.x=clientX;p.y=clientY;const matrix=svg.getScreenCTM();return matrix?p.matrixTransform(matrix.inverse()):{x:view.x+view.width/2,y:view.y+view.height/2};}
    function zoom(factor,anchor){view=model.zoom(view,factor,anchor);paintView();}
    function mark(){for(const [id,group]of groups)group.setAttribute('aria-pressed',String(id===selected));for(const button of list.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.place===selected));}
    function select(id,{focusMap=false}={}){
        const place=model.places.find(item=>item.id===id);if(!place)return;
        selected=id;info.replaceChildren(create('h2',place.name));
        const details=create('ul');for(const note of place.notes)details.append(create('li',note));info.append(details);
        info.append(create('p',place.source==='equipe'?'Setores/andares: informações fornecidas pela equipe. Posição do bloco: referência de 2025.':'Informação da planta de referência de 2025; confirme a disponibilidade no campus.'));
        if(place.path){
            const focus=create('button','Centralizar no mapa');focus.type='button';focus.className='ar-btn';focus.onclick=()=>focusPlace(place);info.append(focus);
            status.textContent=place.name+' selecionado. As informações estão no painel de detalhes.';
        }else status.textContent='Localização a confirmar: '+place.name+'. Este item não tem ponto atribuído no mapa.';
        if(focusMap){if(place.path)focusPlace(place);info.tabIndex=-1;info.focus();}
        mark();
    }
    function focusPlace(place){view=model.clamp({width:320,height:632,x:place.x-160,y:place.y-316});paintView();viewport.focus({preventScroll:true});}
    for(const place of model.places){
        if(!place.path)continue;
        const group=ns('g',{role:'button',tabindex:'0','aria-label':place.name,'aria-pressed':'false','data-place':place.id,'data-kind':place.kind,'data-dashed':!!place.dashed,'data-small':place.label.length>1});group.classList.add('ar-map-place');
        const shape=ns('path',{d:place.path}),label=ns('text',{x:place.x,y:place.y});label.textContent=place.label;group.append(shape,label);
        group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();select(place.id);}});
        group.addEventListener('click',event=>{if(event.detail===0)select(place.id);});
        layer.append(group);groups.set(place.id,group);
    }
    function filter(){
        const matches=model.search($('mapSearch').value,$('mapKind').value),ids=new Set(matches.map(place=>place.id));list.replaceChildren();
        for(const place of matches){const item=create('li'),button=create('button',place.name);button.type='button';button.dataset.place=place.id;button.setAttribute('aria-label','Ver detalhes de '+place.name);button.onclick=()=>select(place.id,{focusMap:true});item.append(button);list.append(item);}
        $('mapResults').textContent=matches.length?matches.length+' local(is) encontrado(s). Selecione para ver detalhes.':'Nenhum local encontrado. Tente outro nome ou tipo de local.';
        for(const [id,group]of groups)group.dataset.matched=String(ids.has(id));mark();
    }
    $('mapSearch').addEventListener('input',filter);$('mapKind').addEventListener('change',filter);
    $('mapZoomIn').onclick=()=>zoom(1.3);$('mapZoomOut').onclick=()=>zoom(1/1.3);
    $('mapFit').onclick=()=>{view={...model.bounds};paintView();status.textContent='Campus inteiro. Selecione um bloco ou use a busca.';};
    viewport.addEventListener('keydown',event=>{
        if(event.target.closest('[data-place]')&&['Enter',' '].includes(event.key))return;
        const step=view.width*.12;
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
            event.preventDefault();view=model.clamp({...view,x:view.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),y:view.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)});paintView();
        }else if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.3);}
        else if(event.key==='-'){event.preventDefault();zoom(1/1.3);}
        else if(event.key==='0'||event.key==='Home'){event.preventDefault();$('mapFit').click();}
    });
    viewport.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();zoom(event.deltaY<0?1.15:1/1.15,point(event.clientX,event.clientY));},{passive:false});
    const gesture=()=>{const points=[...pointers.values()];if(points.length<2)return null;const [a,b]=points;return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
    viewport.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture(event.pointerId);
        if(pointers.size===1){dragged=false;drag={x:event.clientX,y:event.clientY,view:{...view},place:event.target.closest('[data-place]')?.dataset.place};}
        else {dragged=true;pinch=gesture();}
    });
    viewport.addEventListener('pointermove',event=>{
        if(!pointers.has(event.pointerId))return;
        pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(pointers.size>=2){const next=gesture();if(pinch&&next&&pinch.distance>0)zoom(next.distance/pinch.distance,point(next.x,next.y));pinch=next;return;}
        if(!drag)return;
        const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
        if(Math.hypot(dx,dy)>6)dragged=true;
        if(dragged){const matrix=svg.getScreenCTM();if(!matrix)return;view=model.clamp({...drag.view,x:drag.view.x-dx/matrix.a,y:drag.view.y-dy/matrix.d});paintView();viewport.dataset.dragging='true';}
    });
    function finish(event,canceled=false){
        if(!pointers.has(event.pointerId))return;
        if(!canceled&&!dragged&&drag?.place&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<=6)select(drag.place);
        pointers.delete(event.pointerId);if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
        viewport.dataset.dragging='false';pinch=null;
        const remaining=[...pointers.values()][0];drag=remaining?{x:remaining.x,y:remaining.y,view:{...view}}:null;
    }
    viewport.addEventListener('pointerup',event=>finish(event));viewport.addEventListener('pointercancel',event=>finish(event,true));
    const account=A.auth?.getSessao();if(account?.tipo_usuario){$('mapAccountLink').textContent='Meu painel';$('mapAccountLink').href=account.tipo_usuario==='externo'?'community.html':'dashboard.html';}
    filter();paintView();status.textContent='Escolha um local. Arraste para mover ou use os controles de ampliação.';
})(window.Arcadia);
