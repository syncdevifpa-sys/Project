/* Prévia local: dados fictícios; calendário e publicações somente em memória, sem banco ou mensagens. */
const express = require('../node_modules/express');
const fs = require('fs'),
    path = require('path');
const db = require('../backend/src/config/database');
const sharing = require('../backend/src/services/profile-sharing.service');
const photo =
    'data:image/png;base64,' +
    fs
        .readFileSync(path.join(__dirname, '../frontend/public/arcadia-logo-64.png'))
        .toString('base64');
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
/* Rotas locais de demonstração: nunca consultam nem escrevem no banco real. */
app.get('/api', (_req, res) => res.json({ message: 'Prévia Arcádia em memória', preview: true }));
const demoPerson = (req) => {
    const role = String(req.headers.authorization || '')
        .split(':')
        .pop();
    return role === 'externo'
        ? external
        : {
              ...user,
              tipo_usuario:
                  role === 'aluno' ? 'discente' : role === 'professor' ? 'docente' : 'servidor',
              is_admin: role === 'admin'
          };
};
app.get('/api/auth/nomes', (req, res) =>
    res.json({ nome: demoPerson(req).nome, disponivel: true, pedido: null })
);
app.get('/api/external/nomes', (_req, res) =>
    res.json({ nome: external.nome, disponivel: true, pedido: null })
);
app.get('/api/courses', (_req, res) =>
    res.json([
        { id_curso: 1, nome: 'Curso de demonstração', regime_etapas: 'semestral', total_etapas: 6 }
    ])
);
const demoSubject = {
    id_disciplina: 11,
    id_turma: 3,
    nome: 'Disciplina com título extenso para conferir leitura e quebra de linha',
    turma: 'Turma de demonstração',
    ano_ingresso: 2026,
    curso: 'Curso de demonstração',
    campus: 'IFPA Campus Belém',
    turno: 'noite',
    professor: 'Docente de exemplo',
    ano_letivo: 2026,
    regime_letivo: 'semestral',
    semestre: 2
};
app.get('/api/classes', (req, res) => {
    const person = demoPerson(req);
    res.json({
        role: person.tipo_usuario,
        canAdminister: person.is_admin,
        canCreate: person.is_admin,
        subjects: [demoSubject],
        invites: []
    });
});
const demoDetail = (req, aggregate = false) => ({
    subject: { ...demoSubject, canManage: demoPerson(req).tipo_usuario !== 'discente' },
    aggregate,
    subjects: [demoSubject],
    people: [],
    pending: [],
    posts: [
        {
            id_post: 1,
            tipo: 'aviso',
            titulo: 'Aviso fictício da disciplina',
            descricao:
                'Conteúdo de demonstração para conferir navegação, leitura e layouts. Nenhum dado de estudante é utilizado.',
            criado_em: demoPublishedAt
        }
    ]
});
app.get('/api/classes/11', (req, res) => res.json(demoDetail(req)));
app.get('/api/classes/cohorts/3/feed', (req, res) => res.json(demoDetail(req, true)));
app.get('/api/classes/cohorts/3/info', (_req, res) =>
    res.json({
        descricao: 'Turma fictícia para revisão de interface.',
        sala_oficial: 'Sala de exemplo',
        vices: []
    })
);
app.get('/api/classes/11/schedule', (_req, res) =>
    res.json([
        {
            id_horario: 1,
            dia_semana: 1,
            hora_inicio: '18:30:00',
            hora_fim: '20:10:00',
            sala: 'Sala de exemplo',
            modalidade: 'presencial'
        }
    ])
);
const demoLibraryItems = [
    {
        id_item: 1,
        id_pasta: null,
        titulo: 'Material de demonstração com título extenso',
        descricao:
            'Descrição em dois parágrafos.\n\nConfira a organização em quadro, lista e tabela.',
        tipo: 'link',
        url: 'https://example.test/material',
        visibilidade: 'privado',
        revisao: 'rascunho',
        criado_em: demoPublishedAt
    },
    {
        id_item: 2,
        id_pasta: 1,
        titulo: 'Outro material para comparação',
        descricao: 'Nenhuma informação real de aluno.',
        tipo: 'link',
        url: 'https://example.test/outro',
        visibilidade: 'privado',
        revisao: 'rascunho',
        criado_em: demoPublishedAt
    }
];
app.get('/api/document-library', (req, res) =>
    res.json({
        items: demoLibraryItems,
        saved: [],
        folders: [{ id_pasta: 1, nome: 'Assunto de demonstração' }],
        used: 0,
        canPublish: demoPerson(req).tipo_usuario !== 'discente',
        canReview: demoPerson(req).is_admin,
        canSetAuthorship: true,
        limits: { description: 3000, file: 4 * 1024 * 1024 }
    })
);
app.get('/api/document-library/public', (_req, res) => res.json([]));
app.get('/api/document-library/reviews', (_req, res) => res.json([]));
app.get(['/api/tasks', '/api/tasks/my'], (_req, res) =>
    res.json([
        {
            id_tarefa: 1,
            titulo: 'Tarefa fictícia para conferir visualizações',
            categoria: 'Acadêmico',
            prioridade: 'media',
            status: 'aberta',
            observacao: 'Exemplo em memória'
        }
    ])
);
app.get('/api/admin/resources', (_req, res) => res.json([]));
app.get('/api/admin/people/users', (_req, res) =>
    res.json([
        {
            ...user,
            id_usuario: 8,
            nome: 'Pessoa fictícia para revisão administrativa',
            email: 'outra.pessoa@example.test',
            situacao: 'bloqueado',
            is_admin: false
        }
    ])
);
app.get('/ui-preview', (_req, res) =>
    res
        .type('html')
        .send(
            `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia local — Arcádia</title><style>body{font:16px/1.6 system-ui;max-width:900px;margin:auto;padding:24px;background:#fafaf8;color:#182020}nav{display:flex;flex-wrap:wrap;gap:12px}a{padding:12px;border:1px solid #aaa;border-radius:12px;color:inherit}li{margin:16px 0}</style><h1>Prévia local do Arcádia</h1><p>Dados fictícios. Nenhum banco, login real ou e-mail. O Início mantém o desenho atual.</p><p>Abra uma página e use a ferramenta de dimensões do navegador: 320, 390, 768, 820, 1024 e 1280 px. Confira claro/escuro e rotação.</p><nav>${['notices', 'projects', 'calendar', 'classes', 'documents', 'dashboard', 'settings', 'admin', 'community', 'community-settings', 'campus-map', 'login', 'signup'].map((page) => `<a href="/${page}.html?perfil=${page.startsWith('community') ? 'externo' : 'admin'}&theme=light">${page}</a>`).join('')}</nav><h2>Perfis e tema</h2><nav>${['aluno', 'professor', 'admin', 'externo'].map((role) => `<a href="/${role === 'externo' ? 'community' : 'classes'}.html?perfil=${role}&theme=dark">${role} · escuro</a>`).join('')}</nav><p>Para uma página pública sem sessão, acrescente <code>visitor=1</code>. Esta prévia não comprova permissões do servidor real.</p></html>`
        )
);
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
app.get('/api/auth/perfil', (req, res) => res.json(demoPerson(req)));
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
/* A vitrine usa os mesmos registros das áreas de Notícias e Projetos. */
app.get('/api/public', (_req, res) => res.json({
    notices: noticeDemoRows.filter(row => row.situacao === 'publicado' && row.publico_alvo === 'todos'),
    projects: projectDemoRows.filter(row => row.aprovacao === 'aprovado' && row.visibilidade === 'publico')
}));
app.get('/api/read-notices/unread/count', (_req, res) => res.json({ unread: 1 }));
const noticeDemoRows = [
    {
        id_aviso: 7,
        capa:
            'data:image/png;base64,' +
            fs
                .readFileSync(path.join(__dirname, '../frontend/assets/print-calendar.png'))
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
/* Notícia real para avaliação local; não é inserida no banco de produção. */
noticeDemoRows.push({
    id_aviso: 8, id_usuario: 4, tipo_publicacao: 'noticia', categoria: 'edital',
    publico_alvo: 'todos', situacao: 'publicado', data_publicacao: '2026-10-14T22:57:00Z',
    titulo: 'IFPA abre inscrições do PSU 2027 com 6.970 vagas',
    resumo: 'Seleção reúne cursos técnicos e de graduação em 22 campi. Inscrições pela internet até 16 de novembro.',
    descricao: 'O IFPA anunciou 6.970 vagas no Processo Seletivo Unificado 2027, entre cursos técnicos integrados, subsequentes e superiores. As inscrições ocorrem de 16 de outubro a 16 de novembro de 2026. Confira modalidades, regras e atualizações no edital oficial. Fonte: https://www.ifpa.edu.br/ultimas-noticias/3059-ifpa-publica-edital-do-processo-seletivo-unificado-2027-com-6-970-vagas',
    capa: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../frontend/assets/landing/news-psu-2027.jpg')).toString('base64')
});
app.post('/api/read-notices/:id', (_req, res) => res.json({ affectedRows: 1 }));
/* Conteúdos aprovados para avaliação local: créditos preservados, sem gravação no banco. */
[
    ['Orientações sobre a carteira do Passe Fácil', 'O Campus Belém publicou orientações sobre emissão da carteira do Passe Fácil. Consulte os procedimentos e documentos na publicação institucional.', '2026-11-06T16:55:00Z', '3172-orientacoes-sobre-emissao-e-renovacao-da-carteira-do-passe-facil-2'],
    ['E-books com orientações práticas sobre gestão de pessoas', 'O Campus Belém apresenta materiais digitais com orientações práticas sobre gestão de pessoas. Conheça os materiais na publicação original.', '2026-10-30T18:13:00Z', '3170-ifpa-campus-belem-disponibiliza-e-books-com-orientacoes-praticas-sobre-gestao-de-pessoas'],
    ['Campus Belém certifica 29 concluintes de Eletricista Instalador de Baixa Tensão', 'O campus divulgou a certificação de 29 concluintes do curso de Eletricista Instalador de Baixa Tensão. Confira o relato institucional.', '2026-10-22T18:19:00Z', '3167-ifpa-campus-belem-certifica-29-concluintes-do-curso-de-eletricista-instalador-de-baixa-tensao']
].forEach(([titulo, resumo, data_publicacao, slug], index) => noticeDemoRows.push({
    id_aviso: 9 + index, id_usuario: 4, titulo, resumo,
    descricao: resumo + '\n\nFonte: IFPA Campus Belém. https://belem.ifpa.edu.br/publicacoes/' + slug,
    tipo_publicacao: 'noticia', categoria: 'evento', publico_alvo: 'todos',
    situacao: 'publicado', data_publicacao,
    capa: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname,
        '../frontend/assets/landing/news-' + slug.substring(0, 4) + '-1.jpg')).toString('base64')
}));
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
const projectDemoRows = [
        {
            id_projeto: 1,
            id_usuario: 4,
            titulo: 'Pesquisa — demonstração',
            descricao: 'Projeto fictício para conferir as visualizações.',
            eixo: 'pesquisa',
            aprovacao: 'aprovado',
            visibilidade: 'publico',
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
 ];
/* Divulgação de pesquisas: não presume atividade atual nem oferece inscrições. */
[
    ['O ritual e a cultura do cancelamento no Brasil', 'Estudo qualitativo de práticas discursivas na imprensa e no Twitter entre 2018 e 2021. Referência: edital 05/2022, PIBICTI/PROPPG/IFPA/CNPq.'],
    ['Parentesco, política e redes sociais', 'Pesquisa sobre hierarquias e conflitos nas relações familiares em grupos de WhatsApp nas eleições presidenciais de 2018 e 2022. Referência: edital 01/2023, PROPPG/IFPA.'],
    ['Gênero e poder no ciberespaço', 'Pesquisa sobre assédio sexual contra estudantes nas redes sociais do IFPA Campus Belém. Referência: edital 01/2023, PROPPG/IFPA.']
].forEach(([titulo, resumo], index) => projectDemoRows.push({
    id_projeto: 3 + index, id_usuario: 4, titulo,
    descricao: resumo + '\n\nDivulgação de pesquisa. Situação atual a confirmar com o NUPEC; sem inscrições abertas. Fonte: https://nupecifpa.com/andamento/'
        + '\n\nImagem: ' + [
            'divulgação original da pesquisa pelo NUPEC. https://nupecifpa.com/projeto-de-pesquisa-o-ritual-e-a-cultura-do-cancelamento-no-brasil/',
            'marca do NUPEC usada para identificação do núcleo, não é foto da pesquisa.',
            'premiação divulgada pelo NUPEC. https://nupecifpa.com/pesquisadora-do-nupec-conquista-1o-lugar-na-categoria-ensino-superior-do-premio-jovem-cientista/'
        ][index],
    capa: (() => {
        const image = fs.readFileSync(path.join(__dirname, '../frontend/assets/landing/project-nupec-' + (index + 1) + '.img'));
        return 'data:image/' + (image[0] === 137 ? 'png' : 'jpeg') + ';base64,' + image.toString('base64');
    })(),
    responsavel_nome: 'NUPEC · responsáveis na fonte', eixo: 'pesquisa',
    aprovacao: 'aprovado', visibilidade: 'publico', situacao: 'A confirmar', vagas: 0
}));
app.get('/api/projects', (_req, res) => res.json(projectDemoRows));
app.get('/api/projects/my', (_req, res) => res.json([]));
app.get(/^\/api\//, (_req, res) => res.json([]));
app.use('/api', (_req, res) => res.status(405).json({ error: 'Prévia sem gravação' }));
app.get('/:file.html', (req, res, next) => {
    const file = path.join(__dirname, '../frontend', path.basename(req.params.file) + '.html');
    if (!fs.existsSync(file)) return next();
    const role = ['aluno', 'professor', 'admin', 'externo'].includes(req.query.perfil)
        ? req.query.perfil
        : req.params.file.startsWith('community')
          ? 'externo'
          : 'admin';
    const person =
        role === 'externo'
            ? external
            : {
                  ...user,
                  tipo_usuario:
                      role === 'aluno' ? 'discente' : role === 'professor' ? 'docente' : 'servidor',
                  is_admin: role === 'admin'
              };
    const explicitRole = ['aluno', 'professor', 'admin', 'externo'].includes(req.query.perfil);
    const setDemoSession =
        req.query.visitor === '1'
            ? "localStorage.removeItem('arcadiaToken');localStorage.removeItem('arcadiaSessao');localStorage.setItem('arcadia-preview-visitor','1');"
            : "localStorage.removeItem('arcadia-preview-visitor');localStorage.setItem('arcadiaToken','preview:" +
              role +
              "');localStorage.setItem('arcadiaSessao'," +
              JSON.stringify(JSON.stringify(person)) +
              ');';
    const sessionScript =
        req.query.visitor === '1' || explicitRole
            ? setDemoSession
            : "if (localStorage.getItem('arcadia-preview-visitor') !== '1' && !(localStorage.getItem('arcadiaToken') || '').startsWith('preview:')) {" +
              setDemoSession +
              '}';
    const headerExample = req.query.barra === 'exemplo' ? require('./topbar-example.cjs')() : '';
    const sourceHtml = fs.readFileSync(file, 'utf8');
    const previewHtml = req.query.design === 'hibrido' && path.basename(file) === 'index.html'
        ? require('./hybrid-design-preview.cjs')(sourceHtml)
        : sourceHtml;
    res.type('html').send(
        previewHtml
            .replace(
                '<head>',
                '<head><script>window.ARCADIA_API_BASE=location.origin;' +
                    sessionScript +
                    (['light', 'dark'].includes(req.query.theme)
                        ? "localStorage.setItem('arcadia-theme'," +
                          JSON.stringify(req.query.theme) +
                          ');'
                        : '') +
                    '</script>' +
                    headerExample
            )
            .replace('<body', '<body data-ui-preview="true"')
            .replace(
                /(<body\b[^>]*>)/,
                '$1<aside style="padding:8px 16px;font:12px system-ui;background:#fff4cc;color:#302800"><a href="/ui-preview">Prévia local</a> · Dados fictícios em memória · Sem banco ou e-mail</aside>'
            )
    );
});
app.use(express.static(path.join(__dirname, '../frontend')));
module.exports = app;
if (require.main === module) {
    const port = Number(process.argv[2] || 61124);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
        throw Error('Porta local inválida.');
    app.listen(port, '127.0.0.1', () =>
        console.log('Prévia local com dados fictícios: http://127.0.0.1:' + port + '/ui-preview')
    );
}
