const { types } = require('pg');
function safeInteger(value) {
    const number=Number(value);
    return Number.isSafeInteger(number)?number:value;
}
// Não alterar parsers globais: preservar DATE/timestamp sem fuso literalmente.
const postgresTypes={getTypeParser(oid,format){
    if(format!=='binary'&&oid===20)return safeInteger;
    if(format!=='binary'&&[1082,1114].includes(oid))return value=>value;
    return types.getTypeParser(oid,format);
}};
module.exports={postgresTypes,safeInteger};
