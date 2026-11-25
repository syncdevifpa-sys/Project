const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function inventory(root=path.resolve(__dirname,'../..')) {
 const literal=[],dynamic=[];
 function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,item.name);if(item.isDirectory()){if(!['database','postgres'].includes(item.name))walk(file);continue;}
  if(!file.endsWith('.js'))continue;
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/\.execute\s*\(\s*/g)){
   const start=match.index+match[0].length,quote=source[start];
   const entry={file:path.relative(root,file).replaceAll('\\','/'),line:source.slice(0,match.index).split('\n').length};
   if(!["'",'"','`'].includes(quote)){dynamic.push(entry);continue;}
   let end=start+1,interpolated=false;
   for(;end<source.length;end++){
    if(source[end]==='\\'){end++;continue;}
    if(quote==='`'&&source.startsWith('${',end))interpolated=true;
    if(source[end]===quote)break;
   }
   // Apenas um literal completo, nunca concatenações, templates com código ou expressões.
   if(interpolated||!/^\s*[,)]/.test(source.slice(end+1))){dynamic.push(entry);continue;}
   literal.push({...entry,sql:vm.runInNewContext(source.slice(start,end+1),Object.create(null),{timeout:100})});
  }
 }}walk(path.join(root,'backend/src'));
 return {literal,dynamic};
}
module.exports={inventory};
