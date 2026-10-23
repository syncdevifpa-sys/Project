// Somente geração de arquivos. Nenhuma conexão com MySQL é criada.
const fs = require('node:fs');
const path = require('node:path');
const { generate, checksum } = require('../lib/migration-sql.cjs');
const base = path.resolve(__dirname,'../../backend');
const spec = JSON.parse(fs.readFileSync(path.join(base,'db/migrations/1.1.25.json'),'utf8'));
fs.writeFileSync(path.join(base,'db/migrations/1.1.25.sql'),generate(spec));
const schemaPath = path.join(base,'schema.sql');
let schema = fs.readFileSync(schemaPath,'utf8').replace(/\n-- Registro da instalacao consolidada[\s\S]*$/,'');
schema += `\n-- Registro da instalacao consolidada (somente banco NOVO).\nCREATE TABLE arcadia_schema_migrations (\n versao VARCHAR(32) PRIMARY KEY,checksum CHAR(64) NOT NULL,verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n) ENGINE=InnoDB;\nINSERT INTO arcadia_schema_migrations(versao,checksum) VALUES ('${spec.version}','${checksum(spec)}');\n`;
fs.writeFileSync(schemaPath,schema);
const nextPath=path.join(base,'db/migrations/1.1.26.json');
if(fs.existsSync(nextPath)) {
    const next=JSON.parse(fs.readFileSync(nextPath,'utf8'));
    fs.writeFileSync(path.join(base,'db/migrations/1.1.26.sql'),require('../lib/calendar-reminder-migration.cjs').generate(next));
    schema+=`INSERT INTO arcadia_schema_migrations(versao,checksum) VALUES ('${next.version}','${checksum(next)}');\n`;
    fs.writeFileSync(schemaPath,schema);
}
console.log('Schema novo e migracoes 1.1.25 e 1.1.26 preparados offline. Nenhum SQL foi executado.');
