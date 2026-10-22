-- Execute o arquivo inteiro no banco correto após revisão.
-- DDL faz COMMIT implícito. Não é uma prévia com ROLLBACK.
-- Idempotente: não altera contas nem presume consentimento de usuários antigos.
SELECT DATABASE() AS banco_selecionado;
CREATE TABLE IF NOT EXISTS perfil_compartilhamento (
    id_compartilhamento INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL UNIQUE,
    id_externo INT NULL UNIQUE,
    contato_email VARCHAR(150) NOT NULL DEFAULT '',
    contato_handle VARCHAR(100) NOT NULL DEFAULT '',
    contato_telefone VARCHAR(30) NOT NULL DEFAULT '',
    mostrar_email BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_handle BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_telefone BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_foto BOOLEAN NOT NULL DEFAULT FALSE,
    foto MEDIUMTEXT NULL,
    CONSTRAINT fk_compartilhamento_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_compartilhamento_externo FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE,
    CONSTRAINT chk_compartilhamento_conta CHECK ((id_usuario IS NULL) <> (id_externo IS NULL))
) ENGINE=InnoDB;
