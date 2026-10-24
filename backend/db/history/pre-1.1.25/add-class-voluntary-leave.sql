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
