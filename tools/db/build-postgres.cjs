/* Consolida esquema e manifestos atuais; saída revisável, somente para banco PostgreSQL novo. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {tokens,render,split,close}=require('../../backend/src/database/sql-lexer');
const {expressions}=require('../../backend/src/database/postgres-dialect');
const source=fs.readFileSync(path.join(root,'backend/schema.sql'),'utf8');
const list=tokens(source),tables=new Map();
for(let i=0;i<list.length;i++) {
    if(list[i].text.toUpperCase()==='CREATE' && list[i+1]?.text.toUpperCase()==='TABLE') {
        let at=i+2;if(list[at].text.toUpperCase()==='IF')at+=3;
        const name=list[at].text,end=close(list,at+1);
        if(tables.has(name))throw Error('Tabela repetida: '+name);
        tables.set(name,split(list.slice(at+2,end)));i=end;
    }
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'backend/db/migrations/1.1.31.json'),'utf8'));
for(const [name,body] of Object.entries(manifest.tables)) if(!tables.has(name))tables.set(name,split(tokens(body)));
if(!tables.has('tarefa_arquivos'))tables.set('tarefa_arquivos',split(tokens('id_tarefa INT NOT NULL PRIMARY KEY,arquivada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(id_tarefa) REFERENCES tarefas(id_tarefa) ON DELETE CASCADE')));
if(!tables.get('academico_publicacoes').some(c=>c[0].text==='tipo_atividade'))tables.get('academico_publicacoes').push(tokens('tipo_atividade VARCHAR(30) NULL'));
/* Ampliações posteriores aos manifestos históricos ficam na definição final, não em ALTERs repetidos. */
for (const table of ['academico_catalogo_disciplinas','academico_disciplinas']) {
    const parts=tables.get(table),at=parts.findIndex(part=>part[0].text==='nome');
    parts[at]=tokens('nome VARCHAR(150) NOT NULL');
}
/* Nenhum manifesto histórico pode perder uma coluna na consolidação. */
for(const file of fs.readdirSync(path.join(root,'backend/db/migrations')).filter(name=>name.endsWith('.json'))) {
    const migration=JSON.parse(fs.readFileSync(path.join(root,'backend/db/migrations',file),'utf8'));
    for(const column of migration.columns || []) {
        if(!tables.get(column.table)?.some(part=>part[0].text===column.name))
            throw Error('Coluna ausente de '+file+': '+column.table+'.'+column.name);
    }
}
const output=['-- PostgreSQL: esquema consolidado. Aplicar apenas em banco novo vazio.','BEGIN;','CREATE EXTENSION IF NOT EXISTS citext;'];
const later=[],indexes=[],updates=[],catalog={};
for(const [table,parts] of tables) {
    const columns=[],definitions=[],constraints=[],unique=[];let primary=[],identity;
    for(const part of parts) {
        const head=part[0].text.toUpperCase(), raw=render(part);
        if(/^(CONSTRAINT\b.*)?FOREIGN\b/i.test(raw.replace(/^CONSTRAINT\s+\w+\s+/i,''))) {later.push('ALTER TABLE '+table+' ADD '+raw+';');continue;}
        if(['KEY','INDEX','FULLTEXT'].includes(head)) {
            const at=part.findIndex(t=>t.text==='(');const name=part[at-1].text;
            indexes.push('CREATE INDEX '+table+'_'+name+' ON '+table+' ('+render(part.slice(at+1,-1))+');');continue;
        }
        if(head==='UNIQUE') {
            const at=part.findIndex(t=>t.text==='('),names=split(part.slice(at+1,-1)).map(render);
            const name=part.slice(1,at).filter(t=>!['KEY','INDEX'].includes(t.text.toUpperCase())).map(t=>t.text).join('');
            constraints.push((name?'CONSTRAINT '+name+' ':'')+'UNIQUE ('+names.join(',')+')');unique.push(names);continue;
        }
        if(head==='PRIMARY') { primary=split(part.slice(part.findIndex(t=>t.text==='(')+1,-1)).map(render);constraints.push(raw);continue; }
        if(head==='CONSTRAINT'||head==='CHECK') {constraints.push(raw);continue;}
        const name=part[0].text,type=part[1].text.toUpperCase();let i=2,legacy=type.toLowerCase(),pgType,options;
        if(part[i]?.text==='(') {const end=close(part,i);options=part.slice(i+1,end);legacy+=render(part.slice(i,end+1)).replace(/\s+/g,'');i=end+1;}
        const tail=part.slice(i);let rest=render(tail);
        const binary=/COLLATE\s+\w*bin\b/i.test(rest),unsigned=/\bUNSIGNED\b/.test(rest),auto=/AUTO_INCREMENT/.test(rest);
        if(type==='ENUM'||type==='SET') {
            const choices=split(options).map(render);pgType='text';
            constraints.push('CHECK ('+(type==='ENUM'?name+' IN ('+choices.join(',')+')':"string_to_array("+name+",',') <@ ARRAY["+choices.join(',')+"]::text[]")+')');
        } else if(['VARCHAR','CHAR'].includes(type)) {
            const size=Number(options?.[0]?.text);pgType=binary?type+'('+size+')':'citext';constraints.push('CHECK (char_length('+name+')<='+size+')');
        } else if(type==='BOOLEAN') {pgType='smallint';constraints.push('CHECK ('+name+' IN (0,1))');}
        else if(['TINYINT','SMALLINT','MEDIUMINT','INT','INTEGER','BIGINT'].includes(type)) {pgType=type==='BIGINT'?'bigint':type==='TINYINT'?'smallint':unsigned&&type==='INT'?'bigint':'integer';if(unsigned)constraints.push('CHECK ('+name+'>=0)');}
        else if(['TEXT','MEDIUMTEXT','LONGTEXT'].includes(type))pgType='text';
        else if(['BLOB','MEDIUMBLOB','LONGBLOB'].includes(type))pgType='bytea';
        else if(['DATETIME','TIMESTAMP'].includes(type))pgType='timestamp without time zone';
        else if(type==='JSON')pgType='jsonb';
        else if(['DATE','TIME','DECIMAL','FLOAT','DOUBLE'].includes(type))pgType=type.toLowerCase()+(options?'('+render(options)+')':'');
        else throw Error('Tipo não mapeado '+table+'.'+name+': '+type);
        rest=rest.replace(/CHARACTER SET\s+\w+/ig,'').replace(/COLLATE\s+\w+/ig,'').replace(/\bUNSIGNED\b/ig,'').replace(/AUTO_INCREMENT/ig,'').replace(/ON UPDATE CURRENT_TIMESTAMP/ig,'').replace(/\bTRUE\b/g,'1').replace(/\bFALSE\b/g,'0');
        if(/ON UPDATE CURRENT_TIMESTAMP/i.test(raw))updates.push({table,name});
        if(auto){identity=name;rest='GENERATED BY DEFAULT AS IDENTITY '+rest;}
        if(/GENERATED ALWAYS/i.test(rest))rest=render(expressions(tokens(rest)));
        definitions.push(name+' '+pgType+' '+rest);
        if(/PRIMARY KEY/i.test(rest))primary=[name];
        if(/\bUNIQUE\b/.test(rest))unique.push([name]);
        const defaultMatch=rest.match(/DEFAULT\s+('(?:[^']|'')*'|[\w.]+)/i);
        columns.push({name,type:legacy,pgType,nullable:!/NOT NULL|PRIMARY KEY/i.test(rest),default:defaultMatch?defaultMatch[1]:null,generated:/GENERATED ALWAYS/i.test(rest),identity:!!auto});
    }
    catalog[table]={columns,primary,identity,unique,conflict:primary.length?primary:unique[0]};
    output.push('CREATE TABLE '+table+' (\n    '+[...definitions,...constraints].join(',\n    ')+'\n);');
}
// Alvos explícitos de upsert, em vez de escolher silenciosamente outra restrição.
for(const [table,key] of Object.entries({projeto_inscricoes:['id_projeto','id_usuario'],documento_salvos:['id_usuario','id_item'],academico_convites:['id_disciplina','email'],perfil_compartilhamento:['id_usuario']}))catalog[table].conflict=key;
output.push(...later,...indexes);
output.push("CREATE FUNCTION arcadia_touch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.atualizado_em=LOCALTIMESTAMP; RETURN NEW; END $$;");
for(const {table,name} of updates){if(name!=='atualizado_em')throw Error('Coluna de atualização não esperada.');output.push('CREATE TRIGGER '+table+'_touch BEFORE UPDATE ON '+table+' FOR EACH ROW EXECUTE FUNCTION arcadia_touch();');}
output.push(fs.readFileSync(path.join(root,'backend/db/postgres/triggers.sql'),'utf8'));
// Views consolidadas e dados de referência são separados da importação de dados reais.
for(let i=0;i<list.length;i++)if(list[i].text.toUpperCase()==='CREATE'&&list[i+1]?.text.toUpperCase()==='VIEW'){let end=i;while(end<list.length&&list[end].text!==';')end++;output.push(render(expressions(list.slice(i,end))).replace(/NULL AS id_usuario/g,'CAST(NULL AS integer) AS id_usuario')+';');i=end;}
output.push('COMMIT;');
const target=path.join(root,'backend/db/postgres');fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'schema.sql'),output.join('\n\n')+'\n');
fs.writeFileSync(path.join(root,'backend/src/database/postgres-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
const seeds=[];
for(let i=0;i<list.length;i++)if(list[i].text.toUpperCase()==='INSERT') {
    const ignore=list[i+1]?.text.toUpperCase()==='IGNORE',into=i+(ignore?2:1);
    if(list[into]?.text.toUpperCase()!=='INTO'||!['cursos','links_uteis','seguranca_email_lock','documento_armazenamento'].includes(list[into+1]?.text))continue;
    let end=i;while(end<list.length&&list[end].text!==';')end++;
    let statement=list.slice(i,end);if(ignore)statement=statement.filter((_,index)=>index!==1);
    seeds.push(render(expressions(statement))+(ignore?' ON CONFLICT DO NOTHING':'')+';');i=end;
}
const durations=fs.readFileSync(path.join(root,'backend/db/pending/course-durations-2026.sql'),'utf8');seeds.push(render(tokens(durations)));
fs.writeFileSync(path.join(target,'seed.sql'),seeds.join('\n')+'\n');
console.log(Object.keys(catalog).length+' tabelas consolidadas em backend/db/postgres/schema.sql');
