// Prévia local: dados fictícios em memória; não grava em banco ou envia mensagens.
const express = require('../node_modules/express');
const fs = require('fs'), path = require('path');
const db = require('../backend/src/config/database');
const sharing = require('../backend/src/services/profile-sharing.service');
const photo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../front/public/arcadia-logo-64.png')).toString('base64');
const user = { id_usuario: 4, nome: 'Pessoa de demonstração', tipo_usuario: 'servidor', is_admin: true, logado: true, email: 'demo@example.test', foto: photo };
const external = { id_externo: 4, nome: 'Visitante de demonstração', tipo_usuario: 'externo', logado: true, email: 'visitante@example.test' };
const preferences = { users: { ...sharing.defaults(), disponivel: true }, external: { ...sharing.defaults(), disponivel: true, foto: photo } };
db.execute = async () => [[user]];
db.getConnection = async () => { throw Error('Prévia somente leitura'); };
process.env.JWT_SECRET = 'read-only-preview-key';
const app = express();
app.post('/api/calendar-import/preview', express.raw({ type: 'application/pdf', limit: '4mb' }), async (req, res) => {
    try { res.json(await require('../backend/src/services/calendar-import.service').preview(req.body, req.query, 4)); }
    catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});
app.use(express.json({ limit: '2mb' }));
for (const [kind, prefix] of [['users', 'auth'], ['external', 'external']]) {
    app.get('/api/' + prefix + '/compartilhamento', (_req, res) => res.json(preferences[kind]));
    app.put('/api/' + prefix + '/compartilhamento', (req, res) => {
        try { Object.assign(preferences[kind], sharing.normalize(req.body, kind === 'external')); res.json(preferences[kind]); }
        catch (error) { res.status(error.status || 500).json({ error: error.message }); }
    });
}
app.get('/api/auth/perfil', (_req, res) => res.json(user));
app.get('/api/external/me', (_req, res) => res.json(external));
app.get('/api/users', (_req, res) => res.json([
    sharing.publicPerson(user, preferences.users),
    sharing.publicPerson({ id_usuario: 8, nome: 'Ana da Comunidade', tipo_usuario: 'docente', sobre: 'Projetos e atividades acadêmicas.', foto: photo }, { contato_email: 'contato@example.test', contato_handle: '@ana (rede de exemplo)', contato_telefone: '+5591999999999', mostrar_email: 1, mostrar_handle: 1, mostrar_telefone: 1, mostrar_foto: 1 })
]));
app.get('/api/public', (_req, res) => res.json({ notices: [{ titulo: 'Notícias da comunidade', resumo: 'Acompanhe as publicações e os próximos encontros do campus.' }], projects: [{ titulo: 'Projetos do campus', descricao: 'Conheça as iniciativas compartilhadas pela comunidade acadêmica.' }] }));
app.get('/api/read-notices/unread/count', (_req, res) => res.json({ unread: 1 }));
app.get('/api/notices', (_req, res) => res.json([{ id_aviso: 7, id_usuario: 4, titulo: 'Informações sobre inscrições, atividades e encontros da comunidade acadêmica do campus', resumo: 'Confira os detalhes das atividades, os documentos necessários e as orientações de participação. Referência: identificador_de_publicacao_extenso_sem_espacos_para_conferir_quebra_de_linha.', descricao: 'Conteúdo com link https://example.test', tipo_publicacao: 'noticia', categoria: 'evento', publico_alvo: 'todos', situacao: 'publicado', data_publicacao: '2026-10-15' }]));
app.get('/api/calendar', (_req, res) => res.json([{ id_evento: 1, id_usuario: 4, titulo: 'Evento de demonstração', data_evento: '2026-10-20', categoria: 'evento', descricao: 'Mais informações em https://example.test' }]));
app.get(/^\/api\//, (_req, res) => res.json([]));
app.use('/api', (_req, res) => res.status(405).json({ error: 'Prévia sem gravação' }));
app.get('/:file.html', (req, res, next) => {
    const file = path.join(__dirname, '../front', path.basename(req.params.file) + '.html'); if (!fs.existsSync(file)) return next();
    const person = req.params.file === 'community' ? external : user;
    const sessionScript = req.query.visitor === '1' ? "localStorage.removeItem('arcadiaToken');localStorage.removeItem('arcadiaSessao');" : "localStorage.setItem('arcadiaToken','preview');localStorage.setItem('arcadiaSessao'," + JSON.stringify(JSON.stringify(person)) + ');';
    res.type('html').send(fs.readFileSync(file, 'utf8').replace('<head>', '<head><script>window.ARCADIA_API_BASE=location.origin;' + sessionScript + "localStorage.setItem('arcadia-theme'," + JSON.stringify(req.query.theme === 'light' ? 'light' : 'dark') + ');</script>'));
});
app.use(express.static(path.join(__dirname, '../front')));
app.listen(61119, '127.0.0.1', () => console.log('Prévia local com dados fictícios em memória: 61119'));
