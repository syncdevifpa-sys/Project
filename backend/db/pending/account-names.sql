-- Executar separadamente após revisão e backup. Não modifica nomes existentes.
CREATE TABLE IF NOT EXISTS conta_nomes (
  tipo ENUM('users','external') NOT NULL,
  id_conta INT NOT NULL,
  nome_exibicao VARCHAR(100) NULL,
  PRIMARY KEY (tipo, id_conta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS conta_nome_pedidos (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('users','external') NOT NULL,
  id_conta INT NOT NULL,
  nome_anterior VARCHAR(100) NOT NULL,
  nome_solicitado VARCHAR(100) NOT NULL,
  estado ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
  motivo VARCHAR(1000) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revisado_por INT NULL,
  revisado_em DATETIME NULL,
  INDEX idx_nome_pendente (tipo,id_conta,estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
