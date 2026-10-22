-- Backup antes de aplicar. Não executar schema.sql inteiro em banco existente.
-- Datas legadas ficam sem agendamento UTC até serem revisadas pelo titular.
ALTER TABLE lembretes
  ADD COLUMN id_tarefa INT NULL,
  ADD COLUMN agendado_utc DATETIME NULL,
  ADD COLUMN fuso_horario VARCHAR(64) NOT NULL DEFAULT 'America/Fortaleza',
  ADD COLUMN enviar_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN versao INT UNSIGNED NOT NULL DEFAULT 1,
  ADD CONSTRAINT fk_lembrete_tarefa FOREIGN KEY (id_tarefa) REFERENCES tarefas(id_tarefa) ON DELETE CASCADE,
  ADD INDEX idx_lembrete_envio (enviar_email, ativo, agendado_utc);
CREATE TABLE preferencias_notificacao (
  id_usuario INT PRIMARY KEY,
  email_lembretes BOOLEAN NOT NULL DEFAULT FALSE,
  consentido_em DATETIME NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE lembrete_envios (
  id_lembrete INT NOT NULL,
  versao INT UNSIGNED NOT NULL,
  estado ENUM('reservado','enviado','falhou','cancelado') NOT NULL DEFAULT 'reservado',
  reservado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_em DATETIME NULL,
  PRIMARY KEY (id_lembrete, versao),
  FOREIGN KEY (id_lembrete) REFERENCES lembretes(id_lembrete) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Abrange todas as formas de edição de tarefa, incluindo a API compartilhada de conteúdo.
DELIMITER $$
CREATE TRIGGER tarefa_invalida_lembretes AFTER UPDATE ON tarefas
FOR EACH ROW
BEGIN
  IF (NEW.status='concluida' AND OLD.status<>'concluida') OR NOT (NEW.data_entrega <=> OLD.data_entrega) THEN
    UPDATE lembretes SET ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_tarefa=NEW.id_tarefa;
  END IF;
END$$
DELIMITER ;
