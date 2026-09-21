const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Banco de dados SQLite ----
const dbPath = path.join(__dirname, 'syncdev.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Erro ao abrir banco de dados:', err.message);
  } else {
    console.log('Banco de dados SQLite aberto: ' + dbPath);
  }
});

// Helper para executar migrations de colunas com segurança
function safeAddColumn(table, columnDef) {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, () => {});
}

// Inicialização e schema do banco
db.serialize(() => {
  // 1. Usuários
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    nome_social TEXT,
    email TEXT UNIQUE NOT NULL,
    email_pessoal TEXT,
    telefone TEXT,
    senha TEXT NOT NULL,
    vinculo TEXT DEFAULT 'Aluno',
    matricula TEXT,
    curso TEXT,
    sobre TEXT,
    preferences TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  safeAddColumn('usuarios', 'nome_social TEXT');
  safeAddColumn('usuarios', 'email_pessoal TEXT');
  safeAddColumn('usuarios', 'telefone TEXT');
  safeAddColumn('usuarios', 'sobre TEXT');

  // 2. Tokens / Sessões
  db.run(`CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    dispositivo TEXT DEFAULT 'Navegador Web',
    ip TEXT DEFAULT '127.0.0.1',
    ultimo_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);

  safeAddColumn('tokens', "dispositivo TEXT DEFAULT 'Navegador Web'");
  safeAddColumn('tokens', "ip TEXT DEFAULT '127.0.0.1'");
  safeAddColumn('tokens', 'ultimo_acesso DATETIME');

  // 3. Avisos
  db.run(`CREATE TABLE IF NOT EXISTS avisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    resumo TEXT,
    conteudo TEXT,
    categoria TEXT DEFAULT 'matricula',
    publico TEXT DEFAULT 'Todos',
    data TEXT,
    situacao TEXT DEFAULT 'Publicado',
    urgente INTEGER DEFAULT 0,
    fixado INTEGER DEFAULT 0,
    autor_id INTEGER,
    autor_nome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  safeAddColumn('avisos', 'resumo TEXT');
  safeAddColumn('avisos', "categoria TEXT DEFAULT 'matricula'");
  safeAddColumn('avisos', "publico TEXT DEFAULT 'Todos'");
  safeAddColumn('avisos', "situacao TEXT DEFAULT 'Publicado'");
  safeAddColumn('avisos', 'urgente INTEGER DEFAULT 0');
  safeAddColumn('avisos', 'fixado INTEGER DEFAULT 0');

  // 4. Tarefas
  db.run(`CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    responsavel TEXT,
    prazo TEXT,
    situacao TEXT DEFAULT 'Aberta',
    autor_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 5. Documentos
  db.run(`CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    protocolo TEXT,
    tipo TEXT DEFAULT 'PDF',
    situacao TEXT DEFAULT 'Em análise',
    previsao TEXT,
    autor_id INTEGER,
    autor_nome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  safeAddColumn('documentos', 'protocolo TEXT');
  safeAddColumn('documentos', "tipo TEXT DEFAULT 'PDF'");
  safeAddColumn('documentos', "situacao TEXT DEFAULT 'Em análise'");
  safeAddColumn('documentos', 'previsao TEXT');

  // 6. Calendário
  db.run(`CREATE TABLE IF NOT EXISTS calendario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    categoria TEXT DEFAULT 'evento',
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 7. Pessoas
  db.run(`CREATE TABLE IF NOT EXISTS pessoas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    vinculo TEXT NOT NULL DEFAULT 'Aluno',
    cursoOuSetor TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 8. Projetos
  db.run(`CREATE TABLE IF NOT EXISTS projetos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    autor TEXT,
    eixo TEXT DEFAULT 'Pesquisa',
    categoria TEXT,
    vagas INTEGER DEFAULT 0,
    situacao TEXT DEFAULT 'Ativo',
    link TEXT,
    autor_id INTEGER,
    autor_nome TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  safeAddColumn('projetos', 'autor TEXT');
  safeAddColumn('projetos', "eixo TEXT DEFAULT 'Pesquisa'");
  safeAddColumn('projetos', 'vagas INTEGER DEFAULT 0');
  safeAddColumn('projetos', "situacao TEXT DEFAULT 'Ativo'");

  // 9. Lembretes (RF08)
  db.run(`CREATE TABLE IF NOT EXISTS lembretes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id TEXT,
    titulo TEXT NOT NULL,
    data TEXT NOT NULL,
    horario TEXT DEFAULT '08:00',
    ativo INTEGER DEFAULT 1,
    tipo TEXT DEFAULT 'prazo',
    descricao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 10. Links Úteis (RF09)
  db.run(`CREATE TABLE IF NOT EXISTS links_uteis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    url TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT DEFAULT 'Institucional',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed Lembretes se vazio
  db.get('SELECT COUNT(*) as count FROM lembretes', (err, r) => {
    if (!err && (!r || r.count === 0)) {
      const stmt = db.prepare('INSERT INTO lembretes (evento_id, titulo, data, horario, ativo, tipo, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run('1', 'Abertura da matrícula 2026/2', '14 set', '08:00', 1, 'prazo', 'Confirmação de disciplinas pelo portal acadêmico');
      stmt.run('2', 'Prazo final de trancamento de matrícula', '26 set', '23:59', 1, 'prazo', 'Protocolo de cancelamento via secretaria acadêmica');
      stmt.run('3', 'Publicação do resultado PIBIC', '10 out', '18:00', 1, 'evento', 'Divulgação dos selecionados para bolsas de iniciação científica');
      stmt.run('4', 'Semana de Ciência e Tecnologia', '20 out', '09:00', 0, 'evento', 'Palestras e apresentações de banners no auditório central');
      stmt.finalize();
    }
  });

  // Seed Links Úteis se vazio
  db.get('SELECT COUNT(*) as count FROM links_uteis', (err, r) => {
    if (!err && (!r || r.count === 0)) {
      const stmt = db.prepare('INSERT INTO links_uteis (titulo, url, descricao, categoria) VALUES (?, ?, ?, ?)');
      stmt.run('SIGAA — Sistema Integrado de Gestão Acadêmica', 'https://sigaa.ifpa.edu.br', 'Acesso a notas, frequências, histórico acadêmico e planos de ensino.', 'Sistemas');
      stmt.run('Biblioteca Virtual IFPA', 'https://biblioteca.ifpa.edu.br', 'Acervo digital de livros, periódicos, artigos e teses do campus.', 'Acadêmico');
      stmt.run('Regulamento Didático-Pedagógico (RDP)', 'https://belem.ifpa.edu.br/documentos-normativos', 'Normas de regime escolar, abono de faltas, dependências e trancamento.', 'Regulamentos');
      stmt.run('Portal do Aluno e Assistência Estudantil', 'https://belem.ifpa.edu.br/assistencia-estudantil', 'Editais de auxílio transporte, alimentação, moradia e bolsas de estudo.', 'Institucional');
      stmt.run('Ouvidoria Geral do IFPA', 'https://falabr.cgu.gov.br', 'Canal oficial para envio de sugestões, elogios, requerimentos e denúncias.', 'Institucional');
      stmt.finalize();
    }
  });

  // ---- SEEDER INICIAL ----
  // Seed Ana Ribeiro se necessário
  db.get("SELECT * FROM usuarios WHERE email = 'ana.ribeiro@ifpa.edu.br'", (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO usuarios (nome, email, email_pessoal, telefone, senha, vinculo, matricula, curso, sobre, preferences)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Ana Ribeiro',
          'ana.ribeiro@ifpa.edu.br',
          'ana.ribeiro@ifpa.edu.br',
          '(91) 98888-1234',
          '12345678',
          'Aluno',
          '2026104882',
          'Técnico em Informática',
          'Estudante do 4º período do curso Técnico em Informática no IFPA Campus Belém.',
          JSON.stringify({
            notificacoesUrgentes: true,
            notificacoesEditais: true,
            notificacoesResumo: false,
          }),
        ]
      );
    } else {
      // Atualizar campos caso nulos
      db.run(
        `UPDATE usuarios SET
          email_pessoal = COALESCE(email_pessoal, 'ana.ribeiro@ifpa.edu.br'),
          telefone = COALESCE(telefone, '(91) 98888-1234'),
          matricula = COALESCE(matricula, '2026104882'),
          curso = COALESCE(curso, 'Técnico em Informática')
         WHERE id = ?`,
        [row.id]
      );
    }
  });

  // Seed Avisos
  db.get('SELECT COUNT(*) as count FROM avisos', (err, row) => {
    if (row && row.count === 0) {
      const avisosIniciais = [
        ['Abertura da matrícula 2026/2', 'Confirmação de disciplinas pelo portal', 'Confirmação de disciplinas pelo portal', 'matricula', 'Todos', '14 SET', 'Publicado', 1, 1],
        ['Edital PIBIC 2026', 'Bolsas de iniciação científica', 'Bolsas de iniciação científica para alunos de graduação e ensino técnico', 'edital', 'Aluno', '22 SET', 'Publicado', 0, 0],
        ['Semana de Ciência e Tecnologia', 'Programação nos três turnos', 'Programação aberta com palestras, oficinas e apresentações', 'evento', 'Todos', '05 OUT', 'Rascunho', 0, 0],
        ['Aula suspensa no Bloco C', 'Manutenção elétrica no prédio', 'Manutenção corretiva na subestação do bloco C', 'cancelamento', 'Todos', '09 SET', 'Publicado', 1, 0],
        ['Calendário do 2º semestre', 'Datas oficiais consolidadas', 'Calendário acadêmico aprovado pelo conselho superior', 'calendario', 'Todos', '01 SET', 'Arquivado', 0, 0],
      ];
      const stmt = db.prepare(
        'INSERT INTO avisos (titulo, resumo, conteudo, categoria, publico, data, situacao, urgente, fixado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      avisosIniciais.forEach((a) => stmt.run(a));
      stmt.finalize();
      console.log('Seeded initial avisos in SQLite.');
    }
  });

  // Seed Tarefas
  db.get('SELECT COUNT(*) as count FROM tarefas', (err, row) => {
    if (row && row.count === 0) {
      const tarefasIniciais = [
        ['Confirmar disciplinas do semestre', 'Ana Ribeiro', '12 SET', 'Aberta'],
        ['Entregar relatório de estágio', 'Ana Ribeiro', '20 SET', 'Em andamento'],
        ['Assinar termo de bolsa', 'Coordenação de pesquisa', '18 SET', 'Aguardando'],
        ['Atualizar dados cadastrais', 'Secretaria acadêmica', '05 SET', 'Concluída'],
      ];
      const stmt = db.prepare('INSERT INTO tarefas (titulo, responsavel, prazo, situacao) VALUES (?, ?, ?, ?)');
      tarefasIniciais.forEach((t) => stmt.run(t));
      stmt.finalize();
      console.log('Seeded initial tarefas in SQLite.');
    }
  });

  // Seed Documentos
  db.get('SELECT COUNT(*) as count FROM documentos', (err, row) => {
    if (row && row.count === 0) {
      const docsIniciais = [
        ['Histórico escolar completo', 'Histórico completo emitido pelo sistema', '2026-0001', 'PDF', 'Pronto', '08 SET'],
        ['Declaração de vínculo', 'Declaração para passe escolar e estágio', '2026-0002', 'Requerimento', 'Em análise', '15 SET'],
        ['Atestado de matrícula', 'Comprovante de matrícula atual', '2026-0003', 'PDF', 'Solicitado', '19 SET'],
        ['Termo de compromisso de estágio', 'Termo tripartite IFPA, empresa e aluno', '2026-0004', 'Assinatura', 'Pendente', '11 SET'],
      ];
      const stmt = db.prepare(
        'INSERT INTO documentos (titulo, descricao, protocolo, tipo, situacao, previsao) VALUES (?, ?, ?, ?, ?, ?)'
      );
      docsIniciais.forEach((d) => stmt.run(d));
      stmt.finalize();
      console.log('Seeded initial documentos in SQLite.');
    }
  });

  // Seed Calendário
  db.get('SELECT COUNT(*) as count FROM calendario', (err, row) => {
    if (row && row.count === 0) {
      const eventosIniciais = [
        ['Início do período de matrícula', 'Portal do estudante, a partir das 8h', 'matricula', '14 SET'],
        ['Prazo final de trancamento', 'Protocolo na secretaria acadêmica', 'cancelamento', '26 SET'],
        ['Semana de Ciência e Tecnologia', 'Auditório central e laboratórios', 'evento', '05 OUT'],
        ['Publicação do resultado PIBIC', 'Mural institucional e portal', 'edital', '12 OUT'],
      ];
      const stmt = db.prepare('INSERT INTO calendario (titulo, subtitulo, categoria, data) VALUES (?, ?, ?, ?)');
      eventosIniciais.forEach((e) => stmt.run(e));
      stmt.finalize();
      console.log('Seeded initial calendario in SQLite.');
    }
  });

  // Seed Pessoas
  db.get('SELECT COUNT(*) as count FROM pessoas', (err, row) => {
    if (row && row.count === 0) {
      const pessoasIniciais = [
        ['Ana Ribeiro', 'Aluno', 'Técnico em Informática', 'ana.ribeiro@ifpa.edu.br'],
        ['Marcos Tavares', 'Professor', 'Coordenação de Pesquisa', 'marcos.tavares@ifpa.edu.br'],
        ['Júlia Andrade', 'Servidor', 'Secretaria Acadêmica', 'julia.andrade@ifpa.edu.br'],
        ['Rafael Lima', 'Aluno', 'Agroecologia', 'rafael.lima@ifpa.edu.br'],
      ];
      const stmt = db.prepare('INSERT INTO pessoas (nome, vinculo, cursoOuSetor, email) VALUES (?, ?, ?, ?)');
      pessoasIniciais.forEach((p) => stmt.run(p));
      stmt.finalize();
      console.log('Seeded initial pessoas in SQLite.');
    }
  });

  // Seed Projetos
  db.get('SELECT COUNT(*) as count FROM projetos', (err, row) => {
    if (row && row.count === 0) {
      const projetosIniciais = [
        ['Palestra: Preservação, Biodiversidade e Bioeconomia na Amazônia', 'Prof. Dr. Mauro Santos', 'Extensão', 60, 'Inscrições'],
        ['Monitoramento da Qualidade das Águas da Bacia do Guajará', 'Larissa Menezes', 'Pesquisa', 6, 'Ativo'],
        ['Robótica Educacional com Reaproveitamento de Sucata', 'Júlia Andrade', 'Ensino', 8, 'Em seleção'],
        ['Mapeamento Colaborativo de Saberes Tradicionais e Etnobotânica', 'Rafael Lima', 'Inovação', 12, 'Ativo'],
      ];
      const stmt = db.prepare(
        'INSERT INTO projetos (titulo, autor, eixo, vagas, situacao, categoria, autor_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      projetosIniciais.forEach((p) => stmt.run([...p, p[2], 3]));
      stmt.finalize();
      console.log('Seeded initial projetos in SQLite.');
    }
  });
});

// ---- Autenticação e Helpers ----
function gerarToken() {
  return 'tok_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getUsuarioFromToken(req, callback) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (token) {
    db.get('SELECT t.usuario_id, t.token FROM tokens t WHERE t.token = ?', [token], (err, row) => {
      if (!err && row) {
        db.run('UPDATE tokens SET ultimo_acesso = CURRENT_TIMESTAMP WHERE token = ?', [token]);
        db.get('SELECT * FROM usuarios WHERE id = ?', [row.usuario_id], (err2, usuario) => {
          if (!err2 && usuario) {
            usuario.currentToken = token;
            return callback(usuario);
          }
          return callback(null);
        });
        return;
      }
      return callback(null);
    });
    return;
  }

  callback(null);
}

function getAuthUser(req, callback) {
  getUsuarioFromToken(req, (user) => {
    callback(user);
  });
}

function requireAuth(req, res, next) {
  getUsuarioFromToken(req, (usuario) => {
    if (!usuario) {
      return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    }
    req.user = usuario;
    next();
  });
}

// Formatador de usuário seguro para retorno JSON
function formatUser(u) {
  let prefs = {};
  try {
    prefs = typeof u.preferences === 'string' ? JSON.parse(u.preferences || '{}') : u.preferences || {};
  } catch {}
  return {
    id: String(u.id),
    nome: u.nome,
    nomeSocial: u.nome_social || '',
    email: u.email,
    emailPessoal: u.email_pessoal || u.email,
    telefone: u.telefone || '',
    vinculo: (u.vinculo || 'Aluno').toLowerCase(),
    matricula: u.matricula || '',
    curso: u.curso || '',
    sobre: u.sobre || '',
    preferences: prefs,
  };
}

// ---- Rotas de Saúde ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Autenticação ----
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  db.get('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email.toLowerCase().trim(), senha], (err, usuario) => {
    if (err) {
      console.error('Erro no login:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    if (!usuario) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = gerarToken();
    const userAgent = req.headers['user-agent'] || 'Navegador Web';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    db.run(
      'INSERT INTO tokens (token, usuario_id, dispositivo, ip) VALUES (?, ?, ?, ?)',
      [token, usuario.id, userAgent.substring(0, 100), ip],
      (errInsert) => {
        if (errInsert) {
          console.error('Erro ao criar token:', errInsert.message);
          return res.status(500).json({ error: 'Erro ao criar sessão' });
        }
        res.json({
          token,
          usuario: formatUser(usuario),
        });
      }
    );
  });
});

app.post('/api/auth/cadastro', (req, res) => {
  const { nome, email, senha, vinculo, curso, matricula } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ error: 'A senha precisa ter no mínimo 8 caracteres' });
  }

  db.run(
    'INSERT INTO usuarios (nome, email, email_pessoal, senha, vinculo, curso, matricula) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      nome.trim(),
      email.toLowerCase().trim(),
      email.toLowerCase().trim(),
      senha,
      vinculo || 'Aluno',
      curso || 'Técnico em Informática',
      matricula || String(Math.floor(1000000000 + Math.random() * 9000000000)),
    ],
    function (err) {
      if (err && err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      if (err) {
        console.error('Erro no cadastro:', err.message);
        return res.status(500).json({ error: 'Erro interno' });
      }

      const userId = this.lastID;
      const token = gerarToken();
      db.run('INSERT INTO tokens (token, usuario_id) VALUES (?, ?)', [token, userId]);

      db.get('SELECT * FROM usuarios WHERE id = ?', [userId], (err2, usuario) => {
        if (err2 || !usuario) {
          return res.status(500).json({ error: 'Erro ao recuperar usuário' });
        }
        res.status(201).json({
          message: 'Conta criada com sucesso',
          token,
          usuario: formatUser(usuario),
        });
      });
    }
  );
});

app.get('/api/auth/perfil', (req, res) => {
  getAuthUser(req, (usuario) => {
    if (!usuario) return res.status(401).json({ error: 'Não autorizado' });
    res.json(formatUser(usuario));
  });
});

app.put('/api/auth/perfil', (req, res) => {
  getAuthUser(req, (usuario) => {
    if (!usuario) return res.status(401).json({ error: 'Não autorizado' });

    const { nome, nomeSocial, emailPessoal, telefone, sobre, preferences } = req.body;
    const updates = [];
    const values = [];

    if (nome != null) {
      updates.push('nome = ?');
      values.push(String(nome).trim());
    }
    if (nomeSocial != null) {
      updates.push('nome_social = ?');
      values.push(String(nomeSocial).trim());
    }
    if (emailPessoal != null) {
      updates.push('email_pessoal = ?');
      values.push(String(emailPessoal).trim());
    }
    if (telefone != null) {
      updates.push('telefone = ?');
      values.push(String(telefone).trim());
    }
    if (sobre != null) {
      updates.push('sobre = ?');
      values.push(String(sobre).trim());
    }
    if (preferences != null) {
      updates.push('preferences = ?');
      values.push(typeof preferences === 'string' ? preferences : JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      return res.json({ message: 'Nenhuma alteração enviada', usuario: formatUser(usuario) });
    }

    values.push(usuario.id);
    db.run(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
      if (err) {
        console.error('Erro ao atualizar perfil:', err.message);
        return res.status(500).json({ error: 'Erro ao salvar alterações no banco' });
      }
      db.get('SELECT * FROM usuarios WHERE id = ?', [usuario.id], (err2, updated) => {
        res.json({
          message: 'Perfil atualizado com sucesso',
          usuario: formatUser(updated || usuario),
        });
      });
    });
  });
});

app.post('/api/auth/alterar-senha', (req, res) => {
  getAuthUser(req, (usuario) => {
    if (!usuario) return res.status(401).json({ error: 'Não autorizado' });

    const { senhaAtual, novaSenha } = req.body;
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
    }
    if (novaSenha.length < 8) {
      return res.status(400).json({ error: 'A nova senha precisa ter no mínimo 8 caracteres' });
    }

    db.get('SELECT senha FROM usuarios WHERE id = ?', [usuario.id], (err, row) => {
      if (err || !row || row.senha !== senhaAtual) {
        return res.status(400).json({ error: 'A senha atual informada está incorreta' });
      }

      db.run('UPDATE usuarios SET senha = ? WHERE id = ?', [novaSenha, usuario.id], (errUpdate) => {
        if (errUpdate) {
          return res.status(500).json({ error: 'Erro ao atualizar senha' });
        }
        res.json({ message: 'Senha alterada com sucesso' });
      });
    });
  });
});

app.get('/api/auth/sessoes', (req, res) => {
  getAuthUser(req, (usuario) => {
    if (!usuario) return res.status(401).json({ error: 'Não autorizado' });

    db.all(
      'SELECT token, dispositivo, ip, created_at FROM tokens WHERE usuario_id = ? ORDER BY created_at DESC',
      [usuario.id],
      (err, rows) => {
        if (err || !rows || rows.length === 0) {
          return res.json({
            sessoes: [
              {
                id: '1',
                dispositivo: 'Navegador Web (Linux / Firefox)',
                ip: '127.0.0.1',
                data: 'Conectado agora',
                atual: true,
              },
            ],
          });
        }

        const sessoes = rows.map((r, i) => ({
          id: String(i + 1),
          dispositivo: r.dispositivo || 'Sessão ativa',
          ip: r.ip || '127.0.0.1',
          data: r.created_at || 'Ativa',
          atual: r.token === usuario.currentToken || i === 0,
        }));

        res.json({ sessoes });
      }
    );
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (token) {
    db.run('DELETE FROM tokens WHERE token = ?', [token], () => {});
  }
  res.json({ message: 'Sessão encerrada' });
});

app.post('/api/auth/logout-outros', (req, res) => {
  getAuthUser(req, (usuario) => {
    if (!usuario) return res.status(401).json({ error: 'Não autorizado' });

    const currentToken = usuario.currentToken;
    if (currentToken) {
      db.run('DELETE FROM tokens WHERE usuario_id = ? AND token != ?', [usuario.id, currentToken], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao encerrar sessões' });
        res.json({ message: 'Todas as outras sessões foram encerradas' });
      });
    } else {
      // Se não havia token específico, mantém 1 token recente e limpa o resto
      db.run('DELETE FROM tokens WHERE usuario_id = ?', [usuario.id], () => {
        res.json({ message: 'Todas as outras sessões foram encerradas' });
      });
    }
  });
});

// ---- Avisos ----
app.get('/api/avisos', (req, res) => {
  db.all('SELECT * FROM avisos ORDER BY fixado DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar avisos' });
    const avisos = (rows || []).map((r) => ({
      id: String(r.id),
      titulo: r.titulo,
      resumo: r.resumo || r.conteudo || '',
      categoria: r.categoria || 'matricula',
      publico: r.publico || 'Todos',
      data: r.data || 'Hoje',
      situacao: r.situacao || 'Publicado',
      urgente: !!r.urgente,
      fixado: !!r.fixado,
    }));
    res.json({ avisos });
  });
});

app.get('/api/avisos/:id', (req, res) => {
  db.get('SELECT * FROM avisos WHERE id = ?', [req.params.id], (err, r) => {
    if (err || !r) return res.status(404).json({ error: 'Aviso não encontrado' });
    res.json({
      aviso: {
        id: String(r.id),
        titulo: r.titulo,
        resumo: r.resumo || r.conteudo || '',
        categoria: r.categoria || 'matricula',
        publico: r.publico || 'Todos',
        data: r.data || 'Hoje',
        situacao: r.situacao || 'Publicado',
        urgente: !!r.urgente,
        fixado: !!r.fixado,
      },
    });
  });
});

app.post('/api/avisos', (req, res) => {
  getAuthUser(req, (usuario) => {
    const { titulo, resumo, conteudo, categoria, publico, data, situacao, urgente, fixado } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

    const sql = `INSERT INTO avisos (titulo, resumo, conteudo, categoria, publico, data, situacao, urgente, fixado, autor_id, autor_nome)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      titulo.trim(),
      resumo || conteudo || '',
      conteudo || resumo || '',
      categoria || 'matricula',
      publico || 'Todos',
      data || 'Hoje',
      situacao || 'Publicado',
      urgente ? 1 : 0,
      fixado ? 1 : 0,
      usuario ? usuario.id : null,
      usuario ? usuario.nome : 'Ana Ribeiro',
    ];

    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar aviso' });
      db.get('SELECT * FROM avisos WHERE id = ?', [this.lastID], (err2, r) => {
        res.status(201).json({
          message: 'Aviso criado com sucesso',
          aviso: {
            id: String(r.id),
            titulo: r.titulo,
            resumo: r.resumo || '',
            categoria: r.categoria,
            publico: r.publico,
            data: r.data,
            situacao: r.situacao,
            urgente: !!r.urgente,
            fixado: !!r.fixado,
          },
        });
      });
    });
  });
});

app.put('/api/avisos/:id', (req, res) => {
  const { titulo, resumo, categoria, publico, data, situacao, urgente, fixado } = req.body;
  const updates = [];
  const values = [];

  if (titulo != null) { updates.push('titulo = ?'); values.push(titulo); }
  if (resumo != null) { updates.push('resumo = ?'); values.push(resumo); }
  if (categoria != null) { updates.push('categoria = ?'); values.push(categoria); }
  if (publico != null) { updates.push('publico = ?'); values.push(publico); }
  if (data != null) { updates.push('data = ?'); values.push(data); }
  if (situacao != null) { updates.push('situacao = ?'); values.push(situacao); }
  if (urgente != null) { updates.push('urgente = ?'); values.push(urgente ? 1 : 0); }
  if (fixado != null) { updates.push('fixado = ?'); values.push(fixado ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.params.id);
  db.run(`UPDATE avisos SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar aviso' });
    db.get('SELECT * FROM avisos WHERE id = ?', [req.params.id], (err2, r) => {
      if (!r) return res.status(404).json({ error: 'Aviso não encontrado' });
      res.json({
        message: 'Aviso atualizado',
        aviso: {
          id: String(r.id),
          titulo: r.titulo,
          resumo: r.resumo || '',
          categoria: r.categoria,
          publico: r.publico,
          data: r.data,
          situacao: r.situacao,
          urgente: !!r.urgente,
          fixado: !!r.fixado,
        },
      });
    });
  });
});

app.delete('/api/avisos/:id', (req, res) => {
  db.run('DELETE FROM avisos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir aviso' });
    res.json({ message: 'Aviso excluído com sucesso' });
  });
});

app.post('/api/avisos/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM avisos WHERE id IN (${placeholders})`, ids, (err) => {
    if (err) return res.status(500).json({ error: 'Erro na exclusão em lote' });
    res.json({ message: `${ids.length} aviso(s) excluído(s)` });
  });
});

// ---- Tarefas ----
app.get('/api/tarefas', (req, res) => {
  db.all('SELECT * FROM tarefas ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar tarefas' });
    const tarefas = (rows || []).map((r) => ({
      id: String(r.id),
      titulo: r.titulo,
      responsavel: r.responsavel || 'Ana Ribeiro',
      prazo: r.prazo || 'Sem prazo',
      situacao: r.situacao || 'Aberta',
    }));
    res.json({ tarefas });
  });
});

app.post('/api/tarefas', (req, res) => {
  const { titulo, responsavel, prazo, situacao } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

  db.run(
    'INSERT INTO tarefas (titulo, responsavel, prazo, situacao) VALUES (?, ?, ?, ?)',
    [titulo.trim(), responsavel || 'Ana Ribeiro', prazo || '12 SET', situacao || 'Aberta'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar tarefa' });
      db.get('SELECT * FROM tarefas WHERE id = ?', [this.lastID], (err2, r) => {
        res.status(201).json({
          message: 'Tarefa criada com sucesso',
          tarefa: {
            id: String(r.id),
            titulo: r.titulo,
            responsavel: r.responsavel,
            prazo: r.prazo,
            situacao: r.situacao,
          },
        });
      });
    }
  );
});

app.put('/api/tarefas/:id', (req, res) => {
  const { titulo, responsavel, prazo, situacao } = req.body;
  const updates = [];
  const values = [];

  if (titulo != null) { updates.push('titulo = ?'); values.push(titulo); }
  if (responsavel != null) { updates.push('responsavel = ?'); values.push(responsavel); }
  if (prazo != null) { updates.push('prazo = ?'); values.push(prazo); }
  if (situacao != null) { updates.push('situacao = ?'); values.push(situacao); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.params.id);
  db.run(`UPDATE tarefas SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    db.get('SELECT * FROM tarefas WHERE id = ?', [req.params.id], (err2, r) => {
      if (!r) return res.status(404).json({ error: 'Tarefa não encontrada' });
      res.json({
        message: 'Tarefa atualizada',
        tarefa: {
          id: String(r.id),
          titulo: r.titulo,
          responsavel: r.responsavel,
          prazo: r.prazo,
          situacao: r.situacao,
        },
      });
    });
  });
});

app.delete('/api/tarefas/:id', (req, res) => {
  db.run('DELETE FROM tarefas WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir tarefa' });
    res.json({ message: 'Tarefa excluída com sucesso' });
  });
});

app.post('/api/tarefas/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs inválidos' });
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM tarefas WHERE id IN (${placeholders})`, ids, (err) => {
    if (err) return res.status(500).json({ error: 'Erro na exclusão em lote' });
    res.json({ message: `${ids.length} tarefa(s) excluída(s)` });
  });
});

// ---- Documentos ----
app.get('/api/documentos', (req, res) => {
  db.all('SELECT * FROM documentos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar documentos' });
    const documentos = (rows || []).map((r) => ({
      id: String(r.id),
      titulo: r.titulo,
      protocolo: r.protocolo || `2026-${String(r.id).padStart(4, '0')}`,
      tipo: r.tipo || 'PDF',
      situacao: r.situacao || 'Em análise',
      previsao: r.previsao || '15 SET',
    }));
    res.json({ documentos });
  });
});

app.post('/api/documentos', (req, res) => {
  const { titulo, tipo, situacao, previsao, protocolo, descricao } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

  const novoProtocolo = protocolo || `2026-${Math.floor(1000 + Math.random() * 9000)}`;
  db.run(
    'INSERT INTO documentos (titulo, descricao, protocolo, tipo, situacao, previsao) VALUES (?, ?, ?, ?, ?, ?)',
    [titulo.trim(), descricao || '', novoProtocolo, tipo || 'PDF', situacao || 'Em análise', previsao || '15 SET'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar documento' });
      db.get('SELECT * FROM documentos WHERE id = ?', [this.lastID], (err2, r) => {
        res.status(201).json({
          message: 'Documento criado com sucesso',
          documento: {
            id: String(r.id),
            titulo: r.titulo,
            protocolo: r.protocolo,
            tipo: r.tipo,
            situacao: r.situacao,
            previsao: r.previsao,
          },
        });
      });
    }
  );
});

app.put('/api/documentos/:id', (req, res) => {
  const { titulo, tipo, situacao, previsao } = req.body;
  const updates = [];
  const values = [];

  if (titulo != null) { updates.push('titulo = ?'); values.push(titulo); }
  if (tipo != null) { updates.push('tipo = ?'); values.push(tipo); }
  if (situacao != null) { updates.push('situacao = ?'); values.push(situacao); }
  if (previsao != null) { updates.push('previsao = ?'); values.push(previsao); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.params.id);
  db.run(`UPDATE documentos SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar documento' });
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], (err2, r) => {
      if (!r) return res.status(404).json({ error: 'Documento não encontrado' });
      res.json({
        message: 'Documento atualizado',
        documento: {
          id: String(r.id),
          titulo: r.titulo,
          protocolo: r.protocolo,
          tipo: r.tipo,
          situacao: r.situacao,
          previsao: r.previsao,
        },
      });
    });
  });
});

app.delete('/api/documentos/:id', (req, res) => {
  db.run('DELETE FROM documentos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir documento' });
    res.json({ message: 'Documento excluído com sucesso' });
  });
});

app.post('/api/documentos/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs inválidos' });
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM documentos WHERE id IN (${placeholders})`, ids, (err) => {
    if (err) return res.status(500).json({ error: 'Erro na exclusão em lote' });
    res.json({ message: `${ids.length} documento(s) excluído(s)` });
  });
});

// ---- Calendário ----
app.get('/api/calendario', (req, res) => {
  db.all('SELECT * FROM calendario ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar eventos' });
    const eventos = (rows || []).map((r) => ({
      id: String(r.id),
      titulo: r.titulo,
      subtitulo: r.subtitulo || '',
      categoria: r.categoria || 'evento',
      data: r.data || 'Hoje',
    }));
    res.json({ eventos });
  });
});

app.post('/api/calendario', (req, res) => {
  const { titulo, subtitulo, categoria, data } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

  db.run(
    'INSERT INTO calendario (titulo, subtitulo, categoria, data) VALUES (?, ?, ?, ?)',
    [titulo.trim(), subtitulo || '', categoria || 'evento', data || '15 OUT'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar evento' });
      db.get('SELECT * FROM calendario WHERE id = ?', [this.lastID], (err2, r) => {
        res.status(201).json({
          message: 'Evento criado com sucesso',
          evento: {
            id: String(r.id),
            titulo: r.titulo,
            subtitulo: r.subtitulo,
            categoria: r.categoria,
            data: r.data,
          },
        });
      });
    }
  );
});

app.put('/api/calendario/:id', (req, res) => {
  const { titulo, subtitulo, categoria, data } = req.body;
  const updates = [];
  const values = [];

  if (titulo != null) { updates.push('titulo = ?'); values.push(titulo); }
  if (subtitulo != null) { updates.push('subtitulo = ?'); values.push(subtitulo); }
  if (categoria != null) { updates.push('categoria = ?'); values.push(categoria); }
  if (data != null) { updates.push('data = ?'); values.push(data); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.params.id);
  db.run(`UPDATE calendario SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar evento' });
    db.get('SELECT * FROM calendario WHERE id = ?', [req.params.id], (err2, r) => {
      if (!r) return res.status(404).json({ error: 'Evento não encontrado' });
      res.json({
        message: 'Evento atualizado',
        evento: {
          id: String(r.id),
          titulo: r.titulo,
          subtitulo: r.subtitulo,
          categoria: r.categoria,
          data: r.data,
        },
      });
    });
  });
});

app.delete('/api/calendario/:id', (req, res) => {
  db.run('DELETE FROM calendario WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir evento' });
    res.json({ message: 'Evento excluído com sucesso' });
  });
});

app.post('/api/calendario/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs inválidos' });
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM calendario WHERE id IN (${placeholders})`, ids, (err) => {
    if (err) return res.status(500).json({ error: 'Erro na exclusão em lote' });
    res.json({ message: `${ids.length} evento(s) excluído(s)` });
  });
});

// ---- Pessoas ----
app.get('/api/pessoas', (req, res) => {
  db.all('SELECT * FROM pessoas ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar pessoas' });
    const pessoas = (rows || []).map((r) => ({
      id: String(r.id),
      nome: r.nome,
      vinculo: r.vinculo || 'Aluno',
      cursoOuSetor: r.cursoOuSetor || '',
      email: r.email || '',
    }));
    res.json({ pessoas });
  });
});

app.post('/api/pessoas', (req, res) => {
  const { nome, vinculo, cursoOuSetor, email } = req.body;
  if (!nome || !email) return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });

  db.run(
    'INSERT INTO pessoas (nome, vinculo, cursoOuSetor, email) VALUES (?, ?, ?, ?)',
    [nome.trim(), vinculo || 'Aluno', cursoOuSetor || '', email.toLowerCase().trim()],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar pessoa' });
      db.get('SELECT * FROM pessoas WHERE id = ?', [this.lastID], (err2, r) => {
        res.status(201).json({
          message: 'Pessoa adicionada com sucesso',
          pessoa: {
            id: String(r.id),
            nome: r.nome,
            vinculo: r.vinculo,
            cursoOuSetor: r.cursoOuSetor,
            email: r.email,
          },
        });
      });
    }
  );
});

app.put('/api/pessoas/:id', (req, res) => {
  const { nome, vinculo, cursoOuSetor, email } = req.body;
  const updates = [];
  const values = [];

  if (nome != null) { updates.push('nome = ?'); values.push(nome); }
  if (vinculo != null) { updates.push('vinculo = ?'); values.push(vinculo); }
  if (cursoOuSetor != null) { updates.push('cursoOuSetor = ?'); values.push(cursoOuSetor); }
  if (email != null) { updates.push('email = ?'); values.push(email); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.params.id);
  db.run(`UPDATE pessoas SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar pessoa' });
    db.get('SELECT * FROM pessoas WHERE id = ?', [req.params.id], (err2, r) => {
      if (!r) return res.status(404).json({ error: 'Pessoa não encontrada' });
      res.json({
        message: 'Pessoa atualizada',
        pessoa: {
          id: String(r.id),
          nome: r.nome,
          vinculo: r.vinculo,
          cursoOuSetor: r.cursoOuSetor,
          email: r.email,
        },
      });
    });
  });
});

app.delete('/api/pessoas/:id', (req, res) => {
  db.run('DELETE FROM pessoas WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir pessoa' });
    res.json({ message: 'Pessoa removida com sucesso' });
  });
});

app.post('/api/pessoas/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs inválidos' });
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM pessoas WHERE id IN (${placeholders})`, ids, (err) => {
    if (err) return res.status(500).json({ error: 'Erro na exclusão em lote' });
    res.json({ message: `${ids.length} pessoa(s) removida(s)` });
  });
});

// ---- Projetos ----
app.get('/api/projetos', (req, res) => {
  db.all('SELECT * FROM projetos ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar projetos' });
    const projetos = (rows || []).map((r) => ({
      id: String(r.id),
      titulo: r.titulo,
      autor: r.autor || r.autor_nome || 'Prof. Dr. Mauro Santos',
      eixo: r.eixo || r.categoria || 'Pesquisa',
      vagas: r.vagas || 0,
      situacao: r.situacao || 'Ativo',
    }));
    res.json({ projetos });
  });
});

app.post('/api/projetos', (req, res) => {
  const { titulo, autor, eixo, vagas, situacao, categoria, link } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

  const eixoFinal = eixo || categoria || 'Pesquisa';
  db.run(
    'INSERT INTO projetos (titulo, autor, eixo, categoria, vagas, situacao, link, autor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [titulo.trim(), autor || 'Ana Ribeiro', eixoFinal, eixoFinal, Number(vagas) || 0, situacao || 'Ativo', link || '', 3],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar projeto' });
      db.get('SELECT * FROM projetos WHERE id = ?', [this.lastID], (err2, r) => {
        res.status(201).json({
          message: 'Projeto criado com sucesso',
          projeto: {
            id: String(r.id),
            titulo: r.titulo,
            autor: r.autor,
            eixo: r.eixo,
            vagas: r.vagas,
            situacao: r.situacao,
          },
        });
      });
    }
  );
});

app.put('/api/projetos/:id', (req, res) => {
  const { titulo, autor, eixo, vagas, situacao } = req.body;
  const updates = [];
  const values = [];

  if (titulo != null) { updates.push('titulo = ?'); values.push(titulo); }
  if (autor != null) { updates.push('autor = ?'); values.push(autor); }
  if (eixo != null) { updates.push('eixo = ?'); updates.push('categoria = ?'); values.push(eixo); values.push(eixo); }
  if (vagas != null) { updates.push('vagas = ?'); values.push(Number(vagas)); }
  if (situacao != null) { updates.push('situacao = ?'); values.push(situacao); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.params.id);
  db.run(`UPDATE projetos SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar projeto' });
    db.get('SELECT * FROM projetos WHERE id = ?', [req.params.id], (err2, r) => {
      if (!r) return res.status(404).json({ error: 'Projeto não encontrado' });
      res.json({
        message: 'Projeto atualizado',
        projeto: {
          id: String(r.id),
          titulo: r.titulo,
          autor: r.autor,
          eixo: r.eixo,
          vagas: r.vagas,
          situacao: r.situacao,
        },
      });
    });
  });
});

app.delete('/api/projetos/:id', (req, res) => {
  db.run('DELETE FROM projetos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir projeto' });
    res.json({ message: 'Projeto excluído com sucesso' });
  });
});

app.post('/api/projetos/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs inválidos' });
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM projetos WHERE id IN (${placeholders})`, ids, (err) => {
    if (err) return res.status(500).json({ error: 'Erro na exclusão em lote' });
    res.json({ message: `${ids.length} projeto(s) excluído(s)` });
  });
});

// ---- Painel / Resumo Integrado ----
app.get('/api/painel/resumo', (req, res) => {
  const stats = {
    avisosNaoLidos: 0,
    tarefasEmAberto: 0,
    documentosEmAnalise: 0,
    contadores: {
      avisos: 0,
      tarefas: 0,
      documentos: 0,
      calendario: 0,
      pessoas: 0,
      projetos: 0,
    },
    proximasDatas: [],
    criadosRecentemente: [],
  };

  db.get("SELECT COUNT(*) as count FROM avisos WHERE situacao != 'Arquivado'", (err, r) => {
    stats.avisosNaoLidos = (r && r.count) || 2;
    db.get("SELECT COUNT(*) as count FROM tarefas WHERE situacao = 'Aberta' OR situacao = 'Em andamento'", (err2, r2) => {
      stats.tarefasEmAberto = (r2 && r2.count) || 3;
      db.get("SELECT COUNT(*) as count FROM documentos WHERE situacao = 'Em análise' OR situacao = 'Pendente'", (err3, r3) => {
        stats.documentosEmAnalise = (r3 && r3.count) || 2;
        db.all('SELECT COUNT(*) as c FROM avisos UNION ALL SELECT COUNT(*) FROM tarefas UNION ALL SELECT COUNT(*) FROM documentos UNION ALL SELECT COUNT(*) FROM calendario UNION ALL SELECT COUNT(*) FROM pessoas UNION ALL SELECT COUNT(*) FROM projetos', (errCounts, rows) => {
          if (rows && rows.length >= 6) {
            stats.contadores.avisos = rows[0].c;
            stats.contadores.tarefas = rows[1].c;
            stats.contadores.documentos = rows[2].c;
            stats.contadores.calendario = rows[3].c;
            stats.contadores.pessoas = rows[4].c;
            stats.contadores.projetos = rows[5].c;
          }
          res.json(stats);
        });
      });
    });
  });
});

// ---- Feed do Início (Legado compatível) ----
app.get('/api/inicio', (req, res) => {
  db.all('SELECT * FROM avisos ORDER BY id DESC LIMIT 5', [], (err, avisosRecentes) => {
    db.all('SELECT * FROM projetos ORDER BY id DESC LIMIT 4', [], (err2, projetosRecentes) => {
      res.json({
        usuario: { nome: 'Ana Ribeiro', vinculo: 'Aluno' },
        projetos: projetosRecentes || [],
        feed: avisosRecentes || [],
      });
    });
  });
});

// ---- Lembretes (RF08) ----
app.get('/api/lembretes', (req, res) => {
  db.all('SELECT * FROM lembretes ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar lembretes' });
    const formatado = (rows || []).map((l) => ({
      id: String(l.id),
      eventoId: l.evento_id,
      titulo: l.titulo,
      data: l.data,
      horario: l.horario,
      ativo: Boolean(l.ativo),
      tipo: l.tipo,
      descricao: l.descricao,
    }));
    res.json({ lembretes: formatado });
  });
});

app.post('/api/lembretes', (req, res) => {
  const { eventoId, titulo, data, horario, ativo, tipo, descricao } = req.body;
  if (!titulo || !data) return res.status(400).json({ error: 'Título e data são obrigatórios' });
  db.run(
    'INSERT INTO lembretes (evento_id, titulo, data, horario, ativo, tipo, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [eventoId || null, titulo.trim(), data.trim(), horario || '08:00', ativo !== false ? 1 : 0, tipo || 'prazo', descricao || ''],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao salvar lembrete' });
      res.status(201).json({
        message: 'Lembrete criado com sucesso',
        lembrete: {
          id: String(this.lastID),
          eventoId,
          titulo,
          data,
          horario,
          ativo: ativo !== false,
          tipo,
          descricao,
        },
      });
    }
  );
});

app.put('/api/lembretes/:id', (req, res) => {
  const { id } = req.params;
  const { ativo, titulo, data, horario, descricao } = req.body;
  const updates = [];
  const vals = [];
  if (ativo !== undefined) { updates.push('ativo = ?'); vals.push(ativo ? 1 : 0); }
  if (titulo !== undefined) { updates.push('titulo = ?'); vals.push(titulo); }
  if (data !== undefined) { updates.push('data = ?'); vals.push(data); }
  if (horario !== undefined) { updates.push('horario = ?'); vals.push(horario); }
  if (descricao !== undefined) { updates.push('descricao = ?'); vals.push(descricao); }
  if (updates.length === 0) return res.json({ message: 'Nada a atualizar' });
  vals.push(id);
  db.run(`UPDATE lembretes SET ${updates.join(', ')} WHERE id = ?`, vals, function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar lembrete' });
    res.json({ message: 'Lembrete atualizado' });
  });
});

app.delete('/api/lembretes/:id', (req, res) => {
  db.run('DELETE FROM lembretes WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir lembrete' });
    res.json({ message: 'Lembrete excluído' });
  });
});

// ---- Links Úteis (RF09) ----
app.get('/api/links-uteis', (req, res) => {
  db.all('SELECT * FROM links_uteis ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar links úteis' });
    const formatado = (rows || []).map((l) => ({
      id: String(l.id),
      titulo: l.titulo,
      url: l.url,
      descricao: l.descricao,
      categoria: l.categoria,
    }));
    res.json({ linksUteis: formatado });
  });
});

app.post('/api/links-uteis', (req, res) => {
  const { titulo, url, descricao, categoria } = req.body;
  if (!titulo || !url) return res.status(400).json({ error: 'Título e URL são obrigatórios' });
  db.run(
    'INSERT INTO links_uteis (titulo, url, descricao, categoria) VALUES (?, ?, ?, ?)',
    [titulo.trim(), url.trim(), descricao || '', categoria || 'Institucional'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao salvar link útil' });
      res.status(201).json({
        message: 'Link útil cadastrado',
        linkUtil: { id: String(this.lastID), titulo, url, descricao, categoria },
      });
    }
  );
});

app.delete('/api/links-uteis/:id', (req, res) => {
  db.run('DELETE FROM links_uteis WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir link útil' });
    res.json({ message: 'Link útil removido' });
  });
});

// ---- Inicialização do Servidor ----
app.listen(PORT, () => {
  console.log('Arcádia Back-end rodando em http://localhost:' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/health');
});
