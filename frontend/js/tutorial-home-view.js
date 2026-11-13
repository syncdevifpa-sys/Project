// Define a apresentação antes da primeira pintura; não concede permissões de acesso.
(function () {
    function update() {
        let connected = false;
        try {
            const session = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
            connected = Boolean(localStorage.getItem('arcadiaToken') && session.logado);
        } catch {
            /* Visitante quando não há sessão disponível. */
        }
        // Página de apresentação: com sessão, mostra o conteúdo e o link de volta ao Início.
        document.documentElement.dataset.homeView = connected ? 'about' : 'visitor';
        document.documentElement.dataset.homeConnected = String(connected);
    }
    update();
    window.addEventListener('storage', update);
    window.ArcadiaHomeView = update;
})();
