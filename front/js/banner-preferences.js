(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else (root.Arcadia=root.Arcadia||{}).bannerPreferences=api;})(typeof window==='undefined'?globalThis:window,function(){
    'use strict';
    const valid=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
    const legacy={cyan:'#bdeafa',pink:'#f4c6dd',yellow:'#f7e895',green:'#c9edb0',orange:'#f4ceaa'};
    function luminance(hex){const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
    function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
    function readable(background,text){if(!valid(background)||!valid(text))return null;return contrast(background,text)>=4.5?text:contrast(background,'#000000')>=contrast(background,'#ffffff')?'#000000':'#ffffff';}
    function usesSiteDefault(page){return !['dashboard.html','tasks.html','documents.html','settings.html','community.html','community-settings.html'].includes(page);}
    function owner(session){const external=session?.tipo_usuario==='externo',id=external?session.id_externo||session.id_usuario:session?.id_usuario;return /^[1-9]\d*$/.test(String(id||''))?(external?'externo:':'')+id:null;}
    function resolve(style){
        if(style==='neutral'||style?.mode==='neutral')return {mode:'neutral'};
        if(typeof style==='string'&&Object.hasOwn(legacy,style))return {mode:'custom',background:legacy[style],text:'#182020'};
        if(style?.mode==='custom'&&valid(style.background)&&valid(style.text))return {mode:'custom',background:style.background,text:readable(style.background,style.text)};
        return {mode:'default'};
    }
    function pageKey(page,search=''){const publication=page==='notice.html'?new URLSearchParams(search).get('id')||'':'';return page==='classes.html'?'overview':'page:'+page+':'+(page==='index.html'?'home':'0')+(publication?':'+publication:'');}
    return {valid,legacy,contrast,readable,usesSiteDefault,owner,resolve,pageKey};
});
