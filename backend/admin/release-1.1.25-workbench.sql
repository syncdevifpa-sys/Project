-- PACOTE 1.1.25: executar UM BLOCO POR VEZ no Workbench.
-- Antes: backup e check-release-1.1.25.sql. Confira banco, pré-requisitos e ausência de nomes duplicados.
-- Não repetir scripts já aplicados. Não executar tudo sem conferir o diagnóstico.
-- Diante de erro, PARE. Nunca execute schema.sql em banco existente.
SELECT DATABASE() AS confirme_banco_de_producao, VERSION() AS versao_mysql;


-- ==================================================
-- BLOCO 1 — add-external-community-access.sql
-- Se este bloco já foi aplicado, NÃO execute novamente.
-- ==================================================
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


-- ==================================================
-- BLOCO 2 — add-class-offerings.sql
-- Se este bloco já foi aplicado, NÃO execute novamente.
-- ==================================================
-- Executar após add-classes.sql, com backup, somente no banco correto.
-- Legado permanece sem semestre presumido. A turma/coorte e IDs de ofertas não mudam.
ALTER TABLE academico_disciplinas
 ADD COLUMN regime_letivo ENUM('legado','anual','semestral') NOT NULL DEFAULT 'legado',
 ADD COLUMN semestre TINYINT UNSIGNED NOT NULL DEFAULT 0,
 ADD CONSTRAINT chk_oferta_semestre CHECK ((regime_letivo='semestral' AND semestre IN (1,2)) OR (regime_letivo IN ('legado','anual') AND semestre=0));
ALTER TABLE academico_disciplinas
 ADD UNIQUE KEY uq_oferta_turma (id_turma,nome,ano_letivo,regime_letivo,semestre);
ALTER TABLE academico_disciplinas DROP INDEX uq_disciplina_turma;


-- ==================================================
-- BLOCO 3 — add-class-voluntary-leave.sql
-- Se este bloco já foi aplicado, NÃO execute novamente.
-- ==================================================
-- Executar após add-class-offerings.sql, com backup. Sem exclusão de histórico.
ALTER TABLE academico_matriculas ADD COLUMN ativa TINYINT(1) NOT NULL DEFAULT 1,
 ADD COLUMN encerrado_em DATETIME NULL;
ALTER TABLE academico_disciplinas ADD COLUMN atribuicao_ativa TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE academico_publicacoes ADD COLUMN id_autor INT NULL,
 ADD CONSTRAINT fk_publicacao_autor FOREIGN KEY(id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS academico_saidas_professor (
 id_saida INT AUTO_INCREMENT PRIMARY KEY,
 id_disciplina INT NOT NULL,
 id_professor INT NULL,
 encerrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(id_disciplina) REFERENCES academico_disciplinas(id_disciplina) ON DELETE CASCADE,
 FOREIGN KEY(id_professor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;


-- ==================================================
-- BLOCO 4 — add-unique-class-names.sql
-- Se este bloco já foi aplicado, NÃO execute novamente.
-- ==================================================
-- Workbench: rode primeiro o diagnóstico abaixo. Se retornar linhas, PARE.
-- Não apague/funda turmas. Revise nomes e vínculos com a administração e repita o diagnóstico.
SELECT LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' ')) COLLATE utf8mb4_bin AS nome_normalizado,
 COUNT(*) AS quantidade, GROUP_CONCAT(id_turma ORDER BY id_turma) AS ids
FROM academico_turmas GROUP BY nome_normalizado HAVING COUNT(*) > 1;
-- Continue somente sem duplicados, após backup e em janela sem criação/renomeação de turmas.
-- Se a restrição UNIQUE falhar, preserve os dados e resolva o diagnóstico; não force a migração.
ALTER TABLE academico_turmas ADD COLUMN nome_chave VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '';
UPDATE academico_turmas SET nome_chave=LOWER(REGEXP_REPLACE(TRIM(nome),'[[:space:]]+',' '));
ALTER TABLE academico_turmas ADD UNIQUE KEY uq_turma_nome_global(nome_chave);
DELIMITER $$
CREATE TRIGGER trg_turma_nome_insert BEFORE INSERT ON academico_turmas FOR EACH ROW
BEGIN
 SET NEW.nome=REGEXP_REPLACE(TRIM(NEW.nome),'[[:space:]]+',' ');
 SET NEW.nome_chave=LOWER(NEW.nome);
END$$
CREATE TRIGGER trg_turma_nome_update BEFORE UPDATE ON academico_turmas FOR EACH ROW
BEGIN
 SET NEW.nome=REGEXP_REPLACE(TRIM(NEW.nome),'[[:space:]]+',' ');
 SET NEW.nome_chave=LOWER(NEW.nome);
END$$
DELIMITER ;


-- ==================================================
-- BLOCO 5 — add-class-archive.sql
-- Se este bloco já foi aplicado, NÃO execute novamente.
-- ==================================================
-- Aplicar somente após backup e migrações anteriores de Turmas. Não apaga histórico.
ALTER TABLE academico_turmas ADD COLUMN arquivada_em DATETIME NULL;
ALTER TABLE academico_disciplinas ADD COLUMN arquivada_em DATETIME NULL;


-- ==================================================
-- BLOCO 6 — add-task-reminders.sql
-- Se este bloco já foi aplicado, NÃO execute novamente.
-- ==================================================
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


-- FIM: repita check-release-1.1.25.sql e confirme sucesso antes de publicar main.
