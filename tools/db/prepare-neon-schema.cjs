/* Prepara dump schema-only do pgAdmin para revisão e execução transacional no MCP.
 * Não conecta a bancos. Nunca aceita dados, roles, limpeza ou comandos psql arbitrários.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const folder = path.join(root, 'output/neon-migration-preparation');
const source = fs.readFileSync(path.join(folder, 'arcadiabd-local-schema.sql'), 'utf8');
const sql = source.split(/\r?\n/).filter(line => {
    if (!line.startsWith('\\')) return true;
    if (/^\\(?:un)?restrict\s+\S+$/.test(line)) return false;
    throw Error('Comando psql não permitido no dump.');
}).join('\n');

function statements(input) {
    const result = [];
    let start = 0, i = 0;
    while (i < input.length) {
        if (input.startsWith('--', i)) { const end=input.indexOf('\n', i); i=end<0?input.length:end+1; continue; }
        if (input.startsWith('/*', i)) {
            let depth=1; i+=2;
            while(i<input.length && depth) { if(input.startsWith('/*',i)){depth++;i+=2;}else if(input.startsWith('*/',i)){depth--;i+=2;}else i++; }
            if(depth)throw Error('Comentário incompleto.'); continue;
        }
        if (input[i]==="'" || input[i]==='"') {
            const quote=input[i++]; let closed=false;
            while(i<input.length){if(input[i]===quote){if(input[i+1]===quote){i+=2;continue;}i++;closed=true;break;}i++;}
            if(!closed)throw Error('Literal incompleto.'); continue;
        }
        if(input[i]==='$') {
            const match=/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(input.slice(i));
            if(match){const end=input.indexOf(match[0],i+match[0].length);if(end<0)throw Error('Bloco dollar-quoted incompleto.');i=end+match[0].length;continue;}
        }
        if(input[i]===';'){result.push(input.slice(start,i+1));start=++i;}else i++;
    }
    const trailing=input.slice(start).replace(/--[^\n]*/g,'').trim();
    if(trailing)throw Error('Instrução final sem terminador.');
    return result;
}

const parts=statements(sql);
const clean=statement=>statement.replace(/--[^\n]*/g,'').trim();
for(const statement of parts) {
    const text=clean(statement);
    if(!/^(?:SET\s|SELECT pg_catalog\.set_config\(|CREATE (?:EXTENSION|FUNCTION|TABLE|VIEW|(?:UNIQUE )?INDEX|TRIGGER)\s|COMMENT ON\s|ALTER TABLE\s)/i.test(text))
        throw Error('Instrução fora da lista de estrutura permitida: '+text.slice(0,80));
    if(/^ALTER TABLE/i.test(text) && /\b(?:DROP|OWNER|DISABLE|TRUNCATE)\b/i.test(text))throw Error('ALTER não permitido.');
}
const guard=`DO $$ BEGIN
 IF current_database() <> 'arcadiabd' THEN RAISE EXCEPTION 'Banco incorreto'; END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')) THEN
  RAISE EXCEPTION 'Destino deve estar vazio; nenhuma estrutura existente será substituída';
 END IF;
END $$;`;
const payload=[guard,...parts];
fs.writeFileSync(path.join(folder,'neon-schema-statements.json'),JSON.stringify(payload));
fs.writeFileSync(path.join(folder,'neon-schema-only.sql'),'-- Somente na branch dev/arcadia-postgres-migration / arcadiabd, nunca em production.\nBEGIN;\n'+payload.join('\n')+'\nCOMMIT;\n');
const report={source:'arcadiabd-local-schema.sql',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),schemaSha256:crypto.createHash('sha256').update(payload.join('\n')).digest('hex'),statements:payload.length,tables:(sql.match(/^CREATE TABLE /gm)||[]).length,views:(sql.match(/^CREATE VIEW /gm)||[]).length,functions:(sql.match(/^CREATE FUNCTION /gm)||[]).length,triggers:(sql.match(/^CREATE TRIGGER /gm)||[]).length};
fs.writeFileSync(path.join(folder,'schema-preparation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
