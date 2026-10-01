// landing.js: interface das páginas públicas (landing, login, cadastro)
(function () {
    'use strict';

    function iniciar() {
        // Menu mobile
        const navToggle = document.getElementById('navToggle');
        const navLinks = document.getElementById('navLinks');
        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => navLinks.classList.toggle('aberto'));
            navLinks.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') navLinks.classList.remove('aberto');
            });
        }

        // Animação das ilustrações
        const ilus = document.querySelectorAll('.ilu');
        if (ilus.length) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -10% 0px' });
            ilus.forEach((el) => observer.observe(el));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();