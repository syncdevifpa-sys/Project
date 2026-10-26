// Match only the two generated rules in 1.1.31. Never normalize arbitrary SQL.
const fs=require('node:fs'),path=require('node:path');
const space='[ \\t\\r\\n]*';
const insensitive=text=>[...text].map(c=>/[a-z]/i.test(c)?'['+c.toLowerCase()+c.toUpperCase()+']':c).join('');
const identifier=name=>'(?:'+insensitive(name)+'|`'+insensitive(name)+'`)';
const parens=expression=>'(?:'+expression+'|\\('+space+expression+space+'\\)|\\('+space+'\\('+space+expression+space+'\\)'+space+'\\))';
function pattern(column){
 let condition,result;
 if(column==='id_curso_ativo'){condition=parens(identifier('ativa'));result=identifier('id_curso');}
 else if(column==='turma_pendente'){
  // Backslashes, when present in metadata, are accepted only as the paired
  // serialization of these two literal quote delimiters. No global unescape.
  const literal="(?:'pendente'|\\\\'pendente\\\\')";
  const equality=identifier('estado')+space+'='+space+'(?:'+insensitive('_utf8mb4')+space+')?'+literal;
  condition=parens(equality);result=identifier('id_turma');
 }else throw new Error('Regra gerada não reconhecida: '+column);
 return '^'+space+insensitive('if')+space+'\\('+space+condition+space+','+space+result+space+','+space+insensitive('null')+space+'\\)'+space+'$';
}
function predicate(column,expression='GENERATION_EXPRESSION'){
 if(expression!=='GENERATION_EXPRESSION')throw new Error('Origem de metadados não reconhecida.');
 const hex=Buffer.from(pattern(column),'utf8').toString('hex');
 return `REGEXP_LIKE(CONVERT(${expression} USING utf8mb4) COLLATE utf8mb4_bin,CONVERT(0x${hex} USING utf8mb4) COLLATE utf8mb4_bin,'c')`;
}
function buildRecovery(original){
 let count=0;
 const result=original.replace(/^.*IF NOT EXISTS\(SELECT 1 FROM information_schema\.COLUMNS.*GENERATION_EXPRESSION.*Expressao gerada divergente: (id_curso_ativo|turma_pendente).*$/gm,(line,column)=>{
  count++;
  const table=column==='id_curso_ativo'?'academico_vinculos_turma':'academico_pedidos_ingresso';
  return ` IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND COLUMN_NAME='${column}' AND ${predicate(column)}) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Expressao gerada divergente: ${column}'; END IF;`;
 });
 if(count!==2)throw new Error('Esperadas exatamente duas validações; arquivo original não reconhecido.');
 return '-- Recuperacao R1: substitui somente os comparadores de expressoes geradas.\n-- Mantem manifesto/checksum, estrutura e dados. Ler o diagnostico antes de executar.\n'+result;
}
function diagnostic(){return `-- SOMENTE LEITURA. Mesma conexao/banco da falha; nao executar CALL ainda.\nSELECT DATABASE() AS banco,VERSION() AS mysql,@@SESSION.sql_mode AS modo_sql;\nSELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,EXTRA,GENERATION_EXPRESSION,\n HEX(GENERATION_EXPRESSION) AS expressao_hex,\n ${predicate('turma_pendente')} AS expressao_compativel_r1\nFROM information_schema.COLUMNS\nWHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_pedidos_ingresso' AND COLUMN_NAME='turma_pendente';\nSHOW CREATE TABLE academico_pedidos_ingresso;\nSELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao IN ('1.1.30','1.1.31');\n`;}
function writeFile(file,content){if(fs.existsSync(file)&&fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')===content)return;const temporary=file+'.tmp';fs.writeFileSync(temporary,content);fs.renameSync(temporary,file);}
function writeRecovery(original){const directory='backend/db/workbench/1.1.31';fs.mkdirSync(directory,{recursive:true});writeFile(path.join(directory,'resume-generated-expression-r1.sql'),buildRecovery(original));writeFile('backend/db/checks/1.1.31-generated-expression-diagnostic.sql',diagnostic());}
module.exports={pattern,predicate,buildRecovery,diagnostic,writeRecovery};
