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
const accessPath=path.join(base,'db/migrations/1.1.27.json');
if(fs.existsSync(accessPath)) {
    const access=JSON.parse(fs.readFileSync(accessPath,'utf8'));
    fs.writeFileSync(path.join(base,'db/migrations/1.1.27.sql'),require('../lib/external-access-migration.cjs').generate(access));
    schema+=`INSERT INTO arcadia_schema_migrations(versao,checksum) VALUES ('${access.version}','${checksum(access)}');\n`;
    fs.writeFileSync(schemaPath,schema);
    console.log('Migracao 1.1.27 tambem gerada offline.');
}
const visibility=require('../../backend/db/migrations/1.1.28.json');
fs.writeFileSync(path.join(base,'db/migrations/1.1.28.sql'),require('../lib/calendar-visibility-migration.cjs').generate(visibility));
schema+=`INSERT INTO arcadia_schema_migrations(versao,checksum) VALUES ('${visibility.version}','${checksum(visibility)}');\n`;
fs.writeFileSync(schemaPath,schema);
const accounts=require('../../backend/db/migrations/1.1.29.json');
fs.writeFileSync(path.join(base,'db/migrations/1.1.29.sql'),require('../lib/account-link-migration.cjs').generate(accounts));
schema+=`INSERT INTO arcadia_schema_migrations(versao,checksum) VALUES ('${accounts.version}','${checksum(accounts)}');\n`;
fs.writeFileSync(schemaPath,schema);

console.log('Visibilidade e vínculo: 1.1.28 e 1.1.29 preparados offline. Nenhum banco acessado.');
