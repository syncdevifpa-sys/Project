/* Mantém a proteção crítica no próprio HTML, antes de qualquer arquivo externo. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'frontend/js/page-ready.js'), 'utf8');
const css = loader.match(/style\.textContent = `([\s\S]*?)`;/)?.[1];
if (!css) throw Error('Estilo crítico do carregamento não encontrado.');
const block = '<!-- arcadia-loader:start -->\n<style id="arcadia-critical-loader">' + css + '</style>\n<script>document.documentElement.setAttribute("data-page-loading","true");</script>\n<!-- arcadia-loader:end -->\n';
let count = 0;
for (const name of fs.readdirSync(path.join(root, 'frontend')).filter(name => name.endsWith('.html'))) {
 const file = path.join(root, 'frontend', name);
 let html = fs.readFileSync(file, 'utf8');
 if (!html.includes('js/page-ready.js')) continue;
 html = html.replace(/<!-- arcadia-loader:start -->[\s\S]*?<!-- arcadia-loader:end -->\s*/g, '');
 const charset = html.match(/<meta\s+charset=[^>]+>/i)?.[0] || '<meta charset="UTF-8" />';
 html = html.replace(/<meta\s+charset=[^>]+>\s*/i, '');
 html = html.replace(/(<head[^>]*>)\s*/i, (_, head) => head + '\n    ' + charset + '\n' + block);
 fs.writeFileSync(file, html);
 count++;
}
console.log('Proteção crítica sincronizada em ' + count + ' páginas.');
