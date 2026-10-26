const {checksum}=require('./migration-sql.cjs');
function generate(spec){
 const base=checksum(require('../../backend/db/migrations/1.1.29.json'));
 const columns=spec.cohortColumns.map(([name,definition,type,nullable])=>`
 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='${name}';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN ${name} ${definition};
 ELSEIF actual_type<>'${type}' OR actual_null<>'${nullable}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.${name}'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;`).join('\n');
 const contracts={
 academico_salas_historico:['id_alteracao:int:NO','id_turma:int:YES','id_autor:int:YES','nome_autor:varchar(100):NO','sala_anterior:varchar(100):YES','sala_nova:varchar(100):YES','versao_anterior:int unsigned:NO','alterado_em:datetime:NO'],
 academico_horarios:['id_horario:int:NO','id_disciplina:int:NO','dia_semana:tinyint unsigned:NO','hora_inicio:time:NO','hora_fim:time:NO','vigencia_inicio:date:NO','vigencia_fim:date:NO','sala:varchar(100):YES','id_autor:int:YES','ativo:tinyint(1):NO','versao:int unsigned:NO','criado_em:datetime:NO'],
 academico_horario_excecoes:['id_horario:int:NO','data:date:NO','cancelada:tinyint(1):NO','motivo:varchar(300):YES','id_autor:int:YES','versao:int unsigned:NO','atualizado_em:datetime:NO']
 };
 const checks=Object.entries(contracts).map(([table,values])=>`IF NOT EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND ENGINE='InnoDB') OR (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND CONCAT(COLUMN_NAME,':',COLUMN_TYPE,':',IS_NULLABLE) IN (${values.map(v=>"'"+v+"'").join(',')}))<>${values.length} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Contrato divergente: ${table}'; END IF;`).join('\n');
 return `-- Gerado offline para MySQL 8.4. Backup e parar no primeiro erro.
-- Nao altera contas legadas nem promove alunos automaticamente. Nao executar schema.sql inteiro.
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc130_apply$$
CREATE PROCEDURE _arc130_apply()
BEGIN
 DECLARE actual_type TEXT DEFAULT NULL; DECLARE actual_null VARCHAR(3) DEFAULT NULL;
 IF VERSION() NOT REGEXP '^8[.]4[.]' OR NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.29' AND checksum='${base}') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Requer MySQL 8.4 e base 1.1.29 valida.'; END IF;
 IF EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.30' AND checksum<>'${checksum(spec)}') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Checksum 1.1.30 divergente.'; END IF;
 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='publico_externo' AND COLUMN_NAME='intencao_cadastro';
 IF actual_null<>'NO' OR actual_type IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Intencao de cadastro ausente ou divergente.'; END IF;
 IF actual_type='enum(''externo'',''docente'',''servidor'')' THEN ALTER TABLE publico_externo MODIFY COLUMN intencao_cadastro ENUM('externo','docente','servidor','discente') NOT NULL DEFAULT 'externo';
 ELSEIF actual_type<>'enum(''externo'',''docente'',''servidor'',''discente'')' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Enum de intencao divergente.'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;
 ${columns}
 ${spec.auditTable}
 ${spec.scheduleTable}
 ${spec.exceptionTable}
 ${checks}
 IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='versao_sala' AND COLUMN_DEFAULT='0') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Default da versao de sala divergente.'; END IF;
 IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_salas_historico' AND COLUMN_NAME IN ('id_alteracao','id_turma','id_autor','nome_autor','sala_anterior','sala_nova','versao_anterior','alterado_em'))<>8 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Tabela de historico parcial; revisar antes de continuar.'; END IF;
 IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_horarios' AND COLUMN_NAME IN ('id_horario','id_disciplina','dia_semana','hora_inicio','hora_fim','vigencia_inicio','vigencia_fim','sala','id_autor','ativo','versao','criado_em'))<>12 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Tabela de horarios parcial; revisar antes de continuar.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND CONSTRAINT_NAME='fk_turma_representante') THEN ALTER TABLE academico_turmas ADD CONSTRAINT fk_turma_representante FOREIGN KEY(id_representante) REFERENCES usuarios(id_usuario) ON DELETE SET NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND CONSTRAINT_NAME='fk_turma_vice1') THEN ALTER TABLE academico_turmas ADD CONSTRAINT fk_turma_vice1 FOREIGN KEY(id_vice1) REFERENCES usuarios(id_usuario) ON DELETE SET NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND CONSTRAINT_NAME='fk_turma_vice2') THEN ALTER TABLE academico_turmas ADD CONSTRAINT fk_turma_vice2 FOREIGN KEY(id_vice2) REFERENCES usuarios(id_usuario) ON DELETE SET NULL; END IF;
 INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) VALUES('1.1.30','${checksum(spec)}');
END$$
DELIMITER ;
CALL _arc130_apply();
DROP PROCEDURE IF EXISTS _arc130_apply;
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.30';
`;
}
module.exports={generate};
