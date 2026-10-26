-- Gerado offline para MySQL 8.4. Backup e parar no primeiro erro.
-- Nao altera contas legadas nem promove alunos automaticamente. Nao executar schema.sql inteiro.
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc130_apply$$
CREATE PROCEDURE _arc130_apply()
BEGIN
 DECLARE actual_type TEXT DEFAULT NULL; DECLARE actual_null VARCHAR(3) DEFAULT NULL;
 IF VERSION() NOT REGEXP '^8[.]4[.]' OR NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.29' AND checksum='45b86a2a1a6303a7356c9e7c251144fd1b7cbd2fef24f1439747485b23f27907') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Requer MySQL 8.4 e base 1.1.29 valida.'; END IF;
 IF EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.30' AND checksum<>'86a92153561f5572008da9e9d569b4878d98cbf1fc07cb807db580b23a449ef1') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Checksum 1.1.30 divergente.'; END IF;
 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='publico_externo' AND COLUMN_NAME='intencao_cadastro';
 IF actual_null<>'NO' OR actual_type IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Intencao de cadastro ausente ou divergente.'; END IF;
 IF actual_type='enum(''externo'',''docente'',''servidor'')' THEN ALTER TABLE publico_externo MODIFY COLUMN intencao_cadastro ENUM('externo','docente','servidor','discente') NOT NULL DEFAULT 'externo';
 ELSEIF actual_type<>'enum(''externo'',''docente'',''servidor'',''discente'')' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Enum de intencao divergente.'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;
 
 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='descricao';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN descricao VARCHAR(1000) NULL;
 ELSEIF actual_type<>'varchar(1000)' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.descricao'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='sala_oficial';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN sala_oficial VARCHAR(100) NULL;
 ELSEIF actual_type<>'varchar(100)' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.sala_oficial'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='versao_sala';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN versao_sala INT UNSIGNED NOT NULL DEFAULT 0;
 ELSEIF actual_type<>'int unsigned' OR actual_null<>'NO' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.versao_sala'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='id_representante';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN id_representante INT NULL;
 ELSEIF actual_type<>'int' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.id_representante'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='id_vice1';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN id_vice1 INT NULL;
 ELSEIF actual_type<>'int' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.id_vice1'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='id_vice2';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN id_vice2 INT NULL;
 ELSEIF actual_type<>'int' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.id_vice2'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='whatsapp_representante';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN whatsapp_representante VARCHAR(20) NULL;
 ELSEIF actual_type<>'varchar(20)' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.whatsapp_representante'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;

 SELECT COLUMN_TYPE,IS_NULLABLE INTO actual_type,actual_null FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='consentimento_whatsapp_em';
 IF actual_type IS NULL THEN ALTER TABLE academico_turmas ADD COLUMN consentimento_whatsapp_em DATETIME NULL;
 ELSEIF actual_type<>'datetime' OR actual_null<>'YES' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Coluna divergente: academico_turmas.consentimento_whatsapp_em'; END IF;
 SET actual_type=NULL; SET actual_null=NULL;
 CREATE TABLE IF NOT EXISTS academico_salas_historico (id_alteracao INT AUTO_INCREMENT PRIMARY KEY,id_turma INT NULL,id_autor INT NULL,nome_autor VARCHAR(100) NOT NULL,sala_anterior VARCHAR(100) NULL,sala_nova VARCHAR(100) NULL,versao_anterior INT UNSIGNED NOT NULL,alterado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX idx_salas_turma(id_turma,id_alteracao),FOREIGN KEY(id_turma) REFERENCES academico_turmas(id_turma) ON DELETE SET NULL,FOREIGN KEY(id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL) ENGINE=InnoDB;
 CREATE TABLE IF NOT EXISTS academico_horarios (id_horario INT AUTO_INCREMENT PRIMARY KEY,id_disciplina INT NOT NULL,dia_semana TINYINT UNSIGNED NOT NULL,hora_inicio TIME NOT NULL,hora_fim TIME NOT NULL,vigencia_inicio DATE NOT NULL,vigencia_fim DATE NOT NULL,sala VARCHAR(100) NULL,id_autor INT NULL,ativo BOOLEAN NOT NULL DEFAULT TRUE,versao INT UNSIGNED NOT NULL DEFAULT 0,criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX idx_horario_oferta(id_disciplina,ativo,dia_semana),FOREIGN KEY(id_disciplina) REFERENCES academico_disciplinas(id_disciplina) ON DELETE CASCADE,FOREIGN KEY(id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,CHECK(dia_semana BETWEEN 1 AND 7 AND hora_inicio<hora_fim AND vigencia_inicio<=vigencia_fim)) ENGINE=InnoDB;
 CREATE TABLE IF NOT EXISTS academico_horario_excecoes (id_horario INT NOT NULL,data DATE NOT NULL,cancelada BOOLEAN NOT NULL DEFAULT TRUE,motivo VARCHAR(300) NULL,id_autor INT NULL,versao INT UNSIGNED NOT NULL DEFAULT 0,atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id_horario,data),FOREIGN KEY(id_horario) REFERENCES academico_horarios(id_horario) ON DELETE CASCADE,FOREIGN KEY(id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL) ENGINE=InnoDB;
 IF NOT EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_salas_historico' AND ENGINE='InnoDB') OR (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_salas_historico' AND CONCAT(COLUMN_NAME,':',COLUMN_TYPE,':',IS_NULLABLE) IN ('id_alteracao:int:NO','id_turma:int:YES','id_autor:int:YES','nome_autor:varchar(100):NO','sala_anterior:varchar(100):YES','sala_nova:varchar(100):YES','versao_anterior:int unsigned:NO','alterado_em:datetime:NO'))<>8 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Contrato divergente: academico_salas_historico'; END IF;
IF NOT EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_horarios' AND ENGINE='InnoDB') OR (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_horarios' AND CONCAT(COLUMN_NAME,':',COLUMN_TYPE,':',IS_NULLABLE) IN ('id_horario:int:NO','id_disciplina:int:NO','dia_semana:tinyint unsigned:NO','hora_inicio:time:NO','hora_fim:time:NO','vigencia_inicio:date:NO','vigencia_fim:date:NO','sala:varchar(100):YES','id_autor:int:YES','ativo:tinyint(1):NO','versao:int unsigned:NO','criado_em:datetime:NO'))<>12 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Contrato divergente: academico_horarios'; END IF;
IF NOT EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_horario_excecoes' AND ENGINE='InnoDB') OR (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_horario_excecoes' AND CONCAT(COLUMN_NAME,':',COLUMN_TYPE,':',IS_NULLABLE) IN ('id_horario:int:NO','data:date:NO','cancelada:tinyint(1):NO','motivo:varchar(300):YES','id_autor:int:YES','versao:int unsigned:NO','atualizado_em:datetime:NO'))<>7 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Contrato divergente: academico_horario_excecoes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND COLUMN_NAME='versao_sala' AND COLUMN_DEFAULT='0') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Default da versao de sala divergente.'; END IF;
 IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_salas_historico' AND COLUMN_NAME IN ('id_alteracao','id_turma','id_autor','nome_autor','sala_anterior','sala_nova','versao_anterior','alterado_em'))<>8 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Tabela de historico parcial; revisar antes de continuar.'; END IF;
 IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='academico_horarios' AND COLUMN_NAME IN ('id_horario','id_disciplina','dia_semana','hora_inicio','hora_fim','vigencia_inicio','vigencia_fim','sala','id_autor','ativo','versao','criado_em'))<>12 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Tabela de horarios parcial; revisar antes de continuar.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND CONSTRAINT_NAME='fk_turma_representante') THEN ALTER TABLE academico_turmas ADD CONSTRAINT fk_turma_representante FOREIGN KEY(id_representante) REFERENCES usuarios(id_usuario) ON DELETE SET NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND CONSTRAINT_NAME='fk_turma_vice1') THEN ALTER TABLE academico_turmas ADD CONSTRAINT fk_turma_vice1 FOREIGN KEY(id_vice1) REFERENCES usuarios(id_usuario) ON DELETE SET NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='academico_turmas' AND CONSTRAINT_NAME='fk_turma_vice2') THEN ALTER TABLE academico_turmas ADD CONSTRAINT fk_turma_vice2 FOREIGN KEY(id_vice2) REFERENCES usuarios(id_usuario) ON DELETE SET NULL; END IF;
 INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) VALUES('1.1.30','86a92153561f5572008da9e9d569b4878d98cbf1fc07cb807db580b23a449ef1');
END$$
DELIMITER ;
CALL _arc130_apply();
DROP PROCEDURE IF EXISTS _arc130_apply;
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.30';
