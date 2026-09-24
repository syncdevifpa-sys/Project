DROP DATABASE IF EXISTS arcadia;
CREATE DATABASE arcadia
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE arcadia;

-- ---------------------------------------------------------------------
-- 1. CURSOS  (alimenta o <select> "Curso acadêmico" do cadastro)
-- ---------------------------------------------------------------------
CREATE TABLE cursos (
    id_curso    INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL UNIQUE,
    nivel       ENUM('tecnico', 'graduacao', 'pos_graduacao') NOT NULL DEFAULT 'tecnico',
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. USUÁRIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    nome_social     VARCHAR(100),
    email           VARCHAR(150) NOT NULL UNIQUE,      -- e-mail do usuário (usado no login)
    telefone        VARCHAR(20),
    senha           VARCHAR(255) NOT NULL,             -- SEMPRE hash (bcrypt/argon2)
    tipo_usuario    ENUM('discente', 'docente', 'servidor') NOT NULL,
    matricula       VARCHAR(30) UNIQUE,                -- matrícula (aluno) ou SIAPE (docente/servidor)
    id_curso        INT NULL,                          -- discente
    periodo         TINYINT UNSIGNED NULL,             -- "4º período"
    setor           VARCHAR(100),                      -- docente/servidor (ex.: Secretaria Acadêmica)
    sobre           TEXT,
    foto            MEDIUMTEXT,                        -- base64 enviado pelo front (até ~10 MB no Express)
                                                       -- ideal futuro: salvar arquivo e guardar só o caminho
    preferencias    JSON,                              -- {notificacoesUrgentes, notificacoesEditais, notificacoesResumo}
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    situacao        ENUM('ativo', 'pendente', 'bloqueado') NOT NULL DEFAULT 'ativo',
                    -- docente/servidor deve nascer 'pendente' até um admin aprovar
    ultimo_acesso   DATETIME,                          -- base do "publicados desde sua última visita"
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE SET NULL,
    INDEX idx_usuarios_tipo (tipo_usuario),
    FULLTEXT INDEX ft_usuarios_nome (nome, nome_social)     -- busca de pessoas
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2.1 PÚBLICO EXTERNO (visitantes sem vínculo com a instituição)
--     Acesso somente leitura. O e-mail deve ser único também em relação
--     a 'usuarios' (o backend confere nas duas tabelas ao cadastrar).
-- ---------------------------------------------------------------------
CREATE TABLE publico_externo (
    id_externo      INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    telefone        VARCHAR(20),
    senha           VARCHAR(255) NOT NULL,             -- SEMPRE hash (bcrypt/argon2)
    organizacao     VARCHAR(120),                      -- opcional: empresa/entidade de origem
    situacao        ENUM('ativo', 'bloqueado') NOT NULL DEFAULT 'ativo',
    ultimo_acesso   DATETIME,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. SESSÕES (tela Configurações > sessões ativas) e RECUPERAÇÃO DE SENHA
-- ---------------------------------------------------------------------
CREATE TABLE tokens (
    id_token        INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NULL,                          -- preenchido para usuário da instituição
    id_externo      INT NULL,                          -- preenchido para público externo (exatamente um dos dois)
    token           VARCHAR(255) NOT NULL UNIQUE,      -- ideal: guardar o hash (SHA-256) do token
    dispositivo     VARCHAR(150) DEFAULT 'Navegador Web',
    ip              VARCHAR(45),
    ultimo_acesso   DATETIME,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiracao       DATETIME NOT NULL,                 -- "Lembrar de mim" = expiração maior

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE,
    INDEX idx_tokens_usuario (id_usuario),
    INDEX idx_tokens_externo (id_externo),
    INDEX idx_tokens_expiracao (expiracao)
) ENGINE=InnoDB;

CREATE TABLE recuperacao_senha (                       -- link "Esqueceu a senha?"
    id_recuperacao  INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NULL,                          -- usuário da instituição
    id_externo      INT NULL,                          -- ou público externo (exatamente um dos dois)
    token_hash      CHAR(64) NOT NULL UNIQUE,          -- SHA-256 do código enviado por e-mail
    expiracao       DATETIME NOT NULL,
    usado_em        DATETIME NULL,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. AVISOS (mural)
-- ---------------------------------------------------------------------
CREATE TABLE avisos (
    id_aviso        INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NULL,                          -- autor
    titulo          VARCHAR(150) NOT NULL,
    resumo          TEXT NOT NULL,                     -- "Resumo do comunicado" (texto do card)
    descricao       TEXT,                              -- texto completo (página aviso.html)
    categoria       ENUM('matricula', 'edital', 'evento', 'cancelamento', 'calendario')
                        NOT NULL DEFAULT 'matricula',
    publico_alvo    ENUM('todos', 'discente', 'docente', 'servidor', 'externo') NOT NULL DEFAULT 'todos',
                    -- 'todos' = visível a todos, inclusive público externo;
                    -- 'externo' = direcionado ao público externo
    situacao        ENUM('rascunho', 'publicado', 'arquivado') NOT NULL DEFAULT 'publicado',
    urgente         BOOLEAN NOT NULL DEFAULT FALSE,
    fixado          BOOLEAN NOT NULL DEFAULT FALSE,
    referencia      VARCHAR(50),                       -- ex.: "Edital 012/2026"
    data_prazo      DATE NULL,                         -- "Prazo: 27 set" / "Inscrições até: 30 set"
    data_evento     DATE NULL,                         -- "Data: 09 set" / "Início: 05 out"
    vagas           INT UNSIGNED NULL,                 -- "Vagas: 12"
    detalhes        JSON NULL,                         -- extras livres, ex.: {"Reposição": "2026-09-16"}
    data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,   -- "Atualizado hoje às 09:12"

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_avisos_listagem (situacao, fixado, data_publicacao),
    INDEX idx_avisos_categoria (categoria),
    FULLTEXT INDEX ft_avisos_busca (titulo, resumo, referencia)
) ENGINE=InnoDB;

CREATE TABLE avisos_lidos (                            -- contador "Avisos não lidos"
    id_aviso        INT NOT NULL,
    id_usuario      INT NOT NULL,
    lido_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_aviso, id_usuario),
    FOREIGN KEY (id_aviso)   REFERENCES avisos(id_aviso)     ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. TAREFAS (quadro Kanban pessoal)
-- ---------------------------------------------------------------------
CREATE TABLE tarefas (
    id_tarefa       INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NOT NULL,                      -- dono da tarefa
    titulo          VARCHAR(150) NOT NULL,
    categoria       VARCHAR(40) NOT NULL DEFAULT 'Acadêmico',   -- Acadêmico, Estágio, Secretaria, Pesquisa
    responsavel     VARCHAR(100),                      -- texto livre: pessoa ou setor
    data_entrega    DATE,                              -- "Prazo de entrega"
    prioridade      ENUM('baixa', 'media', 'alta') NOT NULL DEFAULT 'media',
    status          ENUM('aberta', 'em_andamento', 'concluida') NOT NULL DEFAULT 'aberta',
    observacao      VARCHAR(150),                      -- "Aguardando assinatura", "Relatório semestral"
    concluida_em    DATE NULL,                         -- "Finalizado em 05 set"
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    INDEX idx_tarefas_usuario (id_usuario, status, data_entrega),
    FULLTEXT INDEX ft_tarefas_busca (titulo)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. DOCUMENTOS = REQUERIMENTOS ACADÊMICOS
--    Aluno solicita ("Novo requerimento"); secretaria acompanha/entrega.
-- ---------------------------------------------------------------------
CREATE TABLE documentos (
    id_documento    INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NOT NULL,                      -- solicitante
    id_responsavel  INT NULL,                          -- servidor que está tratando
    titulo          VARCHAR(150) NOT NULL,             -- "Tipo de documento"
    motivo          TEXT,                              -- "Motivo da solicitação"
    descricao       TEXT,                              -- texto do card
    protocolo       VARCHAR(20) UNIQUE,                -- gerar após o INSERT (ver nota no fim do arquivo)
    tipo            ENUM('pdf', 'requerimento', 'assinatura') NOT NULL DEFAULT 'requerimento',
    status          ENUM('solicitado', 'em_analise', 'pendente', 'pronto') NOT NULL DEFAULT 'solicitado',
    observacao      VARCHAR(255),                      -- "Secretaria acadêmica avaliando..."
    previsao        DATE NULL,                         -- previsão de resposta / prazo
    data_emissao    DATE NULL,                         -- "Data de emissão: 08 set"
    arquivo         VARCHAR(255),                      -- caminho do PDF pronto ("Baixar documento")
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)     REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_responsavel) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_documentos_usuario (id_usuario, status),
    FULLTEXT INDEX ft_documentos_busca (titulo, descricao)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. CALENDÁRIO ACADÊMICO
-- ---------------------------------------------------------------------
CREATE TABLE calendario (
    id_evento       INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NULL,
    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT,                              -- "Portal do estudante, a partir das 08:00"
    categoria       ENUM('matricula', 'cancelamento', 'evento', 'edital', 'feriado')
                        NOT NULL DEFAULT 'evento',
    periodo_letivo  VARCHAR(60),                       -- "2º semestre letivo · 2026" (agrupamento)
    data_evento     DATE NOT NULL,
    data_fim        DATE NULL,
    hora_inicio     TIME NULL,
    hora_fim        TIME NULL,
    local           VARCHAR(150),
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_calendario_data (data_evento),
    FULLTEXT INDEX ft_calendario_busca (titulo, descricao)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. PROJETOS (pesquisa, extensão, ensino, inovação)
-- ---------------------------------------------------------------------
CREATE TABLE projetos (
    id_projeto        INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario        INT NULL,                        -- quem cadastrou/submeteu
    titulo            VARCHAR(150) NOT NULL,
    descricao         TEXT NOT NULL,                   -- "Resumo da proposta"
    eixo              ENUM('pesquisa', 'extensao', 'ensino', 'inovacao') NOT NULL DEFAULT 'pesquisa',
    responsavel_nome  VARCHAR(100),                    -- "Larissa Menezes" (pode não ser usuária do site)
    rotulo_responsavel VARCHAR(20) NOT NULL DEFAULT 'Coordenação',  -- "Orientação" | "Coordenação"
    vagas             INT UNSIGNED NOT NULL DEFAULT 0,
    unidade_vaga      VARCHAR(20) NOT NULL DEFAULT 'vagas',         -- "bolsas" | "participantes" | "vagas"
    link              VARCHAR(500),
    situacao          ENUM('ativo', 'inscricoes', 'em_selecao', 'em_andamento', 'encerrado')
                          NOT NULL DEFAULT 'ativo',
    aprovacao         ENUM('pendente', 'aprovado', 'recusado') NOT NULL DEFAULT 'pendente',
                      -- "avaliação da banca": só 'aprovado' aparece na listagem pública
    aprovado_por      INT NULL,
    data_inicio       DATE,
    data_fim          DATE,
    criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)   REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    FOREIGN KEY (aprovado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_projetos_listagem (aprovacao, eixo, situacao),
    FULLTEXT INDEX ft_projetos_busca (titulo, descricao)
) ENGINE=InnoDB;

CREATE TABLE projeto_inscricoes (
    id_projeto      INT NOT NULL,
    id_usuario      INT NOT NULL,
    status          ENUM('inscrito', 'aprovado', 'recusado', 'cancelado') NOT NULL DEFAULT 'inscrito',
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_projeto, id_usuario),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto)  ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. LEMBRETES (pessoais)
-- ---------------------------------------------------------------------
CREATE TABLE lembretes (
    id_lembrete     INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NOT NULL,
    id_evento       INT NULL,                          -- opcional: evento do calendário
    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT,
    tipo            ENUM('prazo', 'evento') NOT NULL DEFAULT 'prazo',
    data_lembrete   DATETIME NOT NULL,                 -- data + horário
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)  ON DELETE CASCADE,
    FOREIGN KEY (id_evento)  REFERENCES calendario(id_evento) ON DELETE SET NULL,
    INDEX idx_lembretes_usuario (id_usuario, data_lembrete)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. LINKS ÚTEIS ("Sistemas institucionais" na tela Documentos)
-- ---------------------------------------------------------------------
CREATE TABLE links_uteis (
    id_link         INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NULL,
    titulo          VARCHAR(150) NOT NULL,
    descricao       VARCHAR(255),
    url             VARCHAR(500) NOT NULL,
    categoria       VARCHAR(50) NOT NULL DEFAULT 'Institucional',  -- 'Acadêmico' | 'Regulamentos e Ouvidoria' | ...
    ordem           SMALLINT NOT NULL DEFAULT 0,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------

-- Tela "Pessoas": deriva de usuarios (substitui a tabela "pessoas" duplicada)
CREATE VIEW vw_pessoas AS
SELECT u.id_usuario,
       u.nome,
       u.nome_social,
       u.tipo_usuario,
       COALESCE(c.nome, u.setor) AS curso_ou_setor,
       u.periodo,
       u.email
FROM usuarios u
LEFT JOIN cursos c ON c.id_curso = u.id_curso
WHERE u.situacao = 'ativo';

-- Painel > "Próximas datas". id_usuario NULL = público; filtre no backend:
--   WHERE data >= CURDATE() AND (id_usuario IS NULL OR id_usuario = ?)
--   ORDER BY data LIMIT 4
CREATE VIEW vw_proximas_datas AS
    SELECT 'calendario' AS origem, id_evento AS id_origem, titulo,
           data_evento AS data, categoria AS rotulo, NULL AS id_usuario
      FROM calendario
    UNION ALL
    SELECT 'aviso', id_aviso, titulo,
           COALESCE(data_evento, data_prazo), categoria, NULL
      FROM avisos
     WHERE situacao = 'publicado' AND COALESCE(data_evento, data_prazo) IS NOT NULL
    UNION ALL
    SELECT 'tarefa', id_tarefa, titulo, data_entrega, status, id_usuario
      FROM tarefas
     WHERE status <> 'concluida' AND data_entrega IS NOT NULL
    UNION ALL
    SELECT 'documento', id_documento, titulo, COALESCE(previsao, data_emissao), status, id_usuario
      FROM documentos
     WHERE COALESCE(previsao, data_emissao) IS NOT NULL;

-- Painel > "Criados recentemente". Filtre: (id_usuario IS NULL OR id_usuario = ?)
--   ORDER BY criado_em DESC LIMIT 4
CREATE VIEW vw_criados_recentemente AS
    SELECT 'projeto' AS origem, id_projeto AS id_origem, titulo, criado_em, NULL AS id_usuario
      FROM projetos WHERE aprovacao = 'aprovado'
    UNION ALL
    SELECT 'aviso', id_aviso, titulo, criado_em, NULL
      FROM avisos WHERE situacao = 'publicado'
    UNION ALL
    SELECT 'calendario', id_evento, titulo, criado_em, NULL
      FROM calendario
    UNION ALL
    SELECT 'documento', id_documento, titulo, criado_em, id_usuario
      FROM documentos;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
DELIMITER $$

-- Avisos: só docente/servidor ativos
CREATE TRIGGER trg_avisos_autor
BEFORE INSERT ON avisos FOR EACH ROW
BEGIN
    DECLARE v_tipo VARCHAR(20);
    SELECT tipo_usuario INTO v_tipo FROM usuarios
     WHERE id_usuario = NEW.id_usuario AND situacao = 'ativo';
    IF v_tipo IS NULL OR v_tipo = 'discente' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Apenas docentes e servidores ativos podem publicar avisos.';
    END IF;
END$$

-- Projetos: discente submete como "pendente"; docente/servidor já entra "aprovado"
CREATE TRIGGER trg_projetos_aprovacao
BEFORE INSERT ON projetos FOR EACH ROW
BEGIN
    DECLARE v_tipo VARCHAR(20);
    SELECT tipo_usuario INTO v_tipo FROM usuarios
     WHERE id_usuario = NEW.id_usuario AND situacao = 'ativo';
    IF v_tipo IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Usuário inválido ou inativo para submeter projetos.';
    ELSEIF v_tipo = 'discente' THEN
        SET NEW.aprovacao = 'pendente';
        SET NEW.aprovado_por = NULL;
    ELSE
        SET NEW.aprovacao = 'aprovado';
    END IF;
END$$

-- Sessões e recuperação de senha: dono = usuário OU externo (nunca os dois, nunca nenhum)
CREATE TRIGGER trg_tokens_dono
BEFORE INSERT ON tokens FOR EACH ROW
BEGIN
    IF (NEW.id_usuario IS NULL) = (NEW.id_externo IS NULL) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Informe id_usuario OU id_externo (apenas um).';
    END IF;
END$$

CREATE TRIGGER trg_recuperacao_dono
BEFORE INSERT ON recuperacao_senha FOR EACH ROW
BEGIN
    IF (NEW.id_usuario IS NULL) = (NEW.id_externo IS NULL) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Informe id_usuario OU id_externo (apenas um).';
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- DADOS INICIAIS
-- ---------------------------------------------------------------------
INSERT INTO cursos (nome, nivel) VALUES
('Técnico em Informática',        'tecnico'),
('Bacharelado em Agroecologia',   'graduacao');
-- Acrescente aqui os demais cursos do campus para o <select> do cadastro.

INSERT INTO links_uteis (titulo, descricao, url, categoria, ordem) VALUES
('SIGAA · Sistema Integrado de Gestão Acadêmica', 'Notas, faltas e turmas virtuais',
 'https://sigaa.ifpa.edu.br', 'Acadêmico', 1),
('Biblioteca Virtual IFPA', 'Acervo de livros e periódicos digitais',
 'https://biblioteca.ifpa.edu.br', 'Acadêmico', 2),
('Regulamento Didático-Pedagógico (RDP)', 'Normas acadêmicas e regime escolar',
 'https://belem.ifpa.edu.br/documentos-normativos', 'Regulamentos e Ouvidoria', 1),
('Ouvidoria Geral do IFPA', 'Canal Fala.BR para solicitações e manifestações',
 'https://falabr.cgu.gov.br', 'Regulamentos e Ouvidoria', 2),
('Portal do Aluno e Assistência Estudantil', 'Editais de auxílio transporte, alimentação, moradia e bolsas',
 'https://belem.ifpa.edu.br/assistencia-estudantil', 'Institucional', 1);