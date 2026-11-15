/* Evita exibir a estrutura sem estilos; falhas de rede não bloqueiam a página indefinidamente. */
(function () {
 'use strict';
 const root=document.documentElement;
 root.setAttribute('data-page-loading','true');
 const style=document.createElement('style');
 style.textContent='html[data-page-loading] body{visibility:hidden}html[data-page-loading]::before{content:"Carregando Arcádia…";position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#f5f6f8;color:#182020;font:16px system-ui}html[data-theme="dark"][data-page-loading]::before{background:#101214;color:#f5f6f8}';
 document.head.append(style);
 let timeout;
 function ready(){root.removeAttribute('data-page-loading');clearTimeout(timeout);style.remove();}
 timeout=setTimeout(ready,5000);
 window.addEventListener('load',()=>{
  /* As folhas de estilo já concluíram; fontes locais também têm prazo limitado. */
  Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(resolve=>setTimeout(resolve,500))]).then(()=>requestAnimationFrame(ready));
 },{once:true});
 window.addEventListener('pageshow',event=>{if(event.persisted)ready();});
})();
