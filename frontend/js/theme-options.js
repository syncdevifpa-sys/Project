/* Preferências de aparência; não altera dados pessoais nem cores individuais salvas. */
(function(){
      const root=document.documentElement;
      const policy=window.Arcadia&&window.Arcadia.bannerPreferences;
      if(policy){
        /* Preferências globais: todos os padrões seguem a cor geral; escolhas pessoais continuam intactas. */
        /* As áreas pessoais conservam as cores padrão próprias do modelo anterior. */
        const originalBackgroundCSS=policy.backgroundCSS;
        policy.backgroundCSS=function(style){
          if(!style.gradient||style.gradientStrength==='heavy')return originalBackgroundCSS(style);
          const base=originalBackgroundCSS(style),colors=base.match(/#[0-9a-f]{6}/gi);
          if(!colors||colors.length<2)return base;
          /* Reforço pequeno do degradê, somente quando a opção estiver marcada. */
          const end='#'+[1,3,5].map(offset=>Math.max(0,Math.min(255,Math.round(parseInt(colors[0].slice(offset,offset+2),16)+(parseInt(colors[1].slice(offset,offset+2),16)-parseInt(colors[0].slice(offset,offset+2),16))*1.4))).toString(16).padStart(2,'0')).join('');
          return policy.contrast(end,style.text)>=4.5?base.replace(colors[1],end):base;
        };
        if(window.Arcadia.bannerBootstrap)window.Arcadia.bannerBootstrap.apply();
      }
      function read(key,fallback){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
      function write(key,value){try{localStorage.setItem(key,value)}catch{}}
      function apply(){
        const dark=root.getAttribute('data-theme')==='dark';
        const value=read(dark?'arcadia-dark-style':'arcadia-light-style',dark?'neutral':'clean');
        const allowed=dark?['neutral','winter']:['clean','autumn'];
        root.setAttribute('data-preview-season',allowed.includes(value)?value:allowed[0]);
        if(document.querySelector('.theme-preview-picker'))update();
      }
      function setMode(mode){
        if(window.Arcadia&&window.Arcadia.applyTheme)window.Arcadia.applyTheme(mode);
        else {write('arcadia-theme',mode);root.setAttribute('data-theme-mode',mode);root.setAttribute('data-theme',mode==='dark'||mode==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
        apply();
      }
      function update(){
        const mode=root.getAttribute('data-theme-mode')||'light';
        document.querySelectorAll('[data-preview-theme-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.previewThemeMode===mode)));
        document.querySelectorAll('[data-preview-theme-choice]').forEach(button=>{const family=button.dataset.family;button.setAttribute('aria-checked',String(read('arcadia-'+family+'-style',family==='dark'?'neutral':'clean')===button.dataset.previewThemeChoice))});
      }
      apply();new MutationObserver(apply).observe(root,{attributes:true,attributeFilter:['data-theme','data-theme-mode']});
      window.addEventListener('storage',apply);
      function nextCard(){
        const card=document.getElementById('dbNowCard');
        if(card&&window.Arcadia&&window.Arcadia.classAppearance)window.Arcadia.classAppearance.decorate(card,'dashboard:next-commit','Próximo compromisso');
      }
      document.addEventListener('arcadia:page-loaded',nextCard);
      window.addEventListener('load',function(){
        nextCard();
        const picker=document.getElementById('themePickerGroup');if(!picker)return;
        picker.className='theme-preview-picker';picker.removeAttribute('role');picker.replaceChildren();
        const icons={light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',dark:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',auto:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5"/>'};
        function svg(mode){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[mode]+'</svg>'}
        for(const [mode,label,choices] of [['light','Claro',[['clean','Claro','#ffffff'],['autumn','Outono','#f6eddb']]],['dark','Escuro',[['neutral','Escuro','#181a1e'],['winter','Inverno','#132238']]]]){
          const group=document.createElement('div');group.className='theme-preview-group';
          const main=document.createElement('button');main.type='button';main.dataset.previewThemeMode=mode;main.innerHTML=svg(mode);main.append(document.createTextNode(label));main.onclick=()=>setMode(mode);
          const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='⌄';summary.setAttribute('aria-label','Variações do modo '+label.toLowerCase());summary.title='Variações do modo '+label.toLowerCase();
          const menu=document.createElement('div');menu.className='theme-preview-menu';menu.setAttribute('role','radiogroup');menu.setAttribute('aria-label','Variações do modo '+label.toLowerCase());
          for(const [value,name,color] of choices){const button=document.createElement('button');button.type='button';button.setAttribute('role','radio');button.setAttribute('aria-label',name);button.dataset.previewThemeChoice=value;button.dataset.family=mode;const swatch=document.createElement('span');swatch.className='theme-preview-swatch';swatch.style.background=color;swatch.setAttribute('aria-hidden','true');button.append(swatch,document.createTextNode(name));button.onclick=()=>{write('arcadia-'+mode+'-style',value);setMode(mode);details.open=false;summary.focus({preventScroll:true})};menu.append(button)}
          details.append(summary,menu);group.append(main,details);picker.append(group);
          document.addEventListener('pointerdown',e=>{if(!group.contains(e.target))details.open=false});details.addEventListener('keydown',e=>{if(e.key==='Escape'){details.open=false;summary.focus({preventScroll:true})}});
        }
        const auto=document.createElement('button');auto.type='button';auto.className='theme-preview-system';auto.dataset.previewThemeMode='auto';auto.innerHTML=svg('auto');auto.append(document.createTextNode('Sistema'));auto.title='Acompanhar o tema do dispositivo';auto.onclick=()=>setMode('auto');picker.append(auto);
        const hint=picker.closest('.ar-srow')&&picker.closest('.ar-srow').querySelector('.ar-srow-desc');if(hint)hint.textContent='Use as setas para escolher Claro ou Outono, Escuro ou Inverno. Sistema acompanha o dispositivo.';
        const accents=document.getElementById('accentPickerGroup');const accentHint=accents&&accents.closest('.ar-srow').querySelector('.ar-srow-desc');if(accentHint)accentHint.textContent='A cor geral vale para as áreas comuns. Meu espaço mantém as cores próprias de cada aba; personalizações individuais são preservadas.';
        update();
      });
    })();
