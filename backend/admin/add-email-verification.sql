-- Migração gradual. Execute no banco correto após revisar.
-- DDL faz COMMIT implícito. Não altera contas, papéis, senhas nem sessões existentes.
-- Ausência de email_estado significa LEGADO NÃO VERIFICADO, nunca confirmação presumida.
SELECT DATABASE() AS banco_selecionado;
CREATE TABLE IF NOT EXISTS seguranca_email_lock (
    chave TINYINT PRIMARY KEY
) ENGINE=InnoDB;
INSERT IGNORE INTO seguranca_email_lock (chave) VALUES (1);
CREATE TABLE IF NOT EXISTS email_estado (
    tipo ENUM('users', 'external') NOT NULL,
    identidade INT NOT NULL,
    email VARCHAR(150) NOT NULL,
    regime ENUM('novo', 'legado') NOT NULL,
    confirmado_em DATETIME NULL,
    PRIMARY KEY (tipo, identidade)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS email_tokens (
    id_token_email BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('users', 'external') NOT NULL,
    identidade INT NOT NULL,
    email_destino VARCHAR(150) NOT NULL,
    email_anterior VARCHAR(150) NOT NULL,
    finalidade ENUM('cadastro', 'troca') NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado_em DATETIME NULL,
    INDEX idx_email_destino (email_destino, expira_em),
    INDEX idx_email_conta (tipo, identidade)
) ENGINE=InnoDB;
