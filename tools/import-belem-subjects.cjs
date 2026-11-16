/* Gera SQL revisável; não abre conexão nem grava em bancos. */
const fs=require('node:fs'),path=require('node:path');
function prepare(catalog,{allowRepeatedCodes=false}={}) {
    const source=new URL(catalog.fonte);
    if(source.hostname!=='sigaa.ifpa.edu.br'||source.protocol!=='https:'||catalog.campus!=='Belém')throw Error('Fonte ou campus inválido.');
    if(!Array.isArray(catalog.disciplinas)||!catalog.disciplinas.length)throw Error('Catálogo vazio.');
    const seen=new Set(),names=new Map();
    for(const row of catalog.disciplinas){
        if(!/^[A-Z0-9._-]+$/.test(row.codigo)||(!allowRepeatedCodes&&seen.has(row.codigo)))throw Error('Código inválido ou repetido.');
        seen.add(row.codigo);
        if(typeof row.nome!=='string'||!row.nome.trim()||row.nome.length>150||/[\x00-\x1f]/.test(row.nome)||(row.periodo!==null&&(!Number.isInteger(row.periodo)||row.periodo<0))||!Number.isInteger(row.carga_horaria)||row.carga_horaria<0||!['Obrigatória','Optativa','Eletiva','Não informada'].includes(row.natureza))throw Error('Disciplina inválida: '+row.codigo);
        const name=row.nome.normalize('NFKC').replace(/\s+/g,' ').trim(),key=name.toLowerCase();
        names.set(key,{name,key});
    }
    const quote=s=>"'"+s.replaceAll("'","''")+"'";
    const mysqlValue=s=>'CONVERT(0x'+Buffer.from(s,'utf8').toString('hex')+' USING utf8mb4)';
    const header='-- Fonte: '+catalog.fonte+'\n-- Matriz '+catalog.matriz+' · '+catalog.curso+' · Campus Belém\n-- Só catálogo: não cria turmas, ofertas, professores nem matrículas.\n-- Aplicar subject-catalog-length.sql no MySQL antes deste arquivo.\n-- Preserva registros existentes; revisar antes de executar no banco escolhido.\n';
    const mysql=header+'START TRANSACTION;\n'+[...names.values()].map(r=>
        'INSERT INTO academico_catalogo_disciplinas(nome,nome_chave,legado,ativo) SELECT '+mysqlValue(r.name)+','+mysqlValue(r.key)+",FALSE,TRUE WHERE NOT EXISTS (SELECT 1 FROM academico_catalogo_disciplinas WHERE LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '))="+mysqlValue(r.key)+') ON DUPLICATE KEY UPDATE id_catalogo=id_catalogo;'
    ).join('\n')+'\nCOMMIT;\n';
    const postgres=header+'BEGIN;\n'+[...names.values()].map(r=>
        'INSERT INTO academico_catalogo_disciplinas(nome,nome_chave,legado,ativo) SELECT '+quote(r.name)+','+quote(r.key)+",0,1 WHERE NOT EXISTS (SELECT 1 FROM academico_catalogo_disciplinas WHERE LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ','g'))="+quote(r.key)+') ON CONFLICT (nome_chave) DO NOTHING;'
    ).join('\n')+'\nCOMMIT;\n';
    return {mysql,postgres,count:names.size};
}
function prepareAll(data) {
    if(data.campus!=='Belém')throw Error('Campus inválido.');
    const rows=data.cursos.flatMap(c=>c.matrizes.flatMap(m=>m.disciplinas||[]));
    const result=prepare({fonte:'https://sigaa.ifpa.edu.br/sigaa/public/curso/lista.jsf',campus:'Belém',curso:'Cursos públicos de Belém',matriz:'Matrizes públicas técnicas, graduação e mestrado',disciplinas:rows},{allowRepeatedCodes:true});
    return {...result,records:rows.length,matrices:data.cursos.flatMap(c=>c.matrizes).filter(m=>m.disciplinas?.length).length,courses:data.cursos.filter(c=>c.matrizes.some(m=>m.disciplinas?.length)).length};
}
if(require.main===module){
    const file=path.resolve(process.argv[2]||'backend/catalog/belem-curriculos-sigaa.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));
    const result=data.cursos?prepareAll(data):prepare(data);
    fs.writeFileSync('backend/admin/import-belem-subjects.mysql.sql',result.mysql);
    if(process.argv.includes('--postgres')) {
        fs.mkdirSync('backend/db/postgres',{recursive:true});
        fs.writeFileSync('backend/db/postgres/import-belem-subjects.sql',result.postgres);
    }
    console.log(JSON.stringify({names:result.count,records:result.records,matrices:result.matrices,courses:result.courses}));
    console.log('Nenhum banco alterado.');
}
module.exports={prepare,prepareAll};
