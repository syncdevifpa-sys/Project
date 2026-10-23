-- GERADO offline. Apenas para quatro gatilhos previamente confirmados AUSENTES.
-- Parar no primeiro erro. Nao reaplicar em banco que ja concluiu 1.1.26.
CREATE TRIGGER trg_calendario_lembrete_update AFTER UPDATE ON calendario FOR EACH ROW
UPDATE lembretes SET ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_evento=NEW.id_evento;

CREATE TRIGGER trg_calendario_lembrete_delete BEFORE DELETE ON calendario FOR EACH ROW
UPDATE lembretes SET ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_evento=OLD.id_evento;

CREATE TRIGGER trg_agenda_externa_lembrete_update AFTER UPDATE ON agenda_externa FOR EACH ROW
UPDATE lembretes SET ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_evento_externo=NEW.id_evento;

CREATE TRIGGER trg_agenda_externa_lembrete_delete BEFORE DELETE ON agenda_externa FOR EACH ROW
UPDATE lembretes SET ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_evento_externo=OLD.id_evento;
