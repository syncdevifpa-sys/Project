// Prévia local: dados fictícios; calendário e publicações somente em memória, sem banco ou mensagens.
const express = require('../node_modules/express');
const fs = require('fs'),
    path = require('path');
const db = require('../backend/src/config/database');
const sharing = require('../backend/src/services/profile-sharing.service');
const photo =
    'data:image/png;base64,' +
    fs.readFileSync(path.join(__dirname, '../front/public/arcadia-logo-64.png')).toString('base64');
const demoPublishedAt = new Date().toISOString();
const user = {
    id_usuario: 4,
    nome: 'Pessoa de demonstração',
    tipo_usuario: 'servidor',
    is_admin: true,
    logado: true,
    email: 'demo@example.test',
    foto: photo
};
const external = {
    id_externo: 4,
    nome: 'Visitante de demonstração',
    tipo_usuario: 'externo',
    logado: true,
    email: 'visitante@example.test'
};
const preferences = {
    users: { ...sharing.defaults(), disponivel: true },
    external: { ...sharing.defaults(), disponivel: true, foto: photo }
};
db.execute = async () => [[user]];
db.getConnection = async () => {
    throw Error('Prévia somente leitura');
};
process.env.JWT_SECRET = 'read-only-preview-key';
const app = express();
app.post(
    '/api/calendar-import/preview',
    express.raw({ type: 'application/pdf', limit: '4mb' }),
    async (req, res) => {
        try {
            res.json(
                await require('../backend/src/services/calendar-import.service').preview(
                    req.body,
                    req.query,
                    4
                )
            );
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);
app.use(express.json({ limit: '2mb' }));
for (const [kind, prefix] of [
    ['users', 'auth'],
    ['external', 'external']
]) {
    app.get('/api/' + prefix + '/compartilhamento', (_req, res) => res.json(preferences[kind]));
    app.put('/api/' + prefix + '/compartilhamento', (req, res) => {
        try {
            Object.assign(preferences[kind], sharing.normalize(req.body, kind === 'external'));
            res.json(preferences[kind]);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    });
}
app.get('/api/auth/perfil', (_req, res) => res.json(user));
app.get('/api/external/me', (_req, res) => res.json(external));
app.get('/api/users', (_req, res) =>
    res.json([
        sharing.publicPerson(user, preferences.users),
        sharing.publicPerson(
            {
                id_usuario: 8,
                nome: 'Ana da Comunidade',
                tipo_usuario: 'docente',
                sobre: 'Projetos e atividades acadêmicas.',
                foto: photo
            },
            {
                contato_email: 'contato@example.test',
                contato_handle: '@ana (rede de exemplo)',
                contato_telefone: '+5591999999999',
                mostrar_email: 1,
                mostrar_handle: 1,
                mostrar_telefone: 1,
                mostrar_foto: 1
            }
        )
    ])
);
app.get('/api/public', (_req, res) =>
    res.json({
        notices: [
            {
                titulo: 'Notícias da comunidade',
                resumo: 'Acompanhe as publicações e os próximos encontros do campus.'
            }
        ],
        projects: [
            {
                titulo: 'Projetos do campus',
                descricao: 'Conheça as iniciativas compartilhadas pela comunidade acadêmica.'
            }
        ]
    })
);
app.get('/api/read-notices/unread/count', (_req, res) => res.json({ unread: 1 }));
const noticeDemoRows = [
    {
        id_aviso: 7,
        capa:
            'data:image/png;base64,' +
            fs
                .readFileSync(path.join(__dirname, '../front/assets/print-calendar.png'))
                .toString('base64'),
        id_usuario: 4,
        titulo: 'Informações sobre inscrições, atividades e encontros da comunidade acadêmica do campus',
        resumo: 'Confira os detalhes das atividades, os documentos necessários e as orientações de participação. Referência: identificador_de_publicacao_extenso_sem_espacos_para_conferir_quebra_de_linha.',
        descricao: 'Conteúdo com link https://example.test',
        tipo_publicacao: 'noticia',
        categoria: 'evento',
        publico_alvo: 'todos',
        situacao: 'publicado',
        data_publicacao: demoPublishedAt
    }
];
app.get('/api/notices', (_req, res) => res.json(noticeDemoRows));
app.get('/api/notices/:id', (req, res) => {
    const notice = noticeDemoRows.find((row) => String(row.id_aviso) === req.params.id);
    return notice
        ? res.json(notice)
        : res.status(404).json({ error: 'Publicação não encontrada na demonstração.' });
});
app.post('/api/notices', (req, res) => {
    try {
        const values = require('../backend/src/services/notice-edit.service').validateNotice(
            req.body,
            true
        );
        const notice = {
            id_aviso: Math.max(0, ...noticeDemoRows.map((row) => row.id_aviso)) + 1,
            id_usuario: user.id_usuario,
            tipo_publicacao: 'aviso',
            publico_alvo: 'todos',
            categoria: 'evento',
            situacao: 'publicado',
            ...values,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };
        notice.data_publicacao = notice.situacao === 'publicado' ? notice.criado_em : null;
        noticeDemoRows.push(notice);
        res.status(201).json({
            noticeId: notice.id_aviso,
            message: 'Publicação de demonstração criada somente na memória.'
        });
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Não foi possível criar a demonstração.'
        });
    }
});
app.put('/api/notices/:id', (req, res) => {
    const notice = noticeDemoRows.find((row) => String(row.id_aviso) === req.params.id);
    if (!notice)
        return res.status(404).json({ error: 'Publicação não encontrada na demonstração.' });
    try {
        const values = require('../backend/src/services/notice-edit.service').validateNotice(
            req.body
        );
        const publishNow =
            values.situacao === 'publicado' &&
            (notice.situacao === 'rascunho' || !notice.data_publicacao);
        Object.assign(notice, values, { atualizado_em: new Date().toISOString() });
        if (publishNow) notice.data_publicacao = notice.atualizado_em;
        res.json({
            affectedRows: 1,
            message: 'Publicação de demonstração atualizada somente na memória.'
        });
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Não foi possível salvar a demonstração.'
        });
    }
});
const calendarDemoEvents = [
    {
        id_evento: 1,
        id_usuario: 4,
        titulo: 'Evento de demonstração',
        data_evento: '2026-10-20',
        categoria: 'evento',
        descricao: 'Mais informações em https://example.test'
    },
    {
        id_evento: 2,
        id_usuario: 4,
        titulo: 'Férias acadêmicas — demonstração',
        data_evento: '2026-10-18',
        data_fim: '2026-11-02',
        periodo_letivo: 'Belém · 2026 · Educação básica',
        categoria: 'ferias',
        descricao: 'Período fictício para conferir a visualização mensal; não consta do PDF.'
    },
    {
        id_evento: 3,
        id_usuario: 4,
        titulo: 'Encontro da comunidade — demonstração',
        data_evento: '2026-12-01',
        periodo_letivo: 'Belém · 2026 · Educação básica',
        categoria: 'evento',
        descricao: 'Evento fictício em outro mês, para conferir a seleção do calendário inteiro.'
    },
    {
        id_evento: 4,
        id_usuario: 4,
        titulo: 'Atividade de outro calendário — demonstração',
        data_evento: '2027-01-10',
        periodo_letivo: 'Belém · 2027 · Graduação',
        categoria: 'evento',
        descricao:
            'Dado fictício de outro calendário, que não deve ser incluído na seleção da Educação básica.'
    }
].map((event) => ({ ...event, criado_em: demoPublishedAt, atualizado_em: demoPublishedAt }));
app.get('/api/calendar', (_req, res) =>
    res.json(
        calendarDemoEvents.filter((event) => !event.oculto && event.visibilidade !== 'pessoal')
    )
);
app.get('/api/calendar/manage', (_req, res) => res.json(calendarDemoEvents));
app.post('/api/calendar', (req, res) => {
    try {
        const values = require('../backend/src/services/content-edit.service').validateContent(
            'calendar',
            req.body,
            true
        );
        const id = Math.max(0, ...calendarDemoEvents.map((event) => event.id_evento)) + 1;
        calendarDemoEvents.push({
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            id_evento: id,
            id_usuario: 4,
            categoria: 'evento',
            oculto: false,
            visibilidade: 'publico',
            ...values
        });
        res.status(201).json({
            eventId: id,
            message: 'Evento fictício criado somente na memória.'
        });
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Não foi possível criar o evento de demonstração.'
        });
    }
});
app.patch('/api/content/calendar/:id', (req, res) => {
    const event = calendarDemoEvents.find((item) => String(item.id_evento) === req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento não encontrado na demonstração.' });
    try {
        const values = require('../backend/src/services/content-edit.service').validateContent(
            'calendar',
            { ...event, ...req.body },
            true
        );
        Object.assign(event, values, { atualizado_em: new Date().toISOString() });
        res.json({ message: 'Evento de demonstração atualizado somente na memória.' });
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.status ? error.message : 'Não foi possível salvar a demonstração.'
        });
    }
});
app.get('/api/projects', (_req, res) =>
    res.json([
        {
            id_projeto: 1,
            id_usuario: 4,
            titulo: 'Pesquisa — demonstração',
            descricao: 'Projeto fictício para conferir as visualizações.',
            eixo: 'pesquisa',
            aprovacao: 'aprovado',
            situacao: 'ativo',
            vagas: 5
        },
        {
            id_projeto: 2,
            id_usuario: 4,
            titulo: 'Extensão — demonstração',
            descricao: 'Projeto fictício em revisão.',
            eixo: 'extensao',
            aprovacao: 'pendente',
            situacao: 'em_selecao',
            vagas: 3
        }
    ])
);
app.get('/api/projects/my', (_req, res) => res.json([]));
app.get('/api/auth/perfil', (_req, res) =>
    res.json({
        ...user,
        telefone: '',
        sobre: 'Perfil fictício da prévia',
        nome_social: '',
        preferencias: {}
    })
);
app.get(/^\/api\//, (_req, res) => res.json([]));
app.use('/api', (_req, res) => res.status(405).json({ error: 'Prévia sem gravação' }));
app.get('/:file.html', (req, res, next) => {
    const file = path.join(__dirname, '../front', path.basename(req.params.file) + '.html');
    if (!fs.existsSync(file)) return next();
    const person = req.params.file === 'community' ? external : user;
    const sessionScript =
        req.query.visitor === '1'
            ? "localStorage.removeItem('arcadiaToken');localStorage.removeItem('arcadiaSessao');"
            : "localStorage.setItem('arcadiaToken','preview');localStorage.setItem('arcadiaSessao'," +
              JSON.stringify(JSON.stringify(person)) +
              ');';
    res.type('html').send(
        fs
            .readFileSync(file, 'utf8')
            .replace(
                '<head>',
                '<head><script>window.ARCADIA_API_BASE=location.origin;' +
                    sessionScript +
                    "localStorage.setItem('arcadia-theme'," +
                    JSON.stringify(req.query.theme === 'light' ? 'light' : 'dark') +
                    ');</script>'
            )
    );
});
app.use(express.static(path.join(__dirname, '../front')));
module.exports = app;
if (require.main === module)
    app.listen(61119, '127.0.0.1', () =>
        console.log('Prévia local com dados fictícios em memória: 61119')
    );
