// idioma.js: troca de idioma da landing (PT ⇄ EN) sem recarregar a página.
// O português continua no HTML como fonte; aqui ficam só as traduções.
// Cada texto guarda o original, então dá para voltar ao PT a qualquer momento.
(function () {
    'use strict';

    const CHAVE = 'arcadia-lang';
    const IDIOMAS = {
        pt: { rotulo: 'PT', html: 'pt-BR', aria: 'Idioma: português' },
        en: { rotulo: 'EN', html: 'en', aria: 'Language: English' },
        es: { rotulo: 'ES', html: 'es', aria: 'Idioma: español' }
    };
    const ATRIBUTOS = ['alt', 'aria-label', 'title', 'placeholder'];

    // Título do hero (cada palavra vira uma máscara animada).
    const HERO_EN = 'News, notices and events in a single place.';
    // Iniciais dos dias da semana no celular do calendário (D S T Q Q S S).
    const SEMANA_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const TITULO_PAGINA_EN = 'Arcadia — IFPA Campus Belém Portal';

    // Textos montados com nome de pessoa (escritos pelo landing.js).
    const PADROES_EN = [
        [/^Abrir conta de (.+)$/, 'Open $1’s account'],
        [/^Foto de (.+)$/, 'Photo of $1']
    ];

    const EN = {
        'Início': 'Home', 'Meu espaço': 'My space', 'Conteúdo': 'Content',
        'Tarefas': 'Tasks', 'Documentos': 'Documents', 'Configurações': 'Settings',
        'Pessoas': 'People', 'Turmas': 'Classes', 'Minhas turmas': 'My classes',
        'Administração': 'Administration', 'Gerenciar aplicativo': 'Manage application',
        'Avisos e notícias': 'Notices and news', 'Notícias e avisos': 'News and notices',
        'Pesquisar': 'Search', 'Pesquisar áreas do portal': 'Search portal areas',
        'Meus documentos': 'My documents', 'Materiais públicos': 'Public materials',
        'Revisão de publicação': 'Publication review', 'Biblioteca de estudo': 'Study library',
        'Adicionar documento': 'Add document', 'Adicionar pasta': 'Add folder',
        'Buscar material': 'Search materials', 'Nova tarefa': 'New task',
        'A fazer': 'To do', 'Tudo': 'All', 'Atrasadas': 'Overdue',
        'Próximos 7 dias': 'Next 7 days', 'Criar tarefa': 'Create task',
        'Adicionar': 'Add', 'Situação': 'Status', 'Quadro': 'Board', 'Tabela': 'Table',
        'Lista': 'List', 'Filtros': 'Filters', 'Todas': 'All', 'Todos': 'All',
        'Sair': 'Sign out', 'Salvar': 'Save', 'Cancelar': 'Cancel',
        'Perfil': 'Profile', 'Conta e segurança': 'Account and security',
        'Aparência': 'Appearance', 'Seus dados': 'Your details',
        'Notificações': 'Notifications', 'Compartilhamento': 'Sharing',
        'Correção de nome': 'Name correction', 'Tentar novamente': 'Try again',
        'Próximo compromisso': 'Next event', 'PRÓXIMO COMPROMISSO': 'NEXT EVENT',
        'Abrir calendário': 'Open calendar', 'Próximas datas': 'Upcoming dates',
        'Documentos solicitados': 'Requested documents', 'Minhas disciplinas': 'My subjects',
        'Ver turmas': 'View classes', 'Ver todos os avisos': 'View all notices',
        'Termos de uso': 'Terms of use', 'Política de privacidade': 'Privacy policy',

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
        'Sem informações espalhadas entre redes sociais, aplicativos de mensagens e e-mails. A Arcadia reúne o que estudantes, docentes e servidores precisam acompanhar.':
            'No more information scattered across social media, messaging apps and email. Arcadia brings together everything students, faculty and staff need to keep up with.',
        'Gratuito para toda a comunidade acadêmica. Cadastre-se com seu e-mail.':
            'Free for the whole academic community. Sign up with your email.',
        Oficial: 'Official',
        'Aviso em destaque': 'Featured notice',
        'Matrícula 2027.1 aberta': 'Enrollment for 2027.1 is open',
        'Prazos, documentos exigidos e etapas para calouros e veteranos, publicados no mural oficial.':
            'Deadlines, required documents and steps for new and returning students, published on the official board.',
        'Ver aviso': 'View notice',
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
        // Integração com a versão 1.1.36 (mapa do campus e ilustrações demonstrativas)
        'Mapa do campus': 'Campus map',
        'Seu dia organizado em um só lugar': 'Your day organized in one place',
        'Tarefas por prazo, avisos não lidos, próximas datas e documentos solicitados reunidos no seu painel.':
            'Tasks by due date, unread notices, upcoming dates and requested documents together on your dashboard.',
        'Portal no celular': 'Portal on your phone',
        'Sua rotina, onde você estiver': 'Your routine, wherever you are',
        'Acesse seu painel, acompanhe tarefas e consulte avisos em uma interface adaptada ao celular.':
            'Open your dashboard, follow your tasks and read notices in an interface made for phones.',
        'Organize seus arquivos em pastas, consulte documentos públicos e acompanhe solicitações acadêmicas.':
            'Organize your files in folders, browse public documents and track academic requests.',
        'Consulte eventos públicos e acadêmicos conforme seu acesso e organize sua agenda pessoal.':
            'Browse public and academic events according to your access and organize your personal schedule.',
        'Conheça iniciativas de pesquisa, ensino e extensão e confira as condições de participação.':
            'Discover research, teaching and outreach initiatives and check how to take part.',
        'Ilustrações da interface com dados demonstrativos; não são registros reais.':
            'Interface illustrations with sample data; they are not real records.',
        'Ilustração do Meu painel com menu lateral e resumos, usando dados demonstrativos':
            'Illustration of My dashboard with side menu and summaries, using sample data',
        'Ilustração de Avisos e notícias com menu lateral e filtros por público, usando dados demonstrativos':
            'Illustration of Notices and news with side menu and audience filters, using sample data',
        'Ilustração do Meu painel no celular com dados demonstrativos':
            'Illustration of My dashboard on a phone with sample data',
        'Ilustração de Documentos com biblioteca e pastas pessoais demonstrativas':
            'Illustration of Documents with a library and sample personal folders',
        'Ilustração do calendário com modos público e pessoal e eventos demonstrativos':
            'Illustration of the calendar with public and personal modes and sample events',
        'Ilustração de Projetos com filtros e iniciativas demonstrativas':
            'Illustration of Projects with filters and sample initiatives',
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
        Calendário: 'Calendar',
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

    /* Traduções locais da interface; não dependem de serviços de terceiros. */
    Object.assign(EN, {
        'Tarefas desta semana':'Tasks this week', 'seg a dom':'Mon to Sun',
        'Entregas no prazo seguidas':'Consecutive on-time submissions', 'seguida':'in a row', 'seguidas':'in a row',
        'SEM DATA':'NO DATE', 'Sem data':'No date', 'MAIS TARDE':'LATER', 'HOJE':'TODAY', 'ATRASADAS':'OVERDUE',
        'Marcar como lidos':'Mark as read', 'em andamento':'in progress', 'dia todo':'all day',
        'Hoje':'Today', 'hoje':'today', 'Amanhã':'Tomorrow', 'amanhã':'tomorrow',
        'Seg':'Mon', 'Ter':'Tue', 'Qua':'Wed', 'Qui':'Thu', 'Sex':'Fri', 'Sáb':'Sat', 'Dom':'Sun',
        'Segunda':'Monday', 'Terça':'Tuesday', 'Quarta':'Wednesday', 'Quinta':'Thursday', 'Sexta':'Friday', 'Sábado':'Saturday', 'Domingo':'Sunday',
        'JAN':'JAN', 'FEV':'FEB', 'MAR':'MAR', 'ABR':'APR', 'MAI':'MAY', 'JUN':'JUN', 'JUL':'JUL', 'AGO':'AUG', 'SET':'SEP', 'OUT':'OCT', 'NOV':'NOV', 'DEZ':'DEC',
        'Eventos':'Events', 'Acadêmico':'Academic', 'Matrículas':'Enrollment', 'Nenhuma tarefa':'No tasks',
        'Nada vence hoje. Bom momento pra adiantar o que vem pela frente.':'Nothing is due today. A good time to get ahead.',
        'Tudo em dia por aqui. Aproveite o dia!':'You are all caught up. Enjoy your day!',
        'te esperando.':'waiting for you.', 'no calendário':'on the calendar', 'pra hoje':'due today', 'Hoje você tem':'Today you have',
        'Zerou tudo por aqui!':'All caught up!', 'Nenhuma tarefa pendente. Que tal planejar a próxima semana?':'No pending tasks. How about planning next week?',
        'Ver avisos':'View notices', 'Ver tarefas':'View tasks', 'Ver documentos':'View documents',
        'Enviar projeto':'Submit project', 'Criar publicação':'Create post', 'Exportar CSV':'Export CSV',
        'Editar':'Edit', 'Excluir':'Delete', 'Baixar':'Download', 'Iniciar':'Start', 'Concluir':'Complete',
        'Adicionar tarefa':'Add task', 'Editar tarefa':'Edit task', 'Iniciar tarefa':'Start task', 'Concluir tarefa':'Complete task',
        'Pesquisar notícias e avisos':'Search news and notices', 'Buscar avisos...':'Search notices...',
        'Adicionar tarefa e pressionar Enter':'Add a task and press Enter', 'Responsável':'Person responsible',
        'Nenhum documento solicitado ainda.':'No documents requested yet.', 'Solicitar':'Request',
        'Ordenar por':'Sort by', 'Mais recentes':'Newest first', 'Mais antigos':'Oldest first',
        'Prazo mais próximo':'Nearest deadline', 'Título A–Z':'Title A–Z', 'Título Z–A':'Title Z–A',
        'Publicado':'Published', 'Rascunho':'Draft', 'Arquivado':'Archived', 'Notícia':'News', 'Aviso':'Notice',
        'Abrir publicação':'Open post', 'Ler publicação completa':'Read full post', 'Buscar projetos':'Search projects',
        'Pesquisa':'Research', 'Extensão':'Outreach', 'Ensino':'Teaching', 'Inovação':'Innovation',
        'Ativo':'Active', 'Encerrado':'Closed', 'Em seleção':'Selection in progress', 'Em andamento':'In progress',
        'Fundo':'Background', 'Texto':'Text', 'Estilo':'Style', 'Personalizado':'Custom', 'Padrão do site':'Site default',
        'Aparência do banner':'Banner appearance', 'Aplicar degradê suave':'Apply a subtle gradient',
        'Ajustar automaticamente a cor do texto':'Automatically adjust text color',
        'Nenhum evento encontrado.':'No events found.', 'Mês anterior':'Previous month', 'Próximo mês':'Next month',
        'Mês exibido':'Displayed month', 'Calendário acadêmico':'Academic calendar',
        'Abrir menu de navegação':'Open navigation menu', 'Recolher navegação':'Collapse navigation',
        'Abrir opções da conta':'Open account options', 'Prévia local':'Local preview',
        '· Dados fictícios em memória · Sem banco ou e-mail':'· Sample data in memory · No database or email'
    });
    const ES = {
        'Início':'Inicio', 'Meu espaço':'Mi espacio', 'Conteúdo':'Contenido', 'Tarefas':'Tareas',
        'Documentos':'Documentos', 'Configurações':'Configuración', 'Pessoas':'Personas', 'Turmas':'Clases',
        'Minhas turmas':'Mis clases', 'Administração':'Administración', 'Gerenciar aplicativo':'Administrar aplicación',
        'Avisos e notícias':'Avisos y noticias', 'Notícias e avisos':'Noticias y avisos', 'Pesquisar':'Buscar',
        'Pesquisar áreas do portal':'Buscar secciones del portal', 'Meu painel':'Mi panel', 'Minha conta':'Mi cuenta',
        'Meus documentos':'Mis documentos', 'Materiais públicos':'Materiales públicos', 'Revisão de publicação':'Revisión de publicación',
        'Biblioteca de estudo':'Biblioteca de estudio', 'Adicionar documento':'Añadir documento', 'Adicionar pasta':'Añadir carpeta',
        'Buscar material':'Buscar material', 'Nova tarefa':'Nueva tarea', 'A fazer':'Por hacer', 'Tudo':'Todo', 'Atrasadas':'Atrasadas',
        'Próximos 7 dias':'Próximos 7 días', 'Criar tarefa':'Crear tarea', 'Adicionar':'Añadir', 'Situação':'Estado',
        'Quadro':'Tarjetas', 'Tabela':'Tabla', 'Lista':'Lista', 'Filtros':'Filtros', 'Todas':'Todas', 'Todos':'Todos',
        'Sair':'Cerrar sesión', 'Salvar':'Guardar', 'Cancelar':'Cancelar', 'Fechar':'Cerrar', 'Perfil':'Perfil',
        'Conta e segurança':'Cuenta y seguridad', 'Aparência':'Apariencia', 'Seus dados':'Tus datos',
        'Notificações':'Notificaciones', 'Compartilhamento':'Compartir', 'Correção de nome':'Corrección de nombre',
        'Tentar novamente':'Intentar de nuevo', 'Próximo compromisso':'Próximo evento', 'PRÓXIMO COMPROMISSO':'PRÓXIMO EVENTO',
        'Abrir calendário':'Abrir calendario', 'Próximas datas':'Próximas fechas', 'Documentos solicitados':'Documentos solicitados',
        'Minhas disciplinas':'Mis asignaturas', 'Ver turmas':'Ver clases', 'Ver todos os avisos':'Ver todos los avisos',
        'Termos de Uso':'Términos de uso', 'Termos de uso':'Términos de uso', 'Política de Privacidade':'Política de privacidad',
        'Política de privacidade':'Política de privacidad', 'Política de Cookies':'Política de cookies',
        'Preferências de cookies':'Preferencias de cookies', 'Cookies e sua privacidade':'Cookies y tu privacidad',
        'Aceitar':'Aceptar', 'Rejeitar':'Rechazar', 'Entrar':'Iniciar sesión', 'Criar conta':'Crear cuenta',
        'Plataforma':'Plataforma', 'Notícias':'Noticias', 'Para quem':'Para quién', 'Como funciona':'Cómo funciona',
        'Dúvidas':'Preguntas', 'Idioma':'Idioma', 'Mapa do campus':'Mapa del campus', 'Projetos':'Proyectos',
        'Projetos da comunidade':'Proyectos de la comunidad', 'Mais informações →':'Más información →',
        'Tarefas desta semana':'Tareas de esta semana', 'seg a dom':'lun a dom',
        'Olá,':'Hola,',
        'Entregas no prazo seguidas':'Entregas consecutivas a tiempo', 'seguida':'consecutiva', 'seguidas':'consecutivas',
        'SEM DATA':'SIN FECHA', 'Sem data':'Sin fecha', 'MAIS TARDE':'MÁS ADELANTE', 'HOJE':'HOY', 'ATRASADAS':'ATRASADAS',
        'Marcar como lidos':'Marcar como leídos', 'em andamento':'en curso', 'dia todo':'todo el día',
        'Hoje':'Hoy', 'hoje':'hoy', 'Amanhã':'Mañana', 'amanhã':'mañana',
        'Seg':'Lun', 'Ter':'Mar', 'Qua':'Mié', 'Qui':'Jue', 'Sex':'Vie', 'Sáb':'Sáb', 'Dom':'Dom',
        'Segunda':'Lunes', 'Terça':'Martes', 'Quarta':'Miércoles', 'Quinta':'Jueves', 'Sexta':'Viernes', 'Sábado':'Sábado', 'Domingo':'Domingo',
        'JAN':'ENE', 'FEV':'FEB', 'MAR':'MAR', 'ABR':'ABR', 'MAI':'MAY', 'JUN':'JUN', 'JUL':'JUL', 'AGO':'AGO', 'SET':'SEP', 'OUT':'OCT', 'NOV':'NOV', 'DEZ':'DIC',
        'Eventos':'Eventos', 'Acadêmico':'Académico', 'Matrículas':'Matrículas', 'Nenhuma tarefa':'No hay tareas',
        'Nada vence hoje. Bom momento pra adiantar o que vem pela frente.':'Hoy no vence nada. Es un buen momento para adelantar lo que viene.',
        'Tudo em dia por aqui. Aproveite o dia!':'¡Todo al día! Disfruta del día.',
        'te esperando.':'te esperan.', 'no calendário':'en el calendario', 'pra hoje':'para hoy', 'Hoje você tem':'Hoy tienes',
        'Zerou tudo por aqui!':'¡Todo terminado!', 'Nenhuma tarefa pendente. Que tal planejar a próxima semana?':'No hay tareas pendientes. ¿Qué tal planificar la próxima semana?',
        'Ver avisos':'Ver avisos', 'Ver tarefas':'Ver tareas', 'Ver documentos':'Ver documentos', 'Enviar projeto':'Enviar proyecto',
        'Criar publicação':'Crear publicación', 'Exportar CSV':'Exportar CSV', 'Editar':'Editar', 'Excluir':'Eliminar',
        'Baixar':'Descargar', 'Iniciar':'Iniciar', 'Concluir':'Completar', 'Adicionar tarefa':'Añadir tarea',
        'Editar tarefa':'Editar tarea', 'Iniciar tarefa':'Iniciar tarea', 'Concluir tarefa':'Completar tarea',
        'Pesquisar notícias e avisos':'Buscar noticias y avisos', 'Buscar avisos...':'Buscar avisos...',
        'Adicionar tarefa e pressionar Enter':'Añadir tarea y pulsar Intro', 'Responsável':'Responsable',
        'Nenhum documento solicitado ainda.':'Todavía no hay documentos solicitados.', 'Solicitar':'Solicitar',
        'Ordenar por':'Ordenar por', 'Mais recentes':'Más recientes', 'Mais antigos':'Más antiguos',
        'Prazo mais próximo':'Fecha límite más próxima', 'Título A–Z':'Título A–Z', 'Título Z–A':'Título Z–A',
        'Publicado':'Publicado', 'Rascunho':'Borrador', 'Arquivado':'Archivado', 'Notícia':'Noticia', 'Aviso':'Aviso',
        'Abrir publicação':'Abrir publicación', 'Ler publicação completa':'Leer publicación completa', 'Buscar projetos':'Buscar proyectos',
        'Pesquisa':'Investigación', 'Extensão':'Extensión', 'Ensino':'Enseñanza', 'Inovação':'Innovación',
        'Ativo':'Activo', 'Encerrado':'Finalizado', 'Em seleção':'En selección', 'Em andamento':'En curso',
        'Fundo':'Fondo', 'Texto':'Texto', 'Estilo':'Estilo', 'Personalizado':'Personalizado', 'Padrão do site':'Predeterminado del sitio',
        'Aparência do banner':'Apariencia del banner', 'Aplicar degradê suave':'Aplicar degradado suave',
        'Ajustar automaticamente a cor do texto':'Ajustar automáticamente el color del texto',
        'Nenhum evento encontrado.':'No se encontraron eventos.', 'Mês anterior':'Mes anterior', 'Próximo mês':'Mes siguiente',
        'Mês exibido':'Mes mostrado', 'Calendário':'Calendario', 'Calendário acadêmico':'Calendario académico',
        'Abrir menu de navegação':'Abrir menú de navegación', 'Recolher navegação':'Contraer navegación',
        'Abrir opções da conta':'Abrir opciones de la cuenta', 'Prévia local':'Vista previa local',
        '· Dados fictícios em memória · Sem banco ou e-mail':'· Datos de ejemplo en memoria · Sin base de datos ni correo',
        'Notícias e avisos do campus':'Noticias y avisos del campus',
        'E-mail':'Correo electrónico', 'Senha':'Contraseña', 'Manter conectado':'Mantener sesión iniciada',
        'Esqueci minha senha':'Olvidé mi contraseña', 'Bem-vindo de volta':'Bienvenido de nuevo',
        'Informe os dados da sua conta':'Introduce los datos de tu cuenta', 'Entrar com Google':'Iniciar sesión con Google',
        'Aluno':'Estudiante', 'Alunos':'Estudiantes', 'Professor':'Profesor', 'Professores':'Profesores',
        'Servidor':'Personal', 'Servidores':'Personal', 'Público externo':'Público externo', 'Comunidade externa':'Comunidad externa',
        'Título':'Título', 'Resumo':'Resumen', 'Descrição':'Descripción', 'Texto completo':'Texto completo',
        'Categoria':'Categoría', 'Prazo':'Fecha límite', 'Vagas':'Plazas', 'Tipo':'Tipo', 'Referência':'Referencia'
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

    function traduzirModelo(chave) {
        const es = idioma === 'es';
        if (chave === '1 aviso novo') return es ? '1 aviso nuevo' : '1 new notice';
        if (chave === '1 compromisso') return es ? '1 evento' : '1 event';
        if (chave === '1 entrega') return es ? '1 entrega' : '1 submission';
        const modelos = [
            [/^de (\d+) concluídas$/, es ? 'de $1 completadas' : 'of $1 completed'],
            [/^em (\d+) dias$/, es ? 'en $1 días' : 'in $1 days'],
            [/^(\d+) avisos? novos?$/, es ? '$1 avisos nuevos' : '$1 new notices'],
            [/^(\d+) compromissos?$/, es ? '$1 eventos' : '$1 events'],
            [/^(\d+) entregas?$/, es ? '$1 entregas' : '$1 submissions'],
            [/^(\d+) tarefas? atrasadas?$/, es ? '$1 tareas atrasadas' : '$1 overdue tasks'],
            [/^Exibindo (\d+) tarefas?$/, es ? 'Mostrando $1 tareas' : 'Showing $1 tasks'],
            [/^(\d+) publicações$/, es ? '$1 publicaciones' : '$1 posts'],
            [/^(\d+) de (\d+) projetos?$/, es ? '$1 de $2 proyectos' : '$1 of $2 projects'],
            [/^recorde: (\d+)$/, es ? 'récord: $1' : 'best: $1'],
            [/^(Domingo|Segunda|Terça|Quarta|Quinta|Sexta|Sábado): hoje$/, null],
            [/^(Editar|Excluir|Iniciar|Concluir|Baixar)( tarefa| documento| projeto| publicação)?: (.+)$/, null]
        ];
        for (const [padrao, troca] of modelos) {
            const match = chave.match(padrao);
            if (!match) continue;
            if (troca) return chave.replace(padrao, troca);
            if (chave.endsWith(': hoje')) return (es ? ES : EN)[match[1]] + (es ? ': hoy' : ': today');
            return (es ? ES : EN)[match[1]] + ': ' + match[3];
        }
        const dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
        const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        const data = chave.toLowerCase().match(/^(domingo|segunda(?:-feira)?|terça(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado), (\d{1,2}) de ([a-zç]+)(?: de (\d{4}))?$/);
        if (data && meses.includes(data[3])) {
            const weekday = dias.indexOf(data[1].replace('-feira',''));
            const wd = (es ? ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[weekday];
            const month = (es ? ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'] : ['January','February','March','April','May','June','July','August','September','October','November','December'])[meses.indexOf(data[3])];
            return es ? wd + ', ' + data[2] + ' de ' + month + (data[4] ? ' de ' + data[4] : '') : wd + ', ' + month + ' ' + data[2] + (data[4] ? ', ' + data[4] : '');
        }
        return null;
    }

    /* O motor do navegador trabalha no dispositivo; não envia textos a um servidor. */
    let motorLocal = null, idiomaMotor = '', preparando = '', versaoIdioma = 0;
    let filaLocal = Promise.resolve();
    const cacheLocal = new Map();
    function informarTraducao(message, retry = false) {
        let area = document.querySelector('.ar-i18n-status');
        if (!area) {
            area = document.createElement('li');
            area.className = 'ar-i18n-status';
            document.getElementById('langMenu')?.append(area);
        }
        area.replaceChildren();
        const text = document.createElement('p');
        text.setAttribute('role','status');
        text.textContent = message;
        area.append(text);
        if (retry) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = idioma === 'es' ? 'Traducir en este dispositivo' : 'Translate on this device';
            button.onclick = () => prepararLocal(true);
            area.append(button);
        }
    }
    async function prepararLocal(gesto = false) {
        const alvo = idioma;
        if (alvo === 'pt' || preparando === alvo || idiomaMotor === alvo && motorLocal) return;
        if (!window.Translator) {
            informarTraducao(alvo === 'es' ? 'Este navegador no ofrece traducción local. Se conserva el contenido original.' : 'This browser does not offer local translation. Original content is preserved.');
            return;
        }
        preparando = alvo;
        try {
            const options = { sourceLanguage:'pt', targetLanguage:alvo };
            const available = await window.Translator.availability(options);
            if (available === 'unavailable') throw Error('unavailable');
            if (!gesto && available !== 'available') {
                informarTraducao(alvo === 'es' ? 'Activa la traducción local para descargar el idioma.' : 'Enable local translation to download the language.', true);
                return;
            }
            informarTraducao(alvo === 'es' ? 'Preparando traducción local…' : 'Preparing local translation…');
            const engine = await window.Translator.create(options);
            if (idioma !== alvo) { engine.destroy?.(); return; }
            motorLocal?.destroy?.();
            motorLocal = engine;
            idiomaMotor = alvo;
            informarTraducao(alvo === 'es' ? 'Traducción automática en este dispositivo. Elige PT para ver el original.' : 'Automatic translation on this device. Choose PT to view the original.');
            traduzirArvore(document.body);
        } catch (failure) {
            if (idioma !== alvo) return;
            informarTraducao(alvo === 'es' ? 'Traducción local no disponible. El contenido original se conserva.' : 'Local translation is unavailable. Original content is preserved.', failure?.name === 'NotAllowedError');
        } finally { if (preparando === alvo) preparando = ''; }
    }
    function traduzirLocal(original, aplicarResultado) {
        if (!motorLocal || idiomaMotor !== idioma || !original.trim() || /^[\d\s\W]+$/.test(original) || /https?:\/\/|\S+@\S+/.test(original)) return;
        const version = versaoIdioma, engine = motorLocal, lang = idioma;
        const key = lang + ':' + original;
        if (cacheLocal.has(key)) { aplicarResultado(cacheLocal.get(key)); return; }
        filaLocal = filaLocal.catch(() => {}).then(async () => {
            if (version !== versaoIdioma || lang !== idioma) return;
            const translated = cacheLocal.get(key) || await engine.translate(original);
            if (typeof translated !== 'string' || !translated.trim()) return;
            if (cacheLocal.size >= 500) cacheLocal.delete(cacheLocal.keys().next().value);
            cacheLocal.set(key, translated);
            if (version === versaoIdioma && lang === idioma) aplicarResultado(translated);
        }).catch(() => { /* Falha mantém o original, sem confirmar uma tradução incompleta. */ });
    }

    // Tradução de um texto em português para o idioma atual (null = sem tradução).
    function traduzir(pt) {
        if (idioma === 'pt') return pt;
        const chave = normalizar(pt);
        const dictionary = idioma === 'es' ? ES : EN;
        if (Object.prototype.hasOwnProperty.call(dictionary, chave)) return dictionary[chave];
        const model = traduzirModelo(chave);
        if (model !== null) return model;
        if (idioma === 'en') for (const [padrao, troca] of PADROES_EN) if (padrao.test(chave)) return chave.replace(padrao, troca);
        return cacheLocal.get(idioma + ':' + pt) || null;
    }
    // Mantém os espaços das pontas do texto original (ex.: " Sua escolha…").
    function comEspacos(original, traduzido) {
        return original.match(/^\s*/)[0] + traduzido + original.match(/\s*$/)[0];
    }

    // Partes tratadas à parte: títulos divididos em palavras, hero e o próprio seletor.
    const IGNORAR = 'script, style, textarea, input, code, pre, [contenteditable], [translate="no"], [data-reveal], .hero-title, .lang-switch, .nav-mobile-lang, .phone-week, #painelUserGreeting, .ar-user-name, .ar-account-visible-name, .ar-brand, .wordmark, #gridPessoas .ar-card-title';

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
        if (traducao === null && idioma !== 'pt') traduzirLocal(reg.original, translated => {
            if (!no.isConnected || textos.get(no) !== reg || no.textContent !== reg.escrito) return;
            const next = comEspacos(reg.original, translated);
            if (no.textContent === next) return;
            reg.escrito = next;
            no.textContent = reg.escrito;
        });
    }

    // ---- Atributos --------------------------------------------------------------
    const atributos = new WeakMap(); // elemento → { [atributo]: { original, escrito } }
    function traduzirAtributo(el, nome) {
        if (el.closest(IGNORAR) && !el.matches('[data-reveal], .hero-title, input, textarea')) return;
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
        if (traducao === null && idioma !== 'pt') traduzirLocal(reg.original, translated => {
            if (!el.isConnected || el.getAttribute(nome) !== reg.escrito) return;
            if (el.getAttribute(nome) === translated) return;
            reg.escrito = translated;
            el.setAttribute(nome, translated);
        });
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
    const heroPt = hero ? Array.from(hero.querySelectorAll('.w-in')).map((w) => w.textContent) : [];
    let heroIdioma = 'pt';
    function aplicarHero() {
        if (!hero || heroIdioma === idioma) return false;
        const palavras = idioma === 'pt' ? heroPt : (idioma === 'es' ? 'Noticias, avisos y eventos en un solo lugar.' : HERO_EN).split(' ');
        hero.innerHTML = palavras
            .map((p, i) => `<span class="w"><span class="w-in" style="--i: ${i}">${p}</span></span>`)
            .join(' ');
        heroIdioma = idioma;
        return true;
    }

    // ---- Dias da semana do calendário ----------------------------------------------
    const semana = Array.from(document.querySelectorAll('.phone-week:not(.phone-days) span'));
    const semanaPt = semana.map((s) => s.textContent);
    function aplicarSemana() {
        semana.forEach((s, i) => {
            s.textContent = idioma === 'pt' ? semanaPt[i] : (idioma === 'es' ? ['D','L','M','X','J','V','S'] : SEMANA_EN)[i] || semanaPt[i];
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
        if (rotuloMobile) rotuloMobile.textContent = idioma === 'en' ? EN.Idioma : 'Idioma';
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
        document.title = idioma === 'pt' ? tituloPt : ((idioma === 'es' ? ES : EN)[tituloPt] || (tituloPt.includes('IFPA Campus Belém') ? (idioma === 'es' ? 'Arcadia — Portal del IFPA Campus Belém' : TITULO_PAGINA_EN) : tituloPt));
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
        versaoIdioma++;
        if (idioma === 'pt') { motorLocal?.destroy?.(); motorLocal = null; idiomaMotor = ''; document.querySelector('.ar-i18n-status')?.remove(); }
        else prepararLocal(true);
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
        /* Completa os seletores existentes no Início e no tutorial sem duplicá-los. */
        const menuIdiomas = document.getElementById('langMenu');
        if (menuIdiomas && !menuIdiomas.querySelector('[data-lang="es"]')) {
            const item = document.createElement('li'), option = document.createElement('button');
            option.type = 'button'; option.dataset.lang = 'es'; option.lang = 'es'; option.textContent = 'Español';
            item.append(option); menuIdiomas.append(item);
        }
        const menuMobile = document.querySelector('.nav-mobile-lang');
        if (menuMobile && !menuMobile.querySelector('[data-lang="es"]')) {
            const option = document.createElement('button');
            option.type = 'button'; option.className = 'lang-chip'; option.dataset.lang = 'es'; option.lang = 'es'; option.textContent = 'ES';
            menuMobile.append(option);
        }
        aplicar();
        if (idioma !== 'pt') prepararLocal(false);
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

    window.addEventListener('storage', function(event) {
        if (event.key !== CHAVE) return;
        idioma = lerPreferencia(); versaoIdioma++;
        motorLocal?.destroy?.(); motorLocal = null; idiomaMotor = '';
        aplicar();
        if (idioma !== 'pt') prepararLocal(false);
        else document.querySelector('.ar-i18n-status')?.remove();
    });

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
