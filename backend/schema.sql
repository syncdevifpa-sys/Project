-- Execute apenas em um banco novo. Este esquema não é uma migração incremental.
CREATE DATABASE IF NOT EXISTS arcadia
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
-- Preferências públicas: sem contato ou foto compartilhados por padrão.
CREATE TABLE perfil_compartilhamento (
    id_compartilhamento INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL UNIQUE,
    id_externo INT NULL UNIQUE,
    contato_email VARCHAR(150) NOT NULL DEFAULT '',
    contato_handle VARCHAR(100) NOT NULL DEFAULT '',
    contato_telefone VARCHAR(30) NOT NULL DEFAULT '',
    mostrar_email BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_handle BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_telefone BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_foto BOOLEAN NOT NULL DEFAULT FALSE,
    foto MEDIUMTEXT NULL,
    CONSTRAINT fk_compartilhamento_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_compartilhamento_externo FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE,
    CONSTRAINT chk_compartilhamento_conta CHECK ((id_usuario IS NULL) <> (id_externo IS NULL))
) ENGINE=InnoDB;

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

-- Execute apenas no banco correto, após backup. Não execute schema.sql em uma base existente.
-- Vínculos por identificador estável do Google. Senhas e permissões continuam nas contas do Arcádia.
CREATE TABLE IF NOT EXISTS google_identidades (
    google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    id_usuario INT NULL UNIQUE,
    id_externo INT NULL UNIQUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_google_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_google_externo FOREIGN KEY (id_externo) REFERENCES publico_externo(id_externo) ON DELETE CASCADE,
    CONSTRAINT chk_google_identidade CHECK ((id_usuario IS NOT NULL) <> (id_externo IS NOT NULL))
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
-- Limites distribuídos: não contém e-mails, IPs ou tokens em texto puro.
CREATE TABLE seguranca_limites (
    chave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    janela BIGINT UNSIGNED NOT NULL,
    tentativas INT UNSIGNED NOT NULL DEFAULT 0,
    expira_em DATETIME NOT NULL,
    INDEX idx_limites_expiracao (expira_em)
) ENGINE=InnoDB;

-- Migração gradual. Execute no banco correto após revisar.
-- DDL faz COMMIT implícito. Não altera contas, papéis, senhas nem sessões existentes.
-- Ausência de email_estado significa LEGADO NÃO VERIFICADO, nunca confirmação presumida.
CREATE TABLE IF NOT EXISTS seguranca_email_lock (
    chave TINYINT PRIMARY KEY
) ENGINE=InnoDB;
INSERT IGNORE INTO seguranca_email_lock (chave) VALUES (1);
CREATE TABLE IF NOT EXISTS email_estado (
    tipo ENUM('users', 'external') NOT NULL,
    identidade INT NOT NULL,
    email VARCHAR(150) NOT NULL,
    regime ENUM('novo', 'legado') NOT NULL,
    confirmado_em DATETIME NULL,
    PRIMARY KEY (tipo, identidade)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS email_tokens (
    id_token_email BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('users', 'external') NOT NULL,
    identidade INT NOT NULL,
    email_destino VARCHAR(150) NOT NULL,
    email_anterior VARCHAR(150) NOT NULL,
    finalidade ENUM('cadastro', 'troca') NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado_em DATETIME NULL,
    INDEX idx_email_destino (email_destino, expira_em),
    INDEX idx_email_conta (tipo, identidade)
) ENGINE=InnoDB;

-- 4. AVISOS (mural)
-- ---------------------------------------------------------------------
CREATE TABLE avisos (
    id_aviso        INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NULL,                          -- autor
    tipo_publicacao ENUM('aviso', 'noticia') NOT NULL DEFAULT 'aviso',
    capa MEDIUMTEXT NULL,
    titulo          VARCHAR(150) NOT NULL,
    resumo          TEXT NOT NULL,                     -- "Resumo do comunicado" (texto do card)
    descricao       TEXT,                              -- texto completo (página notice.html)
    categoria       ENUM('matricula', 'edital', 'evento', 'cancelamento', 'calendario')
                        NOT NULL DEFAULT 'matricula',
    publico_alvo    SET('todos', 'discente', 'docente', 'servidor', 'externo') NOT NULL DEFAULT 'todos',
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
    categoria       ENUM('matricula', 'cancelamento', 'evento', 'edital', 'feriado', 'ferias', 'aniversario', 'atividades_campus', 'sabado_letivo', 'periodo_academico', 'culminancia_bimestral', 'recesso', 'registro_academico', 'ponto_facultativo', 'avaliacao', 'interrupcao_presencial', 'ferias_docentes')
                        NOT NULL DEFAULT 'evento',
    oculto         TINYINT(1) NOT NULL DEFAULT 0,
    visibilidade   ENUM('publico','pessoal') NOT NULL DEFAULT 'publico',
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
      FROM calendario WHERE oculto = 0 AND visibilidade = 'publico'
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
      FROM calendario WHERE oculto = 0 AND visibilidade = 'publico'
    UNION ALL
    SELECT 'documento', id_documento, titulo, criado_em, id_usuario
      FROM documentos;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
DELIMITER $$

-- Avisos: docentes, servidores e administradores ativos
CREATE TRIGGER trg_avisos_autor
BEFORE INSERT ON avisos FOR EACH ROW
BEGIN
    DECLARE v_tipo VARCHAR(20);
    DECLARE v_admin BOOLEAN;
    SELECT tipo_usuario, is_admin INTO v_tipo, v_admin FROM usuarios
     WHERE id_usuario = NEW.id_usuario AND situacao = 'ativo';
    IF v_tipo IS NULL OR (v_tipo = 'discente' AND NOT v_admin) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Apenas docentes, servidores e administradores ativos podem publicar avisos.';
    END IF;
END$$

-- Projetos: discente submete como "pendente"; docente/servidor já entra "aprovado"
CREATE TRIGGER trg_projetos_aprovacao
BEFORE INSERT ON projetos FOR EACH ROW
BEGIN
    DECLARE v_tipo VARCHAR(20);
    DECLARE v_admin BOOLEAN;
    SELECT tipo_usuario, is_admin INTO v_tipo, v_admin FROM usuarios
     WHERE id_usuario = NEW.id_usuario AND situacao = 'ativo';
    IF v_tipo IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Usuário inválido ou inativo para submeter projetos.';
    ELSEIF v_tipo = 'discente' AND NOT v_admin THEN
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
-- Oferta de Belém comprovada em 2026; fontes em catalog/belem-courses-2026.json.
INSERT INTO cursos (nome, nivel) VALUES
('Técnico em Agrimensura (Integrado)', 'tecnico'),
('Técnico em Desenvolvimento de Sistemas (Integrado)', 'tecnico'),
('Técnico em Design de Interiores (Integrado)', 'tecnico'),
('Técnico em Edificações (Integrado)', 'tecnico'),
('Técnico em Eletrônica (Integrado)', 'tecnico'),
('Técnico em Eletrotécnica (Integrado)', 'tecnico'),
('Técnico em Estradas (Integrado)', 'tecnico'),
('Técnico em Eventos (Integrado)', 'tecnico'),
('Técnico em Mecânica (Integrado)', 'tecnico'),
('Técnico em Metalurgia (Integrado)', 'tecnico'),
('Técnico em Mineração (Integrado)', 'tecnico'),
('Técnico em Química (Integrado)', 'tecnico'),
('Técnico em Recursos Pesqueiros (Integrado)', 'tecnico'),
('Técnico em Saneamento (Integrado)', 'tecnico'),
('Técnico em Telecomunicações (Integrado)', 'tecnico'),
('Técnico em Agente Comunitário de Saúde (Subsequente)', 'tecnico'),
('Técnico em Aquicultura (Subsequente)', 'tecnico'),
('Técnico em Edificações (Subsequente)', 'tecnico'),
('Técnico em Eletrônica (Subsequente)', 'tecnico'),
('Técnico em Eletrotécnica (Subsequente)', 'tecnico'),
('Técnico em Eventos (Subsequente)', 'tecnico'),
('Técnico em Geodésia e Cartografia (Subsequente)', 'tecnico'),
('Técnico em Guia de Turismo (Subsequente)', 'tecnico'),
('Técnico em Hospedagem (Subsequente)', 'tecnico'),
('Técnico em Mecânica (Subsequente)', 'tecnico'),
('Técnico em Mineração (Subsequente)', 'tecnico'),
('Técnico em Química (Subsequente)', 'tecnico'),
('Técnico em Saneamento (Subsequente)', 'tecnico'),
('Técnico em Segurança do Trabalho (Subsequente)', 'tecnico'),
('Técnico em Telecomunicações (Subsequente)', 'tecnico'),
('Técnico em Vigilância em Saúde (Subsequente)', 'tecnico'),
('Bacharelado em Engenharia de Controle e Automação', 'graduacao'),
('Bacharelado em Engenharia de Materiais', 'graduacao'),
('Bacharelado em Engenharia Elétrica', 'graduacao'),
('Licenciatura em Ciências Biológicas', 'graduacao'),
('Licenciatura em Geografia', 'graduacao'),
('Licenciatura em História', 'graduacao'),
('Licenciatura em Letras - Língua Portuguesa', 'graduacao'),
('Licenciatura em Matemática', 'graduacao'),
('Licenciatura em Pedagogia', 'graduacao'),
('Licenciatura em Química', 'graduacao'),
('Tecnologia em Análise e Desenvolvimento de Sistemas', 'graduacao'),
('Tecnologia em Gestão Hospitalar', 'graduacao'),
('Tecnologia em Gestão Pública', 'graduacao'),
('Tecnologia em Saneamento Ambiental', 'graduacao'),
('Especialização em Linguagens e Artes na Formação Docente', 'pos_graduacao'),
('Especialização em Tecnologia Social em Saneamento, Saúde e Ambiente na Amazônia', 'pos_graduacao'),
('Mestrado Profissional em Engenharia de Materiais', 'pos_graduacao');

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
