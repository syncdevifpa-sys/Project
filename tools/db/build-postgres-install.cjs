/* Monta uma instalação vazia atômica, com rastreabilidade das fontes convertidas. */
const fs=require('node:fs'),path=require('node:path');
const {hashText:hash}=require('../lib/postgres-manifest.cjs');
const root=path.resolve(__dirname,'../..'),target=path.join(root,'backend/db/postgres');
require('./build-postgres.cjs');
const {prepareAll}=require('../import-belem-subjects.cjs');
const prepared=prepareAll(JSON.parse(fs.readFileSync(path.join(root,'backend/catalog/belem-curriculos-sigaa.json'),'utf8')));
fs.writeFileSync(path.join(target,'import-belem-subjects.sql'),prepared.postgres);
const sourceNames=['backend/schema.sql','backend/catalog/belem-curriculos-sigaa.json','backend/db/postgres/triggers.sql',
 ...fs.readdirSync(path.join(root,'backend/db/migrations')).filter(name=>name.endsWith('.json')).map(name=>'backend/db/migrations/'+name),
 ...fs.readdirSync(path.join(root,'backend/db/pending')).filter(name=>name.endsWith('.sql')).map(name=>'backend/db/pending/'+name)].sort();
/* Uma migração nova exige revisão explícita, para não anunciar cobertura sem convertê-la. */
const reviewed=['1.1.33-course-stages.sql','account-audit.sql','account-names.sql','course-durations-2026.sql','document-authorship.sql','document-library-audiences.sql','google-workspace.sql','project-cover.sql','project-pinning.sql','subject-catalog-length.sql','tasks-archive-class-activities.sql'];
for(const file of sourceNames.filter(name=>name.startsWith('backend/db/pending/')))if(!reviewed.includes(path.basename(file)))throw Error('Migração pendente ainda não revisada: '+file);
const sources=sourceNames.map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const withoutTransaction=sql=>sql.replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
const schema=withoutTransaction(fs.readFileSync(path.join(target,'schema.sql'),'utf8'));
const seed=fs.readFileSync(path.join(target,'seed.sql'),'utf8');
const catalog=withoutTransaction(prepared.postgres);
const manifest={baseline:'postgres-inicial-1',checksumAlgorithm:'sha256-utf8-lf',tables:52,courses:48,subjects:prepared.count,sources,sha256:hash(schema+seed+catalog)};
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const sql=`-- Arcádia: instalação PostgreSQL consolidada, SOMENTE em banco vazio.
-- Não transfere usuários, senhas, publicações ou documentos da produção.
-- Não reaplicar as migrações MySQL. O backend ainda precisa ser adaptado ao PostgreSQL.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relkind IN ('r','p','v','m','f')) THEN
  RAISE EXCEPTION 'A instalação exige um esquema vazio. Nenhum dado existente foi alterado.';
 END IF;
END $$;
${schema}
${seed}
${catalog}
-- Registro próprio de consolidação; não simula execuções de migrações MySQL.
CREATE TABLE arcadia_postgres_baselines (
 versao text PRIMARY KEY, checksum char(64) NOT NULL, fontes jsonb NOT NULL,
 instalado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO arcadia_postgres_baselines(versao,checksum,fontes) VALUES(${quote(manifest.baseline)},${quote(manifest.sha256)},${quote(JSON.stringify(sources))}::jsonb);
COMMIT;
`;
fs.writeFileSync(path.join(target,'instalacao-completa.sql'),sql);
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Instalação única gerada: 52 tabelas do portal + registro da consolidação, '+prepared.count+' disciplinas.');
