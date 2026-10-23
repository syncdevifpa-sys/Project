const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const redirects = require('../page-redirects.json');
const vercel = require('../vercel.json');
const expected = Object.entries(redirects).map(([oldPage, newPage]) => ({
    source: '/' + oldPage,
    destination: '/' + newPage,
    permanent: true
}));
if (JSON.stringify(vercel.redirects) !== JSON.stringify(expected)) {
    throw new Error('Redirects da Vercel divergem de page-redirects.json.');
}
for (const [oldPage, newPage] of Object.entries(redirects)) {
    if (
        fs.existsSync(path.join(root, 'front', oldPage)) ||
        !fs.existsSync(path.join(root, 'front', newPage))
    ) {
        throw new Error('Página antiga duplicada ou nova página ausente: ' + newPage);
    }
}
const target = path.resolve(root, 'public');
// Somente o diretório gerado nesta raiz pode ser removido; nunca siga atalhos.
if (path.dirname(target) !== root || path.basename(target) !== 'public') {
    throw new Error('Diretório de saída inválido.');
}
if (fs.existsSync(target)) {
    if (
        fs.lstatSync(target).isSymbolicLink() ||
        !fs.existsSync(path.join(target, '.arcadia-generated'))
    ) {
        throw new Error(
            'public/ já existe e não pertence ao build. Preserve seu conteúdo antes de continuar.'
        );
    }
    fs.rmSync(target, { recursive: true });
}
const localPreviews = new Set([
    'typed',
    'classes-preview.html',
    'classes-preview.css',
    'classes-preview.js'
]);
fs.cpSync(path.join(root, 'front'), target, {
    recursive: true,
    filter: (source) => !localPreviews.has(path.basename(source))
});
fs.writeFileSync(path.join(target, '.arcadia-generated'), 'Gerado por tools/build-static.js\n');
console.log('Frontend copiado para public/; API entregue pelo adaptador Express.');
