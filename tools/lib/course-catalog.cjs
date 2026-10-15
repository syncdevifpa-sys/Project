function aliases(course){
    const names=[course.nome];
    const degree=course.nome.match(/^(Bacharelado|Licenciatura|Tecnologia) em (.+)$/);
    if(degree)names.push(degree[2],degree[2]+' ('+degree[1]+')');
    const technical=course.nome.match(/^(Técnico em .+) \((Integrado|Subsequente)\)$/);
    if(technical)names.push(technical[1]+' - '+technical[2],technical[1]+' '+technical[2]+' ao Ensino Médio');
    return names;
}
const normalize=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function plan(existing,catalog){
    const missing=[],preserved=[],conflicts=[];
    for(const course of catalog.courses){
        const names=aliases(course).map(normalize);
        const found=existing.find(row=>names.includes(normalize(row.nome)));
        if(!found)missing.push(course);
        else {preserved.push(found);if(found.nivel!==course.nivel)conflicts.push({id_curso:found.id_curso,nome:found.nome,actual:found.nivel,expected:course.nivel});}
    }
    return {missing,preserved,conflicts};
}
function sql(catalog){
    const quote=value=>value===undefined?'NULL':"'"+value.replace(/'/g,"''")+"'";
    const rows=catalog.courses.map((course,index)=>{
        const names=aliases(course);
        return 'SELECT '+[quote(course.nome)+(index?'':' AS nome'),quote(course.nivel)+(index?'':' AS nivel'),...Array.from({length:3},(_,i)=>quote(names[i])+(index?'':' AS alias'+i))].join(', ');
    }).join('\nUNION ALL\n');
    return `-- Catálogo com oferta comprovada em Belém em 2026. Fontes: backend/catalog/belem-courses-2026.json.
-- 1. Confira o banco selecionado e a lista real antes de autorizar a etapa de inclusão.
SELECT DATABASE() AS banco_selecionado;
SELECT id_curso, nome, nivel, ativo FROM cursos ORDER BY nome;
-- 2. Mude apenas esta variável para TRUE depois de confirmar que há somente os dois cursos.
SET @arcadia_course_catalog_confirmed = FALSE;
START TRANSACTION;
SELECT id_curso FROM cursos ORDER BY id_curso FOR UPDATE;
SET @arcadia_course_initial_count = (SELECT COUNT(*) FROM cursos);
INSERT INTO cursos (nome, nivel, ativo)
SELECT c.nome, c.nivel, TRUE FROM (
${rows}
) c
WHERE @arcadia_course_catalog_confirmed = TRUE
  AND @arcadia_course_initial_count = 2
  AND NOT EXISTS (SELECT 1 FROM cursos u WHERE u.nome IN (c.alias0, c.alias1, c.alias2));
SELECT ROW_COUNT() AS cursos_incluidos;
SELECT id_curso, nome, nivel, ativo FROM cursos ORDER BY nome;
-- 3. Revise o resultado. Por padrão desfaz; use COMMIT somente ao aprovar a inclusão.
ROLLBACK;
`;
}
module.exports={aliases,plan,sql};
