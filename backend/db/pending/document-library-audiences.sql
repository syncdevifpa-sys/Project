-- Acrescenta os públicos de documentos sem alterar as escolhas existentes.
ALTER TABLE documento_itens
  MODIFY COLUMN visibilidade ENUM('privado','publico','campus','comunidade') NOT NULL DEFAULT 'privado';
