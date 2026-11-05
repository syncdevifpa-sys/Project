/* Proposta local e reversível: não é carregada pelo frontend publicado. */
module.exports = function topbarExample() {
    return `<style>
    .ar-topbar-example .ar-nav-end{gap:8px}
    .ar-preview-account{position:relative;min-width:0}
    .ar-preview-account>summary{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;cursor:pointer;list-style:none;background:var(--surface);color:var(--ink);font-weight:600;font-size:13px}
    .ar-preview-account>summary::-webkit-details-marker{display:none}
    .ar-preview-account>summary::after{content:'⌄'}
    .ar-preview-account-panel{position:absolute;z-index:70;inset:calc(100% + 12px) 0 auto auto;width:min(280px,calc(100vw - 32px));padding:16px;display:grid;gap:12px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow-float)}
    .ar-preview-account:not([open])>.ar-preview-account-panel{display:none}
    .ar-preview-account-panel .ar-user{display:flex;gap:10px;padding:0;min-width:0}
    .ar-topbar-example .ar-preview-account-panel .ar-user>div{display:block}
    .ar-preview-account-panel .ar-iconbtn{width:100%;justify-content:flex-start}
    .ar-preview-account-panel>a,.ar-preview-account-panel>button{min-height:44px}
    .ar-preview-search-label{display:none}
    @media(min-width:901px){.ar-topbar-example .ar-nav-end>[data-search-trigger]{width:auto;gap:8px;padding:8px 14px}.ar-preview-search-label{display:inline;font-size:13px}}
    .ar-topbar-example .ar-nav-current{background:transparent;border-color:transparent}
    </style><script>
    window.addEventListener('load',function(){
      const bar=document.querySelector('.ar-nav');if(!bar)return;
      const end=bar.querySelector('.ar-nav-end');if(!end)return;
      document.body.classList.add('ar-topbar-example');
      const account=document.createElement('details');account.className='ar-preview-account';
      const summary=document.createElement('summary');summary.textContent='Conta';summary.setAttribute('aria-label','Abrir opções da conta');
      const panel=document.createElement('div');panel.className='ar-preview-account-panel';
      for(const item of [...end.querySelectorAll('.ar-user,a[aria-label="Configurações"],[data-sign-out],[data-logout]')]){
        if(item.getAttribute('aria-label')==='Configurações'){item.textContent='Configurações';item.className='ar-btn ar-btn--secondary';}
        panel.append(item);
      }
      if(!panel.children.length)return;
      account.append(summary,panel);end.append(account);
      const search=end.querySelector('[data-search-trigger]');if(search){
        search.setAttribute('aria-label','Ir para uma área do portal');search.title='Ir para uma área do portal (Ctrl+K)';
        const text=document.createElement('span');text.className='ar-preview-search-label';text.textContent='Ir para uma área';search.append(text);
      }
      account.addEventListener('keydown',function(e){if(e.key==='Escape'){account.open=false;summary.focus({preventScroll:true});}});
      document.addEventListener('pointerdown',function(e){if(!account.contains(e.target))account.open=false;});
      document.addEventListener('focusin',function(e){if(!account.contains(e.target))account.open=false;});
    });
    </script>`;
};
