/* Levantamento estático: lê código, não conecta nem altera bancos. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const patterns = {
    placeholders: /\.execute\s*\(/,
    insertId: /\binsertId\b/,
    affectedRows: /\baffectedRows\b/,
    upsert: /ON DUPLICATE KEY|INSERT IGNORE/i,
    dates: /DATE_ADD|DATE_SUB|DATE_FORMAT|TIMESTAMPDIFF|DATEDIFF|CURDATE|UTC_TIMESTAMP/i,
    json: /JSON_EXTRACT|JSON_UNQUOTE|JSON_SET|JSON_CONTAINS/i,
    introspection: /INFORMATION_SCHEMA|SHOW (?:COLUMNS|TABLES|INDEX)|DATABASE\(\)/i,
    mysqlDdl: /AUTO_INCREMENT|UNSIGNED|ENGINE=|DELIMITER|ON UPDATE CURRENT_TIMESTAMP|ENUM\(/i,
    mysqlErrors: /ER_[A-Z_]+/,
    collation: /COLLATE|LIKE|LOWER\(/i
};
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
const files = [...walk(path.join(root,'backend/src')), path.join(root,'backend/schema.sql')].filter(f => /\.(js|sql)$/.test(f));
const findings = [];
for (const file of files) {
    fs.readFileSync(file,'utf8').split(/\r?\n/).forEach((line,i) => {
        for (const [category,pattern] of Object.entries(patterns)) {
            if (pattern.test(line)) findings.push({ file: path.relative(root,file).replaceAll('\\','/'), line: i+1, category });
        }
    });
}
const counts = Object.fromEntries(Object.keys(patterns).map(k => [k, findings.filter(f => f.category===k).length]));
const output = path.join(root,'output/postgres-audit.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({ note:'Ocorrências estáticas para revisão; não equivalem a consultas únicas nem a conversão concluída.', counts, findings },null,2));
console.log(JSON.stringify(counts,null,2));
console.log('Relatório: output/postgres-audit.json');
