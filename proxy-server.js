const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FRONT_DIR = path.resolve(__dirname, 'front');
const PORTAL_DIR = path.resolve(__dirname, 'portal', 'dist');
const BACK_END_PORT = process.env.BACK_END_PORT || 3002;

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
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'proxy' }));
    return;
  }

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

  // Servir Portal React (Vite SPA) se acessado via /portal ou assets do portal
  if (req.url === '/portal') {
    res.writeHead(302, { Location: '/portal/' });
    res.end();
    return;
  }

  if (req.url.startsWith('/portal/') || req.url.startsWith('/assets/')) {
    let portalFile;
    if (req.url.startsWith('/assets/')) {
      portalFile = path.join(PORTAL_DIR, req.url);
    } else if (req.url.startsWith('/portal/assets/')) {
      const assetSub = req.url.replace('/portal/assets/', 'assets/');
      portalFile = path.join(PORTAL_DIR, assetSub);
    } else {
      const subPath = req.url.replace(/^\/portal\/?/, '');
      portalFile = path.join(PORTAL_DIR, subPath);
      if (!subPath || !fs.existsSync(portalFile) || fs.statSync(portalFile).isDirectory()) {
        portalFile = path.join(PORTAL_DIR, 'index.html');
      }
    }

    const ext = path.extname(portalFile).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(portalFile, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Portal não compilado. Execute npm run build na pasta portal.</h1>');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
    return;
  }

  // Servir arquivos estáticos do front
  let requestPath = req.url.split('?')[0];
  if (requestPath === '/login') requestPath = '/login.html';
  if (requestPath === '/cadastro') requestPath = '/cadastro.html';

  let filePath = path.join(FRONT_DIR, requestPath === '/' ? 'index.html' : requestPath);
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

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
