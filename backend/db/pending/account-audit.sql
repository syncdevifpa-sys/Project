-- Aditivo. Revisar e executar manualmente na base correta após backup.
-- Registra quem alterou e quais campos; não duplica nomes, telefones, matrículas ou senhas.
CREATE TABLE IF NOT EXISTS cadastro_auditoria (
 id_auditoria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_admin INT NULL,
 id_usuario INT NOT NULL,
 campos JSON NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_cadastro_usuario (id_usuario, criado_em),
 FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;
