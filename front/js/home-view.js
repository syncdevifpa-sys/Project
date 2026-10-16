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
        const about = new URLSearchParams(location.search).get('sobre') === '1';
        document.documentElement.dataset.homeView = about
            ? 'about'
            : connected
              ? 'connected'
              : 'visitor';
        document.documentElement.dataset.homeConnected = String(connected);
    }
    update();
    window.addEventListener('storage', update);
    window.ArcadiaHomeView = update;
})();
