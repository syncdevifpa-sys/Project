-- Execute uma vez no banco atual. Não armazena tokens, senhas nem textos de tarefas.
CREATE TABLE IF NOT EXISTS google_export_destinos (
 titular_tipo ENUM('users','external') NOT NULL,
 titular_id INT NOT NULL,
 google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 calendar_id VARCHAR(1024) NULL,
 tasklist_id VARCHAR(1024) NULL,
 reserva CHAR(48) CHARACTER SET ascii NULL,
 reserva_ate DATETIME NULL,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(titular_tipo,titular_id,google_sub)
) ENGINE=InnoDB;

-- Amplia a observação sem apagar o conteúdo já existente.
ALTER TABLE tarefas MODIFY COLUMN observacao TEXT NULL;
