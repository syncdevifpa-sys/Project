const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const search=require('../frontend/js/global-search');
test('urgente precede fixado e datas ordenam conteúdos com a mesma prioridade',()=>{
 const scope={window:{Arcadia:{}}};vm.runInNewContext(fs.readFileSync('frontend/js/notice-filters.js','utf8'),scope);
 const rows=[{id_aviso:1,fixado:1,data_publicacao:'2026-11-15'},{id_aviso:2,urgente:1,data_publicacao:'2026-11-13'},{id_aviso:3,urgente:1,data_publicacao:'2026-11-14'},{id_aviso:4,data_publicacao:'2026-11-15'}];
 assert.deepEqual(Array.from(scope.window.Arcadia.noticeFilters.sort(rows,'recent'),row=>row.id_aviso),[3,2,1,4]);
 assert.deepEqual(Array.from(scope.window.Arcadia.noticeFilters.sort(rows,'oldest'),row=>row.id_aviso),[2,3,1,4]);
});
test('pesquisa limpa comandos, formata data e encontra metadados e palavras sem acento',()=>{
 const items=search.mapRows('Notices',[{id_aviso:1,titulo:'Arcádia',resumo:'[alinhar=justify]Iniciativa de estudantes[/alinhar]',data_publicacao:'2026-11-10T01:41:06.000Z',categoria:'edital',urgente:true}]);
 assert.equal(items[0].desc,'Iniciativa de estudantes');assert.equal(items[0].meta,new Date('2026-11-10T01:41:06.000Z').toLocaleDateString('pt-BR'));
 assert.equal(search.match(items,'arcadia edital urgente').length,1);
 assert.equal(search.match(items,'senha privada').length,0);
});
test('biblioteca usa link direto e busca pública não consulta dados de administração',async()=>{
 const paths=[];const api={get:path=>{paths.push(path);return path==='/api/public'?{notices:[],projects:[]}:[{id_item:8,titulo:'Material aberto',descricao:'Cartografia'}]},expect:p=>p};
 const result=await search.load(api,false,false);
 assert.equal(result.items[0].href,'documents.html?material=8');assert.equal(search.match(result.items,'cartografia').length,1);
 assert.ok(paths.every(path=>!path.includes('admin')&&!path.includes('management')));
});
