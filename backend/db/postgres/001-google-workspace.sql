-- Piloto PostgreSQL: executar somente em banco de desenvolvimento vazio.
-- Ainda não é o esquema completo do portal nem converte dados MySQL.
BEGIN;
CREATE TABLE google_export_destinos (
    titular_tipo TEXT NOT NULL CHECK (titular_tipo IN ('users','external')),
    titular_id INTEGER NOT NULL CHECK (titular_id > 0),
    google_sub VARCHAR(255) COLLATE "C" NOT NULL,
    calendar_id VARCHAR(1024),
    tasklist_id VARCHAR(1024),
    reserva CHAR(48),
    reserva_ate TIMESTAMPTZ,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (titular_tipo, titular_id, google_sub)
);
CREATE FUNCTION google_destinos_atualizar_data() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.atualizado_em := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
CREATE TRIGGER google_destinos_atualizado BEFORE UPDATE ON google_export_destinos
FOR EACH ROW EXECUTE FUNCTION google_destinos_atualizar_data();
COMMIT;
