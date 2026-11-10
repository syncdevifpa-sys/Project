// idioma.js: troca de idioma da landing (PT ⇄ EN) sem recarregar a página.
// O português continua no HTML como fonte; aqui ficam só as traduções.
// Cada texto guarda o original, então dá para voltar ao PT a qualquer momento.
(function () {
    'use strict';

    const CHAVE = 'arcadia-lang';
    const IDIOMAS = {
        pt: { rotulo: 'PT', html: 'pt-BR', aria: 'Idioma: português' },
        en: { rotulo: 'EN', html: 'en', aria: 'Language: English' }
    };
    const ATRIBUTOS = ['alt', 'aria-label', 'title'];

    // Título do hero (cada palavra vira uma máscara animada). As últimas palavras vão em destaque.
    const HERO_EN = 'News, notices and events in a single place.';
    const HERO_EN_DESTAQUE = 2;
    // Iniciais dos dias da semana no celular do calendário (D S T Q Q S S).
    const SEMANA_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const TITULO_PAGINA_EN = 'Arcadia — IFPA Campus Belém Portal';

    // Textos montados com nome de pessoa (escritos pelo landing.js).
    const PADROES_EN = [
        [/^Abrir conta de (.+)$/, 'Open $1’s account'],
        [/^Foto de (.+)$/, 'Photo of $1']
    ];

    const EN = {
        // Cabeçalho, menu e rodapé
        'Pular para o conteúdo': 'Skip to content',
        Plataforma: 'Platform',
        Notícias: 'News',
        'Para quem': 'Who it’s for',
        'Como funciona': 'How it works',
        Dúvidas: 'FAQ',
        Entrar: 'Log in',
        'Criar conta': 'Create account',
        'Meu painel': 'My dashboard',
        'Minha conta': 'My account',
        Idioma: 'Language',
        '← Voltar ao início': '← Back to home',
        // Hero
        'Conheça a Arcádia': 'Meet Arcadia',
        'Veja como começar': 'See how to get started',
        'Ver últimas notícias': 'See the latest news',
        'A Arcádia em números': 'Arcadia in numbers',
        Portal: 'Portal',
        'áreas no portal': 'areas in the portal',
        Comunidade: 'Community',
        'públicos atendidos': 'audiences served',
        'vagas ofertadas': 'openings offered',
        '1.135': '1,135',
        'Sem informações espalhadas entre redes sociais, aplicativos de mensagens e e-mails. A Arcadia reúne o que estudantes, docentes e servidores precisam acompanhar.':
            'No more information scattered across social media, messaging apps and email. Arcadia brings together everything students, faculty and staff need to keep up with.',
        'Gratuito para toda a comunidade acadêmica. Cadastre-se com seu e-mail.':
            'Free for the whole academic community. Sign up with your email.',
        Oficial: 'Official',
        // O que é
        'O que é a Arcadia': 'What is Arcadia',
        'A Arcadia centraliza, organiza e dissemina informações institucionais.':
            'Arcadia centralizes, organizes and shares institutional information.',
        'Porque a comunicação é fundamental para o funcionamento de uma instituição de ensino.':
            'Because communication is essential to how a school works.',
        Alcance: 'Reach',
        'Um canal para todos os públicos': 'One channel for every audience',
        'Discentes, docentes e servidores acessam as mesmas informações, no mesmo lugar.':
            'Students, faculty and staff access the same information, in the same place.',
        Agilidade: 'Speed',
        'Comunicados sem atraso': 'Announcements without delay',
        'Acesso às informações 24 horas por dia, sem atrasos no recebimento de comunicados.':
            'Access to information 24 hours a day, with no delays in receiving announcements.',
        Participação: 'Participation',
        'Comunidade mais integrada': 'A more connected community',
        'Maior participação e integração entre os diferentes públicos da instituição.':
            'Greater participation and integration among the institution’s different groups.',
        // Dentro da plataforma
        'Depois de entrar': 'After you log in',
        'Dentro da plataforma': 'Inside the platform',
        'Funcionalidades para publicação e organização de notícias e avisos institucionais.':
            'Features for publishing and organizing institutional news and notices.',
        'Mural oficial': 'Official board',
        'Avisos e comunicados atualizados': 'Up-to-date notices and announcements',
        'Do início do período de matrícula aos comunicados do dia, sem falhas na disseminação de avisos importantes.':
            'From the start of enrollment to the day’s announcements, with no gaps in getting important notices out.',
        'Filtros por vínculo': 'Filters by role',
        'Encontre o que importa para você': 'Find what matters to you',
        'Aluno, professor ou servidor: consulte avisos por público-alvo.':
            'Student, teacher or staff: browse notices by audience.',
        'Central de documentos': 'Document center',
        'Formulários e documentos acadêmicos': 'Academic forms and documents',
        'Acompanhe solicitações de certificados, comprovantes de matrícula, declarações e históricos.':
            'Track requests for certificates, proof of enrollment, official letters and transcripts.',
        'Calendário acadêmico': 'Academic calendar',
        'Datas acadêmicas em um só lugar': 'Academic dates in one place',
        'Provas, reposições, feriados e eventos do semestre publicados pela secretaria acadêmica.':
            'Exams, make-up classes, holidays and semester events published by the registrar’s office.',
        Projetos: 'Projects',
        'Projetos da comunidade acadêmica': 'Academic community projects',
        'Bolsas PIBIC, feiras de robótica, laboratórios de pesquisa e iniciativas de extensão.':
            'PIBIC scholarships, robotics fairs, research labs and outreach initiatives.',
        // Notícias
        'Ver todas as notícias': 'See all news',
        Evento: 'Event',
        'Processo seletivo': 'Admissions',
        '29 out. 2026': 'Oct 29, 2026',
        '27 out. 2026': 'Oct 27, 2026',
        '16 out. 2026': 'Oct 16, 2026',
        'Revisão Final Pré-Enem 2026, de 03 a 06 de novembro':
            'Pre-ENEM 2026 final review, November 3 to 6',
        'Atividades do Campus Belém suspensas nos dias 27 e 28 de outubro':
            'Campus Belém activities suspended on October 27 and 28',
        'IFPA Campus Belém oferta 1.135 vagas em Cursos Técnicos e Superiores':
            'IFPA Campus Belém offers 1,135 places in technical and undergraduate programs',
        'Notícias recentes': 'Recent news',
        // Campus e comunidade
        'Campus e comunidade': 'Campus and community',
        'Ver no Instagram': 'View on Instagram',
        '(abre em nova aba)': '(opens in a new tab)',
        'Ver publicação': 'View post',
        'no Instagram (abre em nova aba)': 'on Instagram (opens in a new tab)',
        'IFPA Campus Belém inaugura espaço de convivência para servidores técnico-administrativos':
            'IFPA Campus Belém opens a common area for technical and administrative staff',
        'Defesa de memorial à classe de Professor Titular':
            'Memorial defense for promotion to Full Professor',
        'IFPA Campus Belém marca mais uma conquista na trajetória de seus estudantes':
            'IFPA Campus Belém marks another milestone in its students’ journey',
        'Semana da Biblioteca 2026: a celebração do livro e da autoria humana em tempos digitais':
            'Library Week 2026: celebrating books and human authorship in digital times',
        'IFPA Campus Belém certifica concluintes do curso de Eletricista Instalador de Baixa Tensão':
            'IFPA Campus Belém certifies graduates of the Low-Voltage Electrician course',
        'IFPA Campus Belém celebra conquista de novos profissionais em solenidade de conclusão de cursos técnicos':
            'IFPA Campus Belém celebrates new professionals at its technical programs graduation ceremony',
        // Para quem ("Feito para / toda a comunidade / acadêmica")
        'Feito para': 'Built for',
        'toda a comunidade': 'the whole academic',
        acadêmica: 'community',
        'Discentes, docentes e servidores dependem do acesso a avisos, notícias e eventos para organizar suas rotinas acadêmicas.':
            'Students, faculty and staff rely on notices, news and events to organize their academic routines.',
        Discentes: 'Students',
        'Técnico e graduação': 'Technical and undergraduate',
        Estudantes: 'Learners',
        'Períodos de matrícula, editais de iniciação científica e eventos, sem depender de redes sociais ou da comunicação oral.':
            'Enrollment periods, undergraduate research calls and events, without relying on social media or word of mouth.',
        Docentes: 'Faculty',
        'Ensino, pesquisa e extensão': 'Teaching, research and outreach',
        'Professores e instrutores': 'Teachers and instructors',
        'Publicação de avisos e eventos para as turmas, melhorando o fluxo de comunicação institucional.':
            'Posting notices and events for classes, improving the flow of institutional communication.',
        Servidores: 'Staff',
        'Gestão e administração': 'Management and administration',
        'Equipe administrativa': 'Administrative team',
        'Redução de falhas comunicacionais e otimização dos processos administrativos, com informações padronizadas.':
            'Fewer communication failures and streamlined administrative processes, with standardized information.',
        // Celular ("A Arcadia também / no celular")
        'Em qualquer dispositivo': 'On any device',
        'A Arcadia também': 'Arcadia on',
        'no celular': 'your phone, too',
        'Funciona no navegador do computador, do tablet e do celular, sem precisar instalar nada.':
            'Works in the browser on your computer, tablet and phone, with nothing to install.',
        'Avisos e notícias': 'Notices and news',
        Todos: 'All',
        Matrícula: 'Enrollment',
        'Olá,': 'Hi,',
        'Discente ·': 'Student ·',
        Desenvolvimento: 'Systems',
        'de Sistemas': 'Development',
        Calendário: 'Academic',
        acadêmico: 'calendar',
        Agenda: 'Schedule',
        'Novembro de 2026': 'November 2026',
        'Três telas da Arcadia no celular: mural oficial de avisos, página inicial com saudação e calendário acadêmico':
            'Three Arcadia screens on a phone: official notice board, home page with a greeting and academic calendar',
        // Como funciona
        'Três passos para acessar': 'Three steps to reach',
        'o mural acadêmico': 'the academic board',
        'Organização e acessibilidade das informações, do cadastro ao mural.':
            'Organized, accessible information, from sign-up to the board.',
        '[TELA: cadastro]': '[SCREEN: sign-up]',
        '[TELA: vínculo]': '[SCREEN: role]',
        '[TELA: mural]': '[SCREEN: board]',
        Cadastro: 'Sign-up',
        'Crie sua conta.': 'Create your account.',
        'Cadastre-se com seu e-mail. É gratuito.': 'Sign up with your email. It’s free.',
        Vínculo: 'Role',
        'Informe seu vínculo.': 'Tell us your role.',
        'Discente, docente ou servidor da instituição.':
            'Student, faculty or staff member of the institution.',
        Mural: 'Board',
        'Fique por dentro.': 'Stay in the loop.',
        'Acompanhe notícias, avisos e eventos no computador ou no celular.':
            'Follow news, notices and events on your computer or phone.',
        // Dúvidas frequentes
        'Dúvidas frequentes': 'Frequently asked questions',
        'Não encontrou o que procura?': 'Didn’t find what you’re looking for?',
        'Fale com a equipe': 'Talk to the team',
        'Quem pode usar a Arcadia?': 'Who can use Arcadia?',
        'Qualquer pessoa pode consultar as publicações públicas. Alunos podem criar uma conta com e-mail, senha e um curso cadastrado. Quem não tem vínculo com o campus pode escolher Comunidade externa; essa conta não dá acesso às funções institucionais. Contas de professor e servidor dependem de validação administrativa.':
            'Anyone can browse public posts. Students can create an account with an email, a password and a registered program. People with no campus affiliation can choose External community; that account does not give access to institutional features. Teacher and staff accounts require administrative approval.',
        'A entrada é por e-mail e senha. Quando habilitado, o Google permite entrar em uma conta já cadastrada, após vincular com sua senha. A recuperação de senha depende do serviço de envio de e-mail configurado. Se ele estiver indisponível, a tela informa o problema.':
            'You log in with your email and password. When enabled, Google lets you sign in to an existing account after linking it with your password. Password recovery depends on the configured email service. If it is unavailable, the screen will tell you.',
        'Há alguma taxa de assinatura?': 'Is there a subscription fee?',
        'Não. O uso da Arcadia é gratuito. Este é um projeto acadêmico; não há plano de assinatura nem cobrança para criar conta ou usar os recursos disponíveis.':
            'No. Arcadia is free to use. This is an academic project; there is no subscription plan and no charge to create an account or use the available features.',
        'Como meu vínculo é verificado?': 'How is my role verified?',
        'Selecionar um vínculo no formulário não concede permissões de professor ou servidor. Esses perfis precisam de autorização da administração do projeto; usar um e-mail institucional, por si só, não comprova o cargo. O cadastro público permite as opções Aluno e Comunidade externa. Não há verificação automática de vínculo com sistemas do IFPA nem confirmação automática por e-mail.':
            'Choosing a role on the form does not grant teacher or staff permissions. Those profiles need authorization from the project administrators; using an institutional email does not, by itself, prove your position. Public sign-up offers the Student and External community options. There is no automatic role check against IFPA systems and no automatic email confirmation.',
        'A Arcadia substitui o SIGAA?': 'Does Arcadia replace SIGAA?',
        'Não. A Arcadia é um projeto acadêmico para organizar publicações, tarefas, projetos e solicitações. Não consulta nem altera automaticamente notas, matrículas ou registros no SIGAA. Na aba Documentos, você acompanha solicitações; isso não gera um documento oficial automaticamente. O download fica disponível quando um arquivo é cadastrado na solicitação pela equipe responsável.':
            'No. Arcadia is an academic project for organizing posts, tasks, projects and requests. It does not automatically read or change grades, enrollments or records in SIGAA. In the Documents tab you track requests; this does not automatically generate an official document. A download becomes available when the responsible team attaches a file to the request.',
        'Funciona no celular?': 'Does it work on mobile?',
        'Sim. Você pode acessar pelo navegador do celular, com conexão à internet, sem instalar um aplicativo. A navegação lateral e os filtros se recolhem em telas menores para dar espaço ao conteúdo. O tema claro, escuro ou automático pode ser escolhido nas Configurações.':
            'Yes. You can use it in your phone’s browser with an internet connection, without installing an app. The side navigation and filters collapse on smaller screens to make room for content. You can choose a light, dark or automatic theme in Settings.',
        // Chamada final e conteúdo da sessão conectada
        'Informação clara e acessível': 'Clear, accessible information',
        'Um meio mais organizado de acesso às informações institucionais. Crie sua conta com seu e-mail.':
            'A more organized way to access institutional information. Create your account with your email.',
        'Acompanhe as publicações do campus e os projetos da comunidade. Seu próximo acesso começa aqui.':
            'Follow campus posts and community projects. Your next visit starts here.',
        'Notícias e avisos do campus': 'Campus news and notices',
        'Informações e novidades compartilhadas com toda a comunidade.':
            'Information and updates shared with the whole community.',
        'Carregando notícias…': 'Loading news…',
        'Projetos da comunidade': 'Community projects',
        'Conheça os projetos aprovados do campus. Para participar, acesse seu painel.':
            'Explore the campus’s approved projects. To take part, go to your dashboard.',
        'Carregando projetos…': 'Loading projects…',
        'Nenhuma notícia pública no momento.': 'No public news right now.',
        'Nenhum projeto publicado no momento.': 'No published projects right now.',
        'Não foi possível carregar as notícias. Tente novamente mais tarde.':
            'Couldn’t load the news. Please try again later.',
        'Não foi possível carregar os projetos. Tente novamente mais tarde.':
            'Couldn’t load the projects. Please try again later.',
        'Ler publicação completa': 'Read the full post',
        // Aviso de cookies (js/privacy-notice.js)
        'Cookies e sua privacidade': 'Cookies and your privacy',
        'O armazenamento necessário mantém seu acesso e a operação do portal. Você permite cookies opcionais?':
            'Necessary storage keeps you signed in and the portal running. Do you allow optional cookies?',
        'Nenhum cookie opcional está ativo nesta versão.':
            'No optional cookies are active in this version.',
        'Sua escolha não autoriza novos rastreadores. Antes de incluir um recurso que exija consentimento, pediremos uma nova autorização específica.':
            'Your choice does not authorize new trackers. Before adding a feature that requires consent, we will ask for a new, specific authorization.',
        'Rejeitar cookies opcionais': 'Reject optional cookies',
        'Aceitar opcionais': 'Accept optional',
        'Ler Política de Cookies': 'Read the Cookie Policy',
        'Como usamos seus dados': 'How we use your data',
        'Preferências de cookies': 'Cookie preferences',
        'Termos de Uso': 'Terms of Use',
        'Política de Privacidade': 'Privacy Policy',
        'Política de Cookies': 'Cookie Policy',
        Fechar: 'Close',
        // Atributos (alt, aria-label, title)
        'Navegação principal': 'Main navigation',
        'Arcádia, IFPA Campus Belém — início': 'Arcádia, IFPA Campus Belém — home',
        'Arcádia — início': 'Arcádia — home',
        Rodapé: 'Footer',
        'Abrir minha conta': 'Open my account',
        'Abrir menu': 'Open menu',
        'Fechar menu': 'Close menu',
        'Ativar tema escuro': 'Switch to dark theme',
        'Ativar tema claro': 'Switch to light theme',
        'Portaria do Instituto Federal do Pará, Campus Belém':
            'Entrance of the Federal Institute of Pará, Campus Belém',
        'Cartaz do Pré-Enem 2026 do IFPA Campus Belém': 'IFPA Campus Belém Pre-ENEM 2026 poster',
        'Ofício circular sobre a suspensão das atividades do Campus Belém':
            'Circular letter on the suspension of Campus Belém activities',
        'Cartaz do PSU 2027 do IFPA com a fachada do Campus Belém':
            'IFPA PSU 2027 poster showing the Campus Belém building'
    };

    const root = document.documentElement;
    const normalizar = (s) => s.replace(/\s+/g, ' ').trim();

    function lerPreferencia() {
        try {
            const salvo = localStorage.getItem(CHAVE);
            if (salvo && IDIOMAS[salvo]) return salvo;
        } catch {
            /* Sem armazenamento: português. */
        }
        return 'pt';
    }
    let idioma = lerPreferencia();

    // Tradução de um texto em português para o idioma atual (null = sem tradução).
    function traduzir(pt) {
        if (idioma === 'pt') return pt;
        const chave = normalizar(pt);
        if (Object.prototype.hasOwnProperty.call(EN, chave)) return EN[chave];
        for (const [padrao, troca] of PADROES_EN) if (padrao.test(chave)) return chave.replace(padrao, troca);
        return null;
    }
    // Mantém os espaços das pontas do texto original (ex.: " Sua escolha…").
    function comEspacos(original, traduzido) {
        return original.match(/^\s*/)[0] + traduzido + original.match(/\s*$/)[0];
    }

    // Partes tratadas à parte: títulos divididos em palavras, hero e o próprio seletor.
    const IGNORAR = 'script, style, [data-reveal], .hero-title, .lang-switch, .nav-mobile-lang, .phone-week';

    // ---- Textos -----------------------------------------------------------------
    const textos = new WeakMap(); // nó de texto → { original, escrito }
    function traduzirTexto(no) {
        const pai = no.parentElement;
        if (!pai || pai.closest(IGNORAR)) return;
        const atual = no.textContent;
        let reg = textos.get(no);
        // Texto novo ou alterado por outro script: o valor atual passa a ser o original.
        if (!reg || atual !== reg.escrito) {
            if (!atual.trim()) return;
            reg = { original: atual, escrito: atual };
            textos.set(no, reg);
        }
        const traducao = traduzir(reg.original);
        const alvo = traducao == null ? reg.original : comEspacos(reg.original, traducao);
        if (alvo !== atual) {
            reg.escrito = alvo;
            no.textContent = alvo;
        }
    }

    // ---- Atributos --------------------------------------------------------------
    const atributos = new WeakMap(); // elemento → { [atributo]: { original, escrito } }
    function traduzirAtributo(el, nome) {
        if (el.closest(IGNORAR) && !el.matches('[data-reveal], .hero-title')) return;
        const atual = el.getAttribute(nome);
        if (atual == null || !atual.trim()) return;
        let mapa = atributos.get(el);
        if (!mapa) atributos.set(el, (mapa = {}));
        let reg = mapa[nome];
        if (!reg || atual !== reg.escrito) reg = mapa[nome] = { original: atual, escrito: atual };
        const traducao = traduzir(reg.original);
        const alvo = traducao == null ? reg.original : traducao;
        if (alvo !== atual) {
            reg.escrito = alvo;
            el.setAttribute(nome, alvo);
        }
    }

    function traduzirArvore(raiz) {
        if (raiz.nodeType === 3) return traduzirTexto(raiz);
        if (raiz.nodeType !== 1) return;
        for (const nome of ATRIBUTOS) if (raiz.hasAttribute(nome)) traduzirAtributo(raiz, nome);
        const percurso = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let no;
        while ((no = percurso.nextNode())) {
            if (no.nodeType === 3) traduzirTexto(no);
            else for (const nome of ATRIBUTOS) if (no.hasAttribute(nome)) traduzirAtributo(no, nome);
        }
    }

    // ---- Títulos animados (data-reveal) -------------------------------------------
    // O HTML original é guardado antes de o animacoes.js dividir as palavras.
    const titulos = Array.from(document.querySelectorAll('[data-reveal]')).map((el) => ({
        el,
        original: el.innerHTML,
        idioma: 'pt'
    }));
    function aplicarTitulos() {
        let mudou = false;
        for (const t of titulos) {
            if (t.idioma === idioma) continue;
            const modelo = document.createElement('template');
            modelo.innerHTML = t.original;
            if (idioma !== 'pt') {
                const percurso = document.createTreeWalker(modelo.content, NodeFilter.SHOW_TEXT);
                let no;
                while ((no = percurso.nextNode())) {
                    const traducao = traduzir(no.textContent);
                    if (traducao != null) no.textContent = comEspacos(no.textContent, traducao);
                }
            }
            t.el.innerHTML = modelo.innerHTML;
            t.idioma = idioma;
            mudou = true;
        }
        return mudou;
    }

    // ---- Título do hero ------------------------------------------------------------
    const hero = document.querySelector('.hero-title');
    const heroPt = hero
        ? Array.from(hero.querySelectorAll('.w-in')).map((w) => ({
              texto: w.textContent,
              destaque: w.parentElement.classList.contains('hero-highlight')
          }))
        : [];
    const heroEn = HERO_EN.split(' ').map((texto, i, todas) => ({
        texto,
        destaque: i >= todas.length - HERO_EN_DESTAQUE
    }));
    let heroIdioma = 'pt';
    function aplicarHero() {
        if (!hero || heroIdioma === idioma) return false;
        const palavras = idioma === 'pt' ? heroPt : heroEn;
        hero.innerHTML = palavras
            .map(
                (p, i) =>
                    `<span class="w${p.destaque ? ' hero-highlight' : ''}"><span class="w-in" style="--i: ${i}">${p.texto}</span></span>`
            )
            .join(' ');
        heroIdioma = idioma;
        return true;
    }

    // ---- Dias da semana do calendário ----------------------------------------------
    const semana = Array.from(document.querySelectorAll('.phone-week:not(.phone-days) span'));
    const semanaPt = semana.map((s) => s.textContent);
    function aplicarSemana() {
        semana.forEach((s, i) => {
            s.textContent = idioma === 'pt' ? semanaPt[i] : SEMANA_EN[i] || semanaPt[i];
        });
    }

    // ---- Seletor (navbar e menu mobile) ----------------------------------------------
    const botao = document.getElementById('langToggle');
    const menu = document.getElementById('langMenu');
    const opcoes = () => Array.from(document.querySelectorAll('[data-lang]'));
    const tituloPt = document.title;

    function atualizarSeletor() {
        const info = IDIOMAS[idioma];
        if (botao) {
            botao.setAttribute('aria-label', info.aria);
            const atual = botao.querySelector('.lang-current');
            if (atual) atual.textContent = info.rotulo;
        }
        const rotuloMobile = document.getElementById('mobileLangLabel');
        if (rotuloMobile) rotuloMobile.textContent = idioma === 'pt' ? 'Idioma' : EN.Idioma;
        for (const op of opcoes()) {
            const ativo = op.dataset.lang === idioma;
            if (op.closest('.lang-menu')) op.setAttribute('aria-current', String(ativo));
            else op.setAttribute('aria-pressed', String(ativo));
        }
    }

    function abrirMenu(abrir, focarPrimeira) {
        if (!botao || !menu) return;
        menu.hidden = !abrir;
        botao.setAttribute('aria-expanded', String(abrir));
        if (abrir && focarPrimeira) {
            const ativa = menu.querySelector('[aria-current="true"]') || menu.querySelector('[data-lang]');
            if (ativa) ativa.focus();
        }
    }

    function aplicar() {
        root.lang = IDIOMAS[idioma].html;
        document.title = idioma === 'pt' ? tituloPt : TITULO_PAGINA_EN;
        traduzirArvore(document.body);
        const titulosMudaram = aplicarTitulos();
        const heroMudou = aplicarHero();
        aplicarSemana();
        atualizarSeletor();
        root.classList.remove('i18n-pendente');
        if (titulosMudaram || heroMudou)
            window.dispatchEvent(new CustomEvent('arcadia:idioma', { detail: { idioma } }));
    }

    function definir(novo) {
        if (!IDIOMAS[novo] || novo === idioma) return;
        idioma = novo;
        try {
            localStorage.setItem(CHAVE, novo);
        } catch {
            /* A escolha vale só para esta visita. */
        }
        aplicar();
    }

    // Textos que outros scripts escrevem depois (landing.js, aviso de cookies).
    const observador = new MutationObserver((mudancas) => {
        for (const m of mudancas) {
            if (m.type === 'childList') m.addedNodes.forEach(traduzirArvore);
            else if (m.type === 'characterData') traduzirTexto(m.target);
            else if (m.type === 'attributes') traduzirAtributo(m.target, m.attributeName);
        }
    });

    function iniciar() {
        aplicar();
        observador.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ATRIBUTOS
        });

        for (const op of opcoes())
            op.addEventListener('click', () => {
                definir(op.dataset.lang);
                if (op.closest('.lang-menu')) {
                    abrirMenu(false);
                    if (botao) botao.focus();
                }
            });
        if (botao && menu) {
            botao.addEventListener('click', () =>
                abrirMenu(botao.getAttribute('aria-expanded') !== 'true', false)
            );
            botao.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    abrirMenu(true, true);
                }
            });
            menu.addEventListener('keydown', (e) => {
                const itens = Array.from(menu.querySelectorAll('[data-lang]'));
                const i = itens.indexOf(document.activeElement);
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const passo = e.key === 'ArrowDown' ? 1 : -1;
                    itens[(i + passo + itens.length) % itens.length].focus();
                } else if (e.key === 'Home' || e.key === 'End') {
                    e.preventDefault();
                    itens[e.key === 'Home' ? 0 : itens.length - 1].focus();
                } else if (e.key === 'Tab') {
                    abrirMenu(false);
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !menu.hidden) {
                    abrirMenu(false);
                    botao.focus();
                }
            });
            document.addEventListener('click', (e) => {
                if (!menu.hidden && !e.target.closest('.lang-switch')) abrirMenu(false);
            });
        }
    }

    window.ArcadiaI18n = {
        idioma: () => idioma,
        definir,
        t: (pt) => traduzir(pt) ?? pt
    };

    // Carregado no fim do <body>, antes do animacoes.js: traduz antes de os títulos
    // serem divididos em palavras e antes da primeira pintura.
    if (document.body) iniciar();
    else document.addEventListener('DOMContentLoaded', iniciar);
})();
