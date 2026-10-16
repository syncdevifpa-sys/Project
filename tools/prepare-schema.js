const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '..', 'backend');
const schema = fs
    .readFileSync(path.join(backend, 'schema.sql'), 'utf8')
    .replace(/^CREATE DATABASE IF NOT EXISTS arcadia[\s\S]*?;/m, '')
    .replace(/^USE arcadia;\s*/m, '');
if (/\bDROP\s+(DATABASE|TABLE)\b/i.test(schema))
    throw new Error('Esquema contém instruções destrutivas.');
fs.writeFileSync(path.join(backend, 'schema.generated.sql'), schema);
console.log(
    'backend/schema.generated.sql preparado sem CREATE DATABASE, USE ou DROP. Revise e importe somente em um banco novo já selecionado.'
);
