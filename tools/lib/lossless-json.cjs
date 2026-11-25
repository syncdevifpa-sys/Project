/* Canonicalização sem converter números JSON para double do JavaScript. */
function canonicalJson(input) {
 let i=0;const source=String(input),space=()=>{while(/\s/.test(source[i]||'')&&i<source.length)i++;};
 function string(){const start=i++;while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i++]==='"'){const value=JSON.parse(source.slice(start,i));if(value.includes('\0'))throw new Error('JSON com NUL exige revisão.');return value;}}throw new Error('String JSON incompleta.');}
 function value(depth=0){
  if(depth>200)throw new Error('JSON excede profundidade de revisão.');space();
  if(source[i]==='"')return JSON.stringify(string());
  if(source[i]==='{'){
   i++;space();const entries=new Map();if(source[i]!=='}')for(;;){space();if(source[i]!=='"')throw new Error('Chave JSON inválida.');const key=string();space();if(source[i++]!==':')throw new Error('Objeto JSON inválido.');entries.set(key,value(depth+1));space();if(source[i]!==',')break;i++;}
   if(source[i++]!=='}')throw new Error('Objeto JSON incompleto.');return '{'+[...entries.keys()].sort().map(key=>JSON.stringify(key)+':'+entries.get(key)).join(',')+'}';
  }
  if(source[i]==='['){i++;space();const entries=[];if(source[i]!==']')for(;;){entries.push(value(depth+1));space();if(source[i]!==',')break;i++;}if(source[i++]!==']')throw new Error('Array JSON incompleto.');return '['+entries.join(',')+']';}
  for(const word of ['null','true','false'])if(source.startsWith(word,i)){i+=word.length;return word;}
  const match=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
  if(!match)throw new Error('Valor JSON inválido.');i+=match[0].length;
  const negative=match[0].startsWith('-'),unsigned=negative?match[0].slice(1):match[0];
  const [mantissa,power='0']=unsigned.toLowerCase().split('e'),[whole,fraction='']=mantissa.split('.');
  let exponent=Number(power)-fraction.length,digits=(whole+fraction).replace(/^0+/,'');
  if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>100000)throw new Error('Expoente JSON exige revisão.');
  if(!digits)return '0';while(digits.endsWith('0')){digits=digits.slice(0,-1);exponent++;}
  return (negative?'-':'')+digits+'e'+exponent;
 }
 const result=value();space();if(i!==source.length)throw new Error('Conteúdo extra após JSON.');return result;
}
module.exports={canonicalJson};
