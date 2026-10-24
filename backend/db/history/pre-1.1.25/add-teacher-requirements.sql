-- Migração aditiva: executar no banco correto após backup.
-- Não promove contas existentes nem altera confirmação de e-mail.
CREATE TABLE IF NOT EXISTS docente_requisitos (
 id_requisito INT AUTO_INCREMENT PRIMARY KEY,
 id_externo INT NULL UNIQUE,
 id_usuario INT NULL UNIQUE,
 nome VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL,
 matricula VARCHAR(30) NOT NULL,
 nome_usuario VARCHAR(40) NOT NULL UNIQUE,
 formacao VARCHAR(300) NOT NULL,
 estado ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
 versao INT UNSIGNED NOT NULL DEFAULT 1,
 justificativa VARCHAR(1000) NULL,
 revisado_por INT NULL,
 revisado_em DATETIME NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_requisitos_estado (estado,criado_em),
 FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE SET NULL,
 FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
 FOREIGN KEY (revisado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;
