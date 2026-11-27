-- Aplicar no PostgreSQL de teste antes de autorizar o Drive.
CREATE TABLE IF NOT EXISTS google_drive_conexao (
    id integer PRIMARY KEY CHECK (id = 1),
    credencial text NOT NULL
);
