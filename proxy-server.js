const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FRONT_DIR = path.resolve(__dirname, 'front');
const BACK_END_PORT = 3001;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  // Encaminhar requisções de API para o back-end local
  if (req.url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: BACK_END_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Erro no proxy para API:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Serviço de back-end indisponível' }));
    });

    req.pipe(proxyReq);
    return;
  }

  // Servir arquivos estáticos do front
  let filePath = path.join(FRONT_DIR, req.url === '/' ? 'index.html' : req.url);

  // Evitar escapes de caminho
  if (!filePath.startsWith(FRONT_DIR)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - Página não encontrada</h1>');
      } else {
        res.writeHead(500);
        res.end('Erro interno');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('Proxy front-end rodando em http://localhost:' + PORT);
  console.log('Front estáticos: ' + FRONT_DIR);
  console.log('API proxy: http://localhost:' + BACK_END_PORT);
});
