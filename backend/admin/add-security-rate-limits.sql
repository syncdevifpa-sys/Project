-- Execute no banco correto antes de habilitar recuperação por e-mail.
-- DDL faz COMMIT implícito. Nenhum usuário ou conteúdo existente é alterado.
SELECT DATABASE() AS banco_selecionado;
CREATE TABLE IF NOT EXISTS seguranca_limites (
    chave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    janela BIGINT UNSIGNED NOT NULL,
    tentativas INT UNSIGNED NOT NULL DEFAULT 0,
    expira_em DATETIME NOT NULL,
    INDEX idx_limites_expiracao (expira_em)
) ENGINE=InnoDB;
-- Manutenção periódica, por operação administrativa agendada:
-- DELETE FROM seguranca_limites WHERE expira_em < NOW() LIMIT 10000;
