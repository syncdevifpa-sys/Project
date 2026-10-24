-- Migração aditiva: aplicar após add-document-library.sql e backup no banco correto.
CREATE TABLE IF NOT EXISTS academico_turmas (
 id_turma INT AUTO_INCREMENT PRIMARY KEY,
 id_curso INT NOT NULL,
 nome VARCHAR(100) NOT NULL,
 ano_ingresso SMALLINT UNSIGNED NOT NULL,
 turno ENUM('manha','tarde','noite','integral') NOT NULL,
 campus VARCHAR(100) NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_turma_coorte (id_curso, nome, ano_ingresso, turno, campus),
 FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS academico_disciplinas (
 id_disciplina INT AUTO_INCREMENT PRIMARY KEY,
 id_turma INT NOT NULL,
 id_professor INT NOT NULL,
 nome VARCHAR(100) NOT NULL,
 ano_letivo SMALLINT UNSIGNED NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_disciplina_turma (id_turma, nome, ano_letivo),
 FOREIGN KEY (id_turma) REFERENCES academico_turmas(id_turma) ON DELETE RESTRICT,
 FOREIGN KEY (id_professor) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS academico_matriculas (
 id_disciplina INT NOT NULL,
 id_aluno INT NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id_disciplina, id_aluno),
 FOREIGN KEY (id_disciplina) REFERENCES academico_disciplinas(id_disciplina) ON DELETE CASCADE,
 FOREIGN KEY (id_aluno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS academico_convites (
 id_convite INT AUTO_INCREMENT PRIMARY KEY,
 id_disciplina INT NOT NULL,
 email VARCHAR(150) NOT NULL,
 estado ENUM('pendente','aceito','recusado','cancelado') NOT NULL DEFAULT 'pendente',
 expira_em DATETIME NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_convite_destino (id_disciplina, email),
 INDEX idx_convites_email (email, estado),
 FOREIGN KEY (id_disciplina) REFERENCES academico_disciplinas(id_disciplina) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS academico_publicacoes (
 id_publicacao INT AUTO_INCREMENT PRIMARY KEY,
 id_disciplina INT NOT NULL,
 tipo ENUM('aviso','material','projeto','agenda') NOT NULL,
 titulo VARCHAR(150) NOT NULL,
 descricao VARCHAR(3000) NULL,
 id_item INT NULL,
 url VARCHAR(2000) NULL,
 inicio DATETIME NULL,
 fim DATETIME NULL,
 situacao ENUM('ativo','cancelado') NOT NULL DEFAULT 'ativo',
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_publicacoes_disciplina (id_disciplina, tipo, criado_em),
 FOREIGN KEY (id_disciplina) REFERENCES academico_disciplinas(id_disciplina) ON DELETE CASCADE,
 FOREIGN KEY (id_item) REFERENCES documento_itens(id_item) ON DELETE RESTRICT
) ENGINE=InnoDB;
