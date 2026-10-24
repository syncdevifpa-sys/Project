-- Gerado offline. MySQL 8.4. Backup e mesma conexao; parar no primeiro erro.
-- Expande o enum SEM reclassificar eventos existentes. Nao reaplicar schema.sql.
SET @arc128_failed=0;
DELIMITER $$
DROP PROCEDURE IF EXISTS _arc128_apply$$
CREATE PROCEDURE _arc128_apply()
BEGIN
 DECLARE actual_type TEXT; DECLARE actual_default TEXT; DECLARE actual_null VARCHAR(3);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @arc128_failed=1; RESIGNAL; END;
 IF VERSION() NOT REGEXP '^8[.]4[.]' OR NOT EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.27' AND checksum='d9fd23826f42a137bc3ccc4df312df48c6efd2e21d8d324aa62cf068a18135ad') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Requer MySQL 8.4 e registro valido da 1.1.27.';
 END IF;
 IF EXISTS(SELECT 1 FROM arcadia_schema_migrations WHERE versao='1.1.28' AND checksum<>'9cdf3a5752095a953bdb79caf01a7774266d7588be89ae08d9fdff5a1634d70b') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Checksum 1.1.28 divergente.';
 END IF;
 SELECT COLUMN_TYPE,COLUMN_DEFAULT,IS_NULLABLE INTO actual_type,actual_default,actual_null FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendario' AND COLUMN_NAME='visibilidade';
 IF actual_type IS NULL OR actual_null<>'NO' OR NOT(actual_default <=> 'publico') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Visibilidade divergente; revisar sem sobrescrever.';
 END IF;
 IF actual_type='enum(''publico'',''pessoal'')' THEN
  ALTER TABLE calendario MODIFY COLUMN visibilidade ENUM('publico','pessoal','institucional','comunidade') NOT NULL DEFAULT 'publico';
 ELSEIF actual_type<>'enum(''publico'',''pessoal'',''institucional'',''comunidade'')' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Enum de visibilidade divergente.';
 END IF;
 INSERT IGNORE INTO arcadia_schema_migrations(versao,checksum) VALUES ('1.1.28','9cdf3a5752095a953bdb79caf01a7774266d7588be89ae08d9fdff5a1634d70b');
END$$
DELIMITER ;
CALL _arc128_apply();
DROP PROCEDURE IF EXISTS _arc128_apply;
SELECT versao,checksum,verificado_em FROM arcadia_schema_migrations WHERE versao='1.1.28';
