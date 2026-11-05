/* Ajuda contextual: orientações curtas junto ao conteúdo, sem ocupar a barra superior. */
(function (root, factory) {
    const help = factory();
    if (typeof module === 'object' && module.exports) module.exports = help;
    else {
        root.Arcadia = root.Arcadia || {};
        root.Arcadia.pageHelp = help;
        const mount = () => help.mount(document);
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
        else mount();
        document.addEventListener('arcadia:page-loaded', mount);
    }
})(typeof window === 'undefined' ? {} : window, function () {
    'use strict';
    const topics = {
        'dashboard.html': [
            'Meu painel',
            'Consulte tarefas abertas, solicitações e próximas datas. Use os atalhos dos cartões para abrir a área correspondente.'
        ],
        'notices.html': [
            'Avisos e notícias',
            'Use a busca desta aba para encontrar publicações. Em Filtros, refine categoria, público e situação. Quadro, tabela e lista mostram os mesmos resultados.'
        ],
        'notice.html': [
            'Publicação',
            'Confira o texto completo, a autoria e a data. Editar ou excluir aparece somente para quem tem autorização.'
        ],
        'projects.html': [
            'Projetos',
            'Busque por título, descrição ou responsável. Combine a busca com eixo e situação em Filtros. As opções de envio e inscrição dependem do projeto e da sua conta.'
        ],
        'calendar.html': [
            'Calendário',
            'Escolha o dia para consultar seus eventos. Use Filtros para mudar as opções do calendário. Cores ajudam a distinguir categorias; os nomes também identificam cada tipo de evento.'
        ],
        'tasks.html': [
            'Tarefas',
            'Organize suas tarefas e confira os prazos. Busca, filtros e modos de visualização ajudam a encontrar o que precisa fazer. Lembretes não confirmam entrega de e-mail.'
        ],
        'documents.html': [
            'Documentos',
            'A biblioteca reúne arquivos e links. Solicitações acadêmicas ficam em uma área separada. Os limites e as instruções aparecem ao adicionar um documento.'
        ],
        'classes.html': [
            'Turmas',
            'Selecione uma turma e uma disciplina para consultar conteúdos e horários. O acesso depende do seu vínculo. O ? nos horários explica os controles da grade.'
        ],
        'people.html': [
            'Pessoas',
            'Encontre pessoas pelos filtros de vínculo. Contatos e fotos aparecem conforme as opções de compartilhamento de cada conta.'
        ],
        'settings.html': [
            'Configurações',
            'Use as seções para editar conta, compartilhamento e aparência. Correção do nome completo exige solicitação; mudanças de aparência não alteram o conteúdo de outras pessoas.'
        ],
        'community.html': [
            'Meu painel externo',
            'Acesse suas tarefas e conteúdos disponíveis para a comunidade externa. Um pedido de vínculo institucional depende de conferência administrativa.'
        ],
        'community-settings.html': [
            'Configurações da conta externa',
            'Edite os dados disponíveis, confira seu e-mail e acompanhe solicitações de vínculo. Nome completo tem fluxo próprio de correção.'
        ],
        'campus-map.html': [
            'Mapa do campus',
            'Busque um bloco ou setor. Use o mapa ou a lista de locais. O ? nos controles explica ampliação e navegação; informações a confirmar são identificadas.'
        ],
        'admin.html': [
            'Administração',
            'Escolha Pessoas e conteúdo, Requisitos ou Turmas. Confira o vínculo solicitado antes de aprovar. Desativar preserva histórico; excluir definitivamente remove dados vinculados.'
        ]
    };
    const forPage = (page) => topics[page] || null;
    function mount(scope = document) {
        const page = location.pathname.split('/').pop();
        const topic = forPage(page);
        if (!topic) return;
        const region = scope.querySelector('.ar-hero, .ar-detail, .admin-intro');
        if (!region || region.querySelector('[data-page-help]')) return;
        let host = region.querySelector('.ar-hero-actions');
        if (!host) {
            host = document.createElement('div');
            host.className = 'ar-hero-actions ar-page-help-actions';
            (region.querySelector('.ar-hero-side') || region).append(host);
        }
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ar-btn ar-page-help';
        trigger.dataset.pageHelp = page;
        trigger.textContent = '?';
        trigger.title = 'Ajuda sobre ' + topic[0];
        trigger.setAttribute('aria-label', trigger.title);
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.addEventListener('click', () => {
            if (document.querySelector('[data-page-help-dialog]')) return;
            const dialog = document.createElement('dialog');
            dialog.className = 'ar-dialog ar-page-help-dialog';
            dialog.dataset.pageHelpDialog = 'true';
            const title = document.createElement('h2');
            title.id = 'pageHelpTitle';
            title.textContent = topic[0] + ' — ajuda';
            dialog.setAttribute('aria-labelledby', title.id);
            const description = document.createElement('p');
            description.textContent = topic[1];
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'ar-btn ar-btn--secondary';
            close.textContent = 'Fechar';
            close.addEventListener('click', () => dialog.close());
            dialog.addEventListener(
                'close',
                () => {
                    dialog.remove();
                    if (trigger.isConnected) trigger.focus({ preventScroll: true });
                },
                { once: true }
            );
            dialog.append(title, description, close);
            document.body.append(dialog);
            if (window.Arcadia.dialogShell) window.Arcadia.dialogShell.open(dialog);
            else dialog.showModal();
        });
        host.append(trigger);
    }
    return { forPage, mount };
});
