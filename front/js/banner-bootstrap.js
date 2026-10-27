// Aplica somente apresentação conhecida, sem esperar o DOM nem consultar a API.
(function(A){
    'use strict';
    const policy=A?.bannerPreferences;if(!policy)return;
    const root=document.documentElement,page=location.pathname.split('/').pop()||'index.html';
    const cards=page==='dashboard.html'?['unread-notices','open-tasks','pending-documents']:[];
    function apply(){
        for(const slot of ['page',...cards]){
            root.removeAttribute('data-initial-banner-'+slot);
            root.style.removeProperty('--initial-banner-'+slot+'-bg');
            root.style.removeProperty('--initial-banner-'+slot+'-ink');
        }
        try{
            const account=JSON.parse(localStorage.getItem('arcadiaSessao')||'{}'),owner=policy.owner(account);
            if(!owner||!localStorage.getItem('arcadiaToken'))return;
            let stored={};
            try { stored=JSON.parse(localStorage.getItem('arcadia-class-banner-styles:'+owner)||'{}'); } catch {}
            const accent=localStorage.getItem('arcadia-theme-accent')||'lime';
            if(['lime','cyan','pink','yellow'].includes(accent))root.setAttribute('data-accent',accent);
            const preferences=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
            for(const slot of ['page',...cards]){
                const key=slot==='page'?policy.pageKey(page,location.search):'dashboard:summary:'+slot;
                const style=policy.resolve(preferences[key]);
                if(style.mode==='default'&&(slot!=='page'||!policy.usesSiteDefault(page)))continue;
                root.setAttribute('data-initial-banner-'+slot,style.mode);
                root.style.setProperty('--initial-banner-'+slot+'-bg',style.mode==='neutral'?'var(--surface, var(--color-page, #fff))':style.mode==='default'?'var(--accent, var(--lime))':style.background);
                root.style.setProperty('--initial-banner-'+slot+'-ink',style.mode==='neutral'?'var(--ink, var(--color-text, #182020))':style.mode==='default'?'#182020':style.text);
            }
        }catch{/* Armazenamento indisponível ou inválido preserva o CSS original. */}
    }
    apply();
    window.addEventListener('storage',event=>{
        if(event.key===null||event.key==='arcadiaSessao'||event.key==='arcadiaToken'||event.key?.startsWith('arcadia-class-banner-styles:'))apply();
    });
})(window.Arcadia);
