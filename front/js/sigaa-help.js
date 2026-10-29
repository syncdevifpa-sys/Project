// Exemplo esquemático com dados fictícios: não usa capturas de contas reais.
(function (A) {
    function mount(root = document) {
        for (const field of root.querySelectorAll('[data-sigaa-username]')) {
            if (field.dataset.sigaaHelp) continue;
            field.dataset.sigaaHelp = 'ready';
            const help = document.createElement('details');
            help.className = 'ar-sigaa-help';
            help.innerHTML = `<summary><span aria-hidden="true">?</span> Como encontrar meu usuário no SIGAA</summary>
<div class="ar-sigaa-help-body">
<ol><li>Entre no SIGAA.</li><li>Abra uma turma ou disciplina da qual você participa.</li><li>No menu lateral, clique em <strong>Participantes</strong>.</li><li>Encontre <strong>seu próprio nome</strong> na lista.</li><li>Copie exatamente o campo <strong>Usuário</strong> para o Arcádia.</li></ol>
<figure class="ar-sigaa-example"><figcaption>Exemplo ilustrativo · dados fictícios</figcaption><p>Turma › <strong>Participantes</strong> › Seu nome › <strong>Usuário</strong></p><dl><dt>Nome</dt><dd>Seu nome (exemplo)</dd><dt>Usuário</dt><dd><mark>usuario.exemplo</mark></dd></dl></figure>
<p>O usuário pode ser numérico, como <code>202600123</code>, ou textual, como <code>usuario.exemplo</code>. Não confunda com matrícula ou e-mail.</p>
<p>O layout pode variar conforme seu perfil no SIGAA. Se não encontrar a opção ou não tiver acesso, peça orientação à administração do Arcádia.</p>
<p><strong>Nunca informe sua senha do SIGAA.</strong> O acesso ao Arcádia continua sendo pelo e-mail ou Google vinculado.</p>
</div>`;
            help.addEventListener('keydown', (event) => {
                if (help.open && event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    help.open = false;
                    help.querySelector('summary').focus();
                }
            });
            (field.closest('.ar-input-group') || field.closest('label') || field).after(help);
        }
    }
    A.sigaaHelp = { mount };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => mount());
    else mount();
})((window.Arcadia = window.Arcadia || {}));
