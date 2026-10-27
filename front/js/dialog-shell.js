// Componente opt-in: sem observar/mudar diálogos ou menus de outros componentes.
(function(A){
    'use strict';
    const states=new WeakMap(),stack=[];
    let sequence=0;
    const top=()=>stack.filter(node=>node.isConnected&&(node.open||node.dataset.shellOverlay==='open')).at(-1);
    const lock=()=>document.documentElement.classList.toggle('ar-dialog-open',!!top());
    const outside=(node,event)=>{const rect=node.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;};
    const snapshot=node=>JSON.stringify([...node.querySelectorAll(node.classList.contains('ar-avatar-editor')?'input,textarea,select':'form input,form textarea,form select')].map(input=>[input.name,input.type,input.type==='checkbox'||input.type==='radio'?input.checked:input.value]));
    const busy=node=>{const state=states.get(node);return !!(state?.activeButton?.disabled&&node.contains(state.activeButton))||!!node.querySelector('[data-dialog-busy="true"]');};
    function enhance(node,{frame=true}={}){
        if(states.has(node))return states.get(node);
        const state={previous:null,baseline:'',touched:false,pointer:null,asking:false,overlay:false};states.set(node,state);
        if(frame){
            const title=node.querySelector('h1,h2,legend'),head=document.createElement('div'),body=document.createElement('div');
            head.className='ar-dialog-shell-head';body.className='ar-dialog-shell-body';
            let heading=title;
            if(!heading||heading.tagName==='LEGEND'){
                heading=document.createElement('h2');heading.textContent=title?.textContent||'Detalhes';heading.id='dialogShellTitle'+(++sequence);
                node.setAttribute('aria-labelledby',heading.id);if(title){title.classList.add('ar-dialog-source-title');state.sourceTitle=title;}
            }
            head.append(heading);state.heading=heading;
            const close=[...node.querySelectorAll('button')].find(button=>button.type==='button'&&button.textContent.trim()==='Fechar')||document.createElement('button');close.type='button';close.textContent='×';close.className='ar-dialog-shell-close';close.setAttribute('aria-label','Fechar janela');close.dataset.shellClose='true';
            head.append(close);
            while(node.firstChild)body.append(node.firstChild);
            node.append(head,body);node.classList.add('ar-dialog-shell');
        }
        state.dismiss=async()=>{
            if(top()!==node||busy(node)||state.asking)return;
            if(state.touched&&snapshot(node)!==state.baseline){
                state.asking=true;
                const confirmed=A.confirmAction?await A.confirmAction({title:'Descartar alterações?',message:'As alterações desta janela ainda não foram salvas.',confirmLabel:'Descartar alterações'}):false;
                state.asking=false;if(!confirmed||!node.isConnected||top()!==node||busy(node))return;
            }
            if(state.overlay)closeOverlay(node);else node.close();
        };
        state.request=()=>{
            if(top()!==node)return;
            if(state.overlay){state.dismiss();return;}
            if(node.requestClose)node.requestClose();
            else {const event=new Event('cancel',{cancelable:true});if(node.dispatchEvent(event))node.close();}
        };
        node.addEventListener('cancel',event=>{
            if(event.defaultPrevented)return;
            event.preventDefault();state.dismiss();
        });
        node.addEventListener('submit',()=>{state.activeButton=node.querySelector('form button[type="submit"]');},true);
        node.addEventListener('input',event=>{if(event.target.closest('form')||node.classList.contains('ar-avatar-editor'))state.touched=true;});
        node.addEventListener('change',event=>{if(event.target.closest('form')||node.classList.contains('ar-avatar-editor'))state.touched=true;});
        node.addEventListener('click',event=>{
            const button=event.target.closest('button');if(!button)return;
            const close=button.dataset.shellClose||button.hasAttribute('data-close-dialog')||button.hasAttribute('data-google-close')||(button.type==='button'&&['Fechar','Cancelar','Cancelar edição'].includes(button.textContent.trim()));
            if(close){event.preventDefault();event.stopImmediatePropagation();state.request();}
            else if(!button.disabled)state.activeButton=button;
        },true);
        node.addEventListener('pointerdown',event=>{
            state.pointer=event.button===0&&event.target===node&&outside(state.overlay?node.querySelector('[role="dialog"]'):node,event)?event.pointerId:null;
        });
        node.addEventListener('pointerup',event=>{
            const dismiss=state.pointer!==null&&state.pointer===event.pointerId&&event.target===node&&outside(state.overlay?node.querySelector('[role="dialog"]'):node,event);
            state.pointer=null;if(dismiss)state.request();
        });
        node.addEventListener('pointermove',event=>{if(node.classList.contains('ar-avatar-editor')&&event.buttons===1)state.touched=true;});
        node.addEventListener('pointercancel',()=>{state.pointer=null;});
        node.addEventListener('close',()=>release(node,state));
        return state;
    }
    function release(node,state){const index=stack.lastIndexOf(node);if(index<0)return;const wasTop=index===stack.length-1;stack.splice(index,1);lock();if(wasTop&&state.previous?.isConnected)state.previous.focus({preventScroll:true});}
    function begin(node,state,previous=document.activeElement){
        state.previous=previous;state.touched=false;state.pointer=null;state.activeButton=null;
        if(state.sourceTitle)state.heading.textContent=state.sourceTitle.textContent;
        const index=stack.indexOf(node);if(index>=0)stack.splice(index,1);stack.push(node);lock();
        queueMicrotask(()=>{state.baseline=snapshot(node);});
    }
    function open(node){
        const state=enhance(node,{frame:!node.classList.contains('ar-legal-dialog')&&!node.classList.contains('ar-google-login-dialog')});
        const previous=document.activeElement;node.showModal();begin(node,state,previous);
    }
    function openOverlay(node){
        const state=enhance(node,{frame:false});state.overlay=true;
        const header=node.querySelector('.ar-pal-top');
        if(header&&!header.querySelector('[data-close-dialog]')){
            const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Fechar busca');close.setAttribute('data-close-dialog','');close.className='ar-dialog-shell-close';header.append(close);
        }
        node.dataset.shellOverlay='open';node.style.display='grid';begin(node,state);
        if(!state.overlayKeys){state.overlayKeys=true;node.addEventListener('keydown',event=>{
            if(top()!==node)return;
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();state.request();}
            if(event.key==='Tab'){
                const items=[...node.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(item=>!item.disabled&&!item.hidden&&item.getClientRects().length);
                if(!items.length)return;
                const first=items[0],last=items.at(-1);
                if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
                else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
            }
        });}
        node.querySelector('input,textarea,button')?.focus();
    }
    function closeOverlay(node){const state=states.get(node);node.style.display='none';delete node.dataset.shellOverlay;if(state)release(node,state);}
    A.dialogShell={open,openOverlay,closeOverlay};
})(window.Arcadia=window.Arcadia||{});
