/* Configurações: cartão de perfil no estilo da página de perfil do GitHub.
   Mostra o nome completo embaixo do primeiro nome, o e-mail da conta na lista de
   informações e o botão "Editar perfil", que leva aos campos de Seus dados. */
(function () {
    'use strict';
    function init() {
        const name = document.getElementById('confProfileName');
        const handle = document.getElementById('confProfileHandle');
        if (!name || !handle) return;
        const emailItem = document.getElementById('confProfileEmailItem');
        const email = document.getElementById('confProfileEmail');
        function fill() {
            const account = window.Arcadia?.auth?.getSessao?.() || {};
            const full = String(account.nome || '').trim();
            handle.textContent = full && full !== name.textContent.trim() ? full : '';
            handle.hidden = !handle.textContent;
            const address = String(account.email || account.emailPessoal || '').trim();
            if (email) email.textContent = address;
            if (emailItem) emailItem.hidden = !address;
        }
        /* O script da página atualiza o nome depois de buscar o perfil no servidor. */
        new MutationObserver(fill).observe(name, { childList: true, characterData: true, subtree: true });
        fill();
        document.getElementById('btnEditarPerfil')?.addEventListener('click', () => {
            const target = document.getElementById('dados');
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.setTimeout(() => {
                document.getElementById('campoNomeSocial')?.focus({ preventScroll: true });
            }, 350);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
