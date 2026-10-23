-- Execute uma vez no banco usado pela aplicação. Não cria dados de demonstração.
CREATE TABLE IF NOT EXISTS inscricoes_editais (
    id_inscricao INT AUTO_INCREMENT PRIMARY KEY,
    id_aviso INT NOT NULL,
    id_usuario INT NOT NULL,
    status ENUM('inscrito', 'em_analise', 'deferido', 'indeferido', 'aprovado') DEFAULT 'inscrito',
    motivo TEXT NULL,
    anexo_url VARCHAR(500) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_aviso_usuario (id_aviso, id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
