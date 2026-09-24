/**
 * Arcádia IFPA Campus Belém — Interações da Landing Page
 * Efeitos de movimento: Rolagem suave com inércia, inclinação 3D da hero,
 * revelação de seções, rastreamento de navegação ativa e acordeão acessível.
 */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =========================================================================
  // 1. Rolagem Suave com Inércia (Mouse Wheel Lerp)
  // =========================================================================
  function initSmoothInertiaScroll() {
    if (reducedMotion) return;

    // Apenas em desktops/laptops com roda de mouse (ignora toque móvel)
    var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice && window.innerWidth <= 768) return;

    var currentY = window.pageYOffset || document.documentElement.scrollTop;
    var targetY = currentY;
    var isScrolling = false;
    var lerpFactor = 0.075; // Suave e macio conforme especificação

    function clampTarget(y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return Math.max(0, Math.min(y, max));
    }

    function update() {
      var diff = targetY - currentY;
      if (Math.abs(diff) > 0.4) {
        currentY += diff * lerpFactor;
        window.scrollTo(0, currentY);
        requestAnimationFrame(update);
      } else {
        currentY = targetY;
        window.scrollTo(0, currentY);
        isScrolling = false;
      }
    }

    window.addEventListener('wheel', function (e) {
      // Não interceptar se Ctrl estiver pressionado (zoom) ou shift (scroll horizontal)
      if (e.ctrlKey || e.shiftKey || e.altKey) return;

      // Não interceptar se o usuário estiver rolando dentro de um elemento com scroll próprio
      var target = e.target;
      while (target && target !== document.body) {
        if (target.scrollHeight > target.clientHeight) {
          var overflowY = window.getComputedStyle(target).overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll') return;
        }
        target = target.parentElement;
      }

      e.preventDefault();
      targetY = clampTarget(targetY + e.deltaY * 0.9);

      if (!isScrolling) {
        isScrolling = true;
        currentY = window.pageYOffset || document.documentElement.scrollTop;
        requestAnimationFrame(update);
      }
    }, { passive: false });

    // Sincronizar ao redimensionar ou rolar via barra de rolagem
    window.addEventListener('scroll', function () {
      if (!isScrolling) {
        currentY = window.pageYOffset || document.documentElement.scrollTop;
        targetY = currentY;
      }
    }, { passive: true });
  }

  // =========================================================================
  // 2. Janela da Hero que se Endireita com o Scroll (Efeito 3D)
  // =========================================================================
  function initHeroTiltEffect() {
    var frame = document.getElementById('heroBrowserFrame');
    if (!frame || reducedMotion) return;

    function onScroll() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      var p = Math.min(1, Math.max(0, scrollY / 560));
      var e = 1 - Math.pow(1 - p, 2); // easing quadrático

      var rotX = 14 * (1 - e);
      var scale = 0.96 + 0.04 * e;

      frame.style.transform = 'perspective(1800px) rotateX(' + rotX.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    }

    window.addEventListener('scroll', function () {
      requestAnimationFrame(onScroll);
    }, { passive: true });

    onScroll();
  }

  // =========================================================================
  // 3. Navbar com Sombra Dinâmica e Rastreamento de Seções (IntersectionObserver)
  // =========================================================================
  function initNavbar() {
    var navbar = document.getElementById('mainNavbar');
    var navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    var mobileToggle = document.getElementById('navMobileToggle');
    var mobilePanel = document.getElementById('navMobilePanel');

    // Sombra da Navbar no Scroll
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (navbar) {
        if (y > 16) {
          navbar.classList.add('is-scrolled');
        } else {
          navbar.classList.remove('is-scrolled');
        }
      }
    }, { passive: true });

    // Menu Mobile
    if (mobileToggle && mobilePanel) {
      mobileToggle.addEventListener('click', function () {
        var isOpen = mobilePanel.classList.toggle('is-open');
        mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Fechar menu mobile ao clicar em um link
      mobilePanel.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          mobilePanel.classList.remove('is-open');
          mobileToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Scroll Suave para Âncoras
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        var targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          var offset = 80;
          var targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });

    // Rastrear Seção Ativa (Active Dot)
    var sections = document.querySelectorAll('section[id]');
    if ('IntersectionObserver' in window && sections.length > 0) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
              } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
              }
            });
          }
        });
      }, {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      });

      sections.forEach(function (s) { observer.observe(s); });
    }
  }

  // =========================================================================
  // 4. Revelação Suave ao Rolar (Fade-up 36px com Stagger)
  // =========================================================================
  function initRevealOnScroll() {
    var items = document.querySelectorAll('.reveal-item');
    if (items.length === 0) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          // Efeito cascata para itens do mesmo container pai
          var siblings = el.parentElement ? el.parentElement.querySelectorAll('.reveal-item') : [];
          var idx = Array.prototype.indexOf.call(siblings, el);
          var delay = (idx >= 0 && idx < 4) ? idx * 110 : 0;

          setTimeout(function () {
            el.classList.add('is-revealed');
          }, delay);

          obs.unobserve(el);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.05
    });

    items.forEach(function (el) {
      // Se já estiver visível na janela logo ao carregar, revela direto
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-revealed');
      } else {
        observer.observe(el);
      }
    });
  }

  // =========================================================================
  // 5. Acordeão de Dúvidas Frequentes (FAQ Acessível)
  // =========================================================================
  function initFaqAccordion() {
    var triggers = document.querySelectorAll('.faq-trigger');

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var isExpanded = this.getAttribute('aria-expanded') === 'true';

        // Opcional: fechar outros ao abrir um
        triggers.forEach(function (t) {
          t.setAttribute('aria-expanded', 'false');
        });

        // Alternar atual
        this.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      });
    });
  }

  // =========================================================================
  // Inicialização Geral
  // =========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    initSmoothInertiaScroll();
    initHeroTiltEffect();
    initNavbar();
    initRevealOnScroll();
    initFaqAccordion();
  });

})();
