-- Migração aditiva. Revise e aplique no banco correto após backup.
-- Biblioteca pessoal independente das solicitações em documentos.
CREATE TABLE IF NOT EXISTS documento_pastas (
 id_pasta INT AUTO_INCREMENT PRIMARY KEY,
 id_usuario INT NOT NULL,
 nome VARCHAR(100) NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY idx_doc_pasta_nome (id_usuario, nome),
 FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS documento_itens (
 id_item INT AUTO_INCREMENT PRIMARY KEY,
 id_usuario INT NOT NULL,
 id_pasta INT NULL,
 titulo VARCHAR(150) NOT NULL,
 descricao VARCHAR(3000) NULL,
 visibilidade ENUM('privado','publico') NOT NULL DEFAULT 'privado',
 revisao ENUM('nenhuma','pendente','aprovado','recusado') NOT NULL DEFAULT 'nenhuma',
 versao_revisao INT UNSIGNED NOT NULL DEFAULT 0,
 motivo_revisao VARCHAR(1000) NULL,
 enviado_em DATETIME NULL,
 revisado_em DATETIME NULL,
 revisado_por INT NULL,
 tipo ENUM('link','arquivo') NOT NULL,
 url VARCHAR(2000) NULL,
 nome_arquivo VARCHAR(150) NULL,
 mime VARCHAR(50) NULL,
 tamanho INT UNSIGNED NOT NULL DEFAULT 0,
 conteudo MEDIUMBLOB NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (revisado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
 INDEX idx_doc_item_revisao (revisao, enviado_em),
 INDEX idx_doc_item_publico (visibilidade, atualizado_em),
 INDEX idx_doc_item_dono_pasta (id_usuario, id_pasta),
 FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 FOREIGN KEY (id_pasta) REFERENCES documento_pastas(id_pasta) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS documento_armazenamento (
 id TINYINT NOT NULL PRIMARY KEY
) ENGINE=InnoDB;
INSERT IGNORE INTO documento_armazenamento (id) VALUES (1);

CREATE TABLE IF NOT EXISTS documento_salvos (
 id_salvo INT AUTO_INCREMENT PRIMARY KEY,
 id_usuario INT NOT NULL,
 id_item INT NULL,
 id_pasta INT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY idx_doc_salvo_dono_origem (id_usuario, id_item),
 FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 FOREIGN KEY (id_item) REFERENCES documento_itens(id_item) ON DELETE SET NULL,
 FOREIGN KEY (id_pasta) REFERENCES documento_pastas(id_pasta) ON DELETE RESTRICT
) ENGINE=InnoDB;
