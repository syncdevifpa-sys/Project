// Editor local: a imagem só é enviada depois de confirmar o enquadramento.
(function (A) {
    'use strict';
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    A.avatarCrop=function(width,height,zoom,x,y){
        const size=Math.min(width,height)/clamp(zoom,1,3);
        return {x:(width-size)*clamp(x,0,100)/100,y:(height-size)*clamp(y,0,100)/100,size};
    };
    A.editAvatar=async function(file){
        if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Selecione uma foto JPG, PNG ou WEBP.');
        if(!file.size||file.size>5*1024*1024)throw new Error('A foto deve ter até 5 MB.');
        const url=URL.createObjectURL(file),image=new Image();
        try{image.src=url;await image.decode();}catch(error){URL.revokeObjectURL(url);throw new Error('Não foi possível abrir esta imagem.');}
        if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>25000000){URL.revokeObjectURL(url);throw new Error('Use uma foto com até 25 megapixels.');}
        const dialog=document.createElement('dialog');dialog.className='ar-avatar-editor';dialog.setAttribute('aria-labelledby','avatarEditorTitle');
        dialog.innerHTML='<h2 id="avatarEditorTitle">Ajustar foto</h2><p id="avatarEditorHelp">Arraste a foto ou use os controles para ajustar o enquadramento. Sua foto atual será mantida até confirmar e salvar.</p><canvas width="360" height="360" aria-label="Prévia do enquadramento da foto"></canvas><div class="ar-avatar-controls"><label>Zoom<input name="zoom" type="range" min="1" max="3" step="0.05" value="1"></label><label>Posição horizontal<input name="horizontal" type="range" min="0" max="100" value="50"></label><label>Posição vertical<input name="vertical" type="range" min="0" max="100" value="50"></label></div><div class="ar-avatar-actions"><button type="button" class="ar-btn ar-btn--secondary" data-avatar-reset>Centralizar</button><button type="button" class="ar-btn ar-btn--secondary" data-avatar-cancel>Cancelar</button><button type="button" class="ar-btn ar-btn--primary" data-avatar-confirm>Confirmar e salvar foto</button></div>';
        const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),zoom=dialog.querySelector('[name=zoom]'),x=dialog.querySelector('[name=horizontal]'),y=dialog.querySelector('[name=vertical]');
        function draw(){const crop=A.avatarCrop(image.naturalWidth,image.naturalHeight,Number(zoom.value),Number(x.value),Number(y.value));ctx.fillStyle='#fff';ctx.fillRect(0,0,360,360);ctx.drawImage(image,crop.x,crop.y,crop.size,crop.size,0,0,360,360);x.disabled=image.naturalWidth===crop.size;y.disabled=image.naturalHeight===crop.size;}
        [zoom,x,y].forEach(control=>control.addEventListener('input',draw));
        let drag;
        canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
        canvas.addEventListener('pointermove',event=>{
            if(!drag)return;const crop=A.avatarCrop(image.naturalWidth,image.naturalHeight,Number(zoom.value),Number(x.value),Number(y.value));const scale=crop.size/canvas.getBoundingClientRect().width;
            if(image.naturalWidth>crop.size)x.value=String(clamp(Number(x.value)-(event.clientX-drag.x)*scale/(image.naturalWidth-crop.size)*100,0,100));
            if(image.naturalHeight>crop.size)y.value=String(clamp(Number(y.value)-(event.clientY-drag.y)*scale/(image.naturalHeight-crop.size)*100,0,100));
            drag={x:event.clientX,y:event.clientY};draw();
        });
        ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>{drag=null;}));
        dialog.querySelector('[data-avatar-reset]').addEventListener('click',()=>{zoom.value='1';x.value=y.value='50';draw();});
        document.body.append(dialog);draw();dialog.showModal();
        return new Promise(resolve=>{
            let result=null;
            dialog.querySelector('[data-avatar-confirm]').addEventListener('click',()=>{result=canvas.toDataURL('image/jpeg',0.88);dialog.close();});
            dialog.querySelector('[data-avatar-cancel]').addEventListener('click',()=>dialog.close());
            dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.remove();resolve(result);},{once:true});
        });
    };
})(window.Arcadia=window.Arcadia||{});
