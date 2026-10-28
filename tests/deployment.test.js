const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

test('pacote da Vercel inclui o manifesto usado em runtime e exclui SQL administrativo', () => {
    const root = path.resolve(__dirname, '..');
    const result = spawnSync(
        'git',
        ['ls-files', '--cached', '--ignored', '--exclude-from=.vercelignore'],
        {
            cwd: root,
            encoding: 'utf8'
        }
    );
    assert.equal(result.status, 0, result.stderr);
    const excluded = new Set(result.stdout.trim().split(/\r?\n/));
    assert.equal(excluded.has('backend/db/migrations/1.1.31.json'), false);
    assert.equal(excluded.has('backend/db/migrations/1.1.31.sql'), true);
    assert.equal(excluded.has('backend/db/checks/1.1.31.sql'), true);
    assert.equal(
        excluded.has('backend/db/workbench/1.1.31/resume-generated-expression-r1.sql'),
        true
    );
    assert.ok(fs.existsSync(path.join(root, 'backend/db/migrations/1.1.31.json')));
});

test('entrada da Vercel carrega sem .env e registra o pool MySQL compatível', () => {
    const result = spawnSync(
        process.execPath,
        [
            '-e',
            `
        process.env.VERCEL = '1';
        const fs = require('node:fs');
        const originalMkdir = fs.mkdirSync;
        fs.mkdirSync = function(directory, ...args) {
            if (String(directory).replace(/\\\\/g, '/').endsWith('/uploads'))
                throw Object.assign(new Error('Read-only deployment directory'), { code: 'EROFS' });
            return originalMkdir.call(this, directory, ...args);
        };
        const app = require('./server');
        const db = require('./backend/src/config/database');
        if (typeof app !== 'function' || db.pool.listenerCount('release') < 1) process.exitCode = 1;
        db.end();
    `
        ],
        { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
});

test('API usa HTTPS do deploy, preserva Live Server e permite endereço explícito', () => {
    const source = fs.readFileSync(path.join(__dirname, '../front/js/api.js'), 'utf8');
    for (const [location, override, expected] of [
        [
            { hostname: 'portal.vercel.app', port: '', origin: 'https://portal.vercel.app' },
            null,
            'https://portal.vercel.app'
        ],
        [
            { hostname: 'localhost', port: '5500', origin: 'http://localhost:5500' },
            null,
            'http://localhost:3001'
        ],
        [
            { hostname: '127.0.0.1', port: '3001', origin: 'http://127.0.0.1:3001' },
            null,
            'http://127.0.0.1:3001'
        ],
        [
            { hostname: 'portal.vercel.app', port: '', origin: 'https://portal.vercel.app' },
            'https://api.example.test/',
            'https://api.example.test'
        ]
    ]) {
        const window = { ARCADIA_API_BASE: override };
        vm.runInNewContext(source, { window, location });
        assert.equal(window.Arcadia.api.BASE, expected);
    }
});

test('referências ativas entre pastas usam nomes atuais e assets locais existem', () => {
    const root = path.resolve(__dirname, '..');
    const front = path.join(root, 'front');
    const oldPages = Object.keys(require('../page-redirects.json'));
    function walk(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const file = path.join(dir, entry.name);
            return entry.isDirectory() ? walk(file) : [file];
        });
    }
    const sourceFiles = ['front', 'backend/src', 'tools', '.vscode']
        .flatMap((dir) => walk(path.join(root, dir)))
        .filter((file) => /\.(?:html|js|css|json|sql)$/.test(file));
    sourceFiles.push(path.join(root, '.gitignore'), path.join(root, '.vercelignore'));
    for (const file of sourceFiles) {
        const text = fs.readFileSync(file, 'utf8');
        for (const oldPage of oldPages) assert.ok(!text.includes(oldPage), file + ': ' + oldPage);
        assert.ok(!text.includes('ilustracoes/'), file);
    }
    for (const file of walk(front).filter((file) => /\.(?:html|css)$/.test(file))) {
        const text = fs.readFileSync(file, 'utf8');
        const refs = file.endsWith('.html')
            ? [
                  ...text.matchAll(
                      /(?:src|href)=["']([^"']+\.(?:css|js|png|svg|woff2?)(?:[?#][^"']*)?)["']/g
                  )
              ].map((match) => match[1])
            : [...text.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)].map((match) => match[1]);
        for (const ref of refs) {
            if (/^(?:https?:|data:|\/\/|#)/.test(ref)) continue;
            const clean = ref.split(/[?#]/)[0];
            const target = clean.startsWith('/')
                ? path.join(front, clean.slice(1))
                : path.resolve(path.dirname(file), clean);
            assert.ok(fs.existsSync(target), file + ': ' + ref);
        }
    }
});
