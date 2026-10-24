-- Execute apenas no banco correto, após backup. Não execute schema.sql em uma base existente.
-- Vínculos por identificador estável do Google. Senhas e permissões continuam nas contas do Arcádia.
CREATE TABLE IF NOT EXISTS google_identidades (
    google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    id_usuario INT NULL UNIQUE,
    id_externo INT NULL UNIQUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_google_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_google_externo FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE,
    CONSTRAINT chk_google_identidade CHECK ((id_usuario IS NOT NULL) <> (id_externo IS NOT NULL))
) ENGINE=InnoDB;
