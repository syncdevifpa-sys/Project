const fs=require('node:fs'),path=require('node:path');
const {inventory}=require('../lib/backend-sql-inventory.cjs');
const result=inventory(),folder=path.resolve(__dirname,'../../output/postgres-validation');
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'sql-inventory.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({literal:result.literal.length,dynamic:result.dynamic.length,report:'output/postgres-validation/sql-inventory.json'}));
