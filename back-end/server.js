const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Criar tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    vinculo TEXT DEFAULT 'Aluno',
    matricula TEXT,
    curso TEXT,
    preferences TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS projetos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    link TEXT,
    autor_id INTEGER NOT NULL,
    autor_nome TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS avisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    data TEXT,
    autor_id INTEGER,
    autor_nome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    autor_id INTEGER,
    autor_nome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Helpers de token
function gerarToken() {
  return 'tok_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getUsuarioFromToken(req, callback) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return callback(null);

  db.get('SELECT t.usuario_id FROM tokens t WHERE t.token = ?', [token], (err, row) => {
    if (err || !row) return callback(null);
    db.get('SELECT * FROM usuarios WHERE id = ?', [row.usuario_id], (err2, usuario) => {
      if (err2 || !usuario) return callback(null);
      callback(usuario);
    });
  });
}

function requireAuth(req, res, next) {
  getUsuarioFromToken(req, (usuario) => {
    if (!usuario) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    req.user = usuario;
    next();
  });
}

// ---- Rotas de saúde ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Login ----
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
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }
    const token = gerarToken();
    db.run('INSERT INTO tokens (token, usuario_id) VALUES (?, ?)', [token, usuario.id], (err) => {
      if (err) {
        console.error('Erro ao criar token:', err.message);
        return res.status(500).json({ error: 'Erro ao criar sessão' });
      }
      res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          vinculo: usuario.vinculo,
          matricula: usuario.matricula,
          curso: usuario.curso,
          preferences: JSON.parse(usuario.preferences || '{}'),
        },
      });
    });
  });
});

// ---- Cadastro ----
app.post('/api/auth/cadastro', (req, res) => {
  const { nome, email, senha, vinculo } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ error: 'A senha precisa ter no mínimo 8 caracteres' });
  }
  db.run('INSERT INTO usuarios (nome, email, senha, vinculo) VALUES (?, ?, ?, ?)',
    [nome.trim(), email.toLowerCase().trim(), senha, vinculo || 'Aluno'],
    function(err) {
      if (err && err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      if (err) {
        console.error('Erro no cadastro:', err.message);
        return res.status(500).json({ error: 'Erro interno' });
      }
      const userId = this.lastID;
      db.get('SELECT * FROM usuarios WHERE id = ?', [userId], (err2, usuario) => {
        if (err2 || !usuario) {
          return res.status(500).json({ error: 'Erro ao recuperar usuário' });
        }
        res.status(201).json({
          message: 'Conta criada',
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            vinculo: usuario.vinculo,
            matricula: usuario.matricula,
            curso: usuario.curso,
            preferences: JSON.parse(usuario.preferences || '{}'),
          },
        });
      });
    });
});

// ---- Perfil ----
app.get('/api/auth/perfil', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    nome: req.user.nome,
    email: req.user.email,
    vinculo: req.user.vinculo,
    matricula: req.user.matricula,
    curso: req.user.curso,
    preferences: JSON.parse(req.user.preferences || '{}'),
  });
});

app.put('/api/auth/perfil', requireAuth, (req, res) => {
  const { nome, preferences } = req.body;
  const updates = [];
  const values = [];

  if (nome && typeof nome === 'string') {
    updates.push('nome = ?');
    values.push(nome.trim());
  }
  if (preferences && typeof preferences === 'object') {
    updates.push('preferences = ?');
    values.push(JSON.stringify(preferences));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nada para atualizar' });
  }

  values.push(req.user.id);
  db.run(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('Erro ao atualizar perfil:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    db.get('SELECT * FROM usuarios WHERE id = ?', [req.user.id], (err2, usuario) => {
      if (err2 || !usuario) {
        return res.status(500).json({ error: 'Erro ao recuperar perfil' });
      }
      res.json({
        message: 'Perfil atualizado',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          vinculo: usuario.vinculo,
          matricula: usuario.matricula,
          curso: usuario.curso,
          preferences: JSON.parse(usuario.preferences || '{}'),
        },
      });
    });
  });
});

// ---- Logout ----
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (token) {
    db.run('DELETE FROM tokens WHERE token = ?', [token], (err) => {
      if (err) console.error('Erro no logout:', err.message);
    });
  }
  res.json({ message: 'Sessão encerrada' });
});

// ---- Avisos ----
app.get('/api/avisos', (req, res) => {
  db.all('SELECT * FROM avisos ORDER BY created_at DESC', [], (err, avisos) => {
    if (err) {
      console.error('Erro ao buscar avisos:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    res.json({ avisos });
  });
});

app.post('/api/avisos', requireAuth, (req, res) => {
  const { titulo, conteudo, data } = req.body;
  if (!titulo || !conteudo) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
  }
  db.run('INSERT INTO avisos (titulo, conteudo, data, autor_id, autor_nome) VALUES (?, ?, ?, ?, ?)',
    [titulo.trim(), conteudo.trim(), data || new Date().toISOString().split('T')[0], req.user.id, req.user.nome],
    function(err) {
      if (err) {
        console.error('Erro ao criar aviso:', err.message);
        return res.status(500).json({ error: 'Erro interno' });
      }
      db.get('SELECT * FROM avisos WHERE id = ?', [this.lastID], (err2, aviso) => {
        if (err2) return res.status(500).json({ error: 'Erro interno' });
        res.status(201).json({ message: 'Aviso criado', aviso });
      });
    });
});

// ---- Documentos ----
app.get('/api/documentos', (req, res) => {
  db.all('SELECT * FROM documentos ORDER BY created_at DESC', [], (err, documentos) => {
    if (err) {
      console.error('Erro ao buscar documentos:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    res.json({ documentos });
  });
});

app.post('/api/documentos', requireAuth, (req, res) => {
  const { titulo, descricao } = req.body;
  if (!titulo) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }
  db.run('INSERT INTO documentos (titulo, descricao, autor_id, autor_nome) VALUES (?, ?, ?, ?)',
    [titulo.trim(), descricao || '', req.user.id, req.user.nome],
    function(err) {
      if (err) {
        console.error('Erro ao criar documento:', err.message);
        return res.status(500).json({ error: 'Erro interno' });
      }
      db.get('SELECT * FROM documentos WHERE id = ?', [this.lastID], (err2, documento) => {
        if (err2) return res.status(500).json({ error: 'Erro interno' });
        res.status(201).json({ message: 'Documento criado', documento });
      });
    });
});

// ---- Projetos ----
app.get('/api/projetos', (req, res) => {
  db.all('SELECT * FROM projetos ORDER BY created_at DESC', [], (err, projetos) => {
    if (err) {
      console.error('Erro ao buscar projetos:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    res.json({ projetos });
  });
});

app.post('/api/projetos', requireAuth, (req, res) => {
  const { titulo, categoria, link } = req.body;
  if (!titulo || !categoria) {
    return res.status(400).json({ error: 'Título e categoria são obrigatórios' });
  }
  db.run('INSERT INTO projetos (titulo, categoria, link, autor_id, autor_nome) VALUES (?, ?, ?, ?, ?)',
    [titulo.trim(), categoria.trim(), link || '', req.user.id, req.user.nome],
    function(err) {
      if (err) {
        console.error('Erro ao criar projeto:', err.message);
        return res.status(500).json({ error: 'Erro interno' });
      }
      db.get('SELECT * FROM projetos WHERE id = ?', [this.lastID], (err2, projeto) => {
        if (err2) return res.status(500).json({ error: 'Erro interno' });
        res.status(201).json({ message: 'Projeto criado', projeto });
      });
    });
});

// ---- Feed do início ----
app.get('/api/inicio', requireAuth, (req, res) => {
  db.all('SELECT * FROM projetos WHERE autor_id = ? ORDER BY created_at DESC', [req.user.id], (err, projetosDoUsuario) => {
    if (err) {
      console.error('Erro ao buscar projetos:', err.message);
      return res.status(500).json({ error: 'Erro interno' });
    }
    db.all('SELECT * FROM avisos ORDER BY created_at DESC LIMIT 5', [], (err2, avisosRecentes) => {
      if (err2) {
        console.error('Erro ao buscar avisos:', err.message);
      }
      res.json({
        usuario: {
          nome: req.user.nome,
          vinculo: req.user.vinculo,
        },
        projetos: projetosDoUsuario || [],
        feed: avisosRecentes || [],
      });
    });
  });
});

// ---- Inicialização ----
app.listen(PORT, () => {
  console.log('SyncDev Backend rodando em http://localhost:' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/health');
});
