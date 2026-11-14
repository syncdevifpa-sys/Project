const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createLibrary } = require('../backend/src/services/document-library.service');
test('documentos aplicam Geral, contas do Arcádia, campus e privado em consultas reais', async t => {
 const db = new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(`CREATE TABLE usuarios(id_usuario INTEGER,nome TEXT,tipo_usuario TEXT,is_admin INTEGER,situacao TEXT);
 CREATE TABLE documento_itens(id_item INTEGER,id_usuario INTEGER,titulo TEXT,descricao TEXT,visibilidade TEXT,revisao TEXT,tipo TEXT,url TEXT,nome_arquivo TEXT,mime TEXT,tamanho INTEGER,conteudo BLOB,criado_em TEXT,atualizado_em TEXT);
 INSERT INTO usuarios VALUES(1,'Publicador','docente',0,'ativo'),(2,'Aluno','discente',0,'ativo');`);
 for (const [id, audience] of [[1,'publico'],[2,'comunidade'],[3,'campus'],[4,'privado']])
  db.prepare('INSERT INTO documento_itens(id_item,id_usuario,titulo,visibilidade,tipo,revisao) VALUES(?,?,?,?,?,?)').run(id,1,'Material '+id,audience,'link','nenhuma');
 const library=createLibrary({execute:async(sql,args=[])=>[db.prepare(sql).all(...args)]});
 const ids=rows=>rows.map(row=>row.id_item).sort();
 assert.deepEqual(ids(await library.publicList()),[1]);
 assert.deepEqual(ids(await library.publicList({tipo_usuario:'externo'})),[1,2]);
 assert.deepEqual(ids(await library.publicList({id_usuario:2,tipo_usuario:'discente'})),[1,2,3]);
 for(const id of [2,3,4])await assert.rejects(library.readable(null,id),{status:404});
 assert.equal((await library.readable(null,2,{tipo_usuario:'externo'})).id_item,2);
 await assert.rejects(library.readable(null,3,{tipo_usuario:'externo'}),{status:404});
 await assert.rejects(library.download(null,4),{status:404});
 assert.equal((await library.readable(1,4,{id_usuario:1,tipo_usuario:'docente'})).id_item,4);
 db.exec("UPDATE usuarios SET situacao='inativo' WHERE id_usuario=1");
 assert.deepEqual(await library.publicList(),[]);
});
