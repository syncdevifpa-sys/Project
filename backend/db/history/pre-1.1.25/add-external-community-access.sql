-- Aplicar somente esta migração após backup. Não executar schema.sql em banco existente.
-- Requer biblioteca de documentos, visibilidade do calendário e tabelas de projetos existentes.
ALTER TABLE projetos ADD COLUMN permite_externos TINYINT(1) NOT NULL DEFAULT 0;
-- Legado sem origem confiável fica restrito. O administrador pode classificar eventos
-- comuns como agenda após revisão; nenhum evento é classificado por palavras no título.
ALTER TABLE calendario ADD COLUMN origem_calendario ENUM('agenda','ifpa') NOT NULL DEFAULT 'ifpa';
CREATE TABLE IF NOT EXISTS projeto_inscricoes_externas (
 id_projeto INT NOT NULL,
 id_externo INT NOT NULL,
 status ENUM('inscrito','aprovado','recusado','cancelado') NOT NULL DEFAULT 'inscrito',
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id_projeto,id_externo),
 FOREIGN KEY(id_projeto) REFERENCES projetos(id_projeto) ON DELETE CASCADE,
 FOREIGN KEY(id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS agenda_externa (
 id_evento INT AUTO_INCREMENT PRIMARY KEY,
 id_externo INT NOT NULL,
 titulo VARCHAR(150) NOT NULL,
 descricao TEXT NULL,
 categoria VARCHAR(40) NOT NULL DEFAULT 'evento',
 data_evento DATE NOT NULL,
 data_fim DATE NULL,
 hora_inicio TIME NULL,
 hora_fim TIME NULL,
 local VARCHAR(150) NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE
) ENGINE=InnoDB;
