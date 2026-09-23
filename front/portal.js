/**
 * Arcádia Portal — Sistema de Interface & Comportamento Vanilla JS
 * Baseado no Design System Arcádia (IFPA Campus Belém)
 */

(function () {
  'use strict';

  var THEME_KEY = 'arcadia-theme';
  var root = document.documentElement;

  // Dicionário de ícones SVG do portal
  var ICONS = {
    'search': '<path d="m21 21-4.34-4.34" /> <circle cx="11" cy="11" r="8" />',
    'chevron-right': '<path d="m9 18 6-6-6-6" />',
    'chevron-down': '<path d="m6 9 6 6 6-6" />',
    'arrow-right': '<path d="M5 12h14" /> <path d="m12 5 7 7-7 7" />',
    'arrow-up-right': '<path d="M7 7h10v10" /> <path d="M7 17 17 7" />',
    'calendar': '<path d="M8 2v3" /> <path d="M16 2v3" /> <rect x="3" y="3" width="18" height="18" rx="2" /> <path d="M3 9h18" />',
    'clock': '<circle cx="12" cy="12" r="10" /> <path d="M12 6v6l4 2" />',
    'pin': '<path d="M12 17v5" /> <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />',
    'bell': '<path d="M10.268 21a2 2 0 0 0 3.464 0" /> <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />',
    'file-text': '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /> <path d="M14 2v5a1 1 0 0 0 1 1h5" /> <path d="M10 9H8" /> <path d="M16 13H8" /> <path d="M16 17H8" />',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <path d="M16 3.128a4 4 0 0 1 0 7.744" /> <path d="M22 21v-2a4 4 0 0 0-3-3.87" /> <circle cx="9" cy="7" r="4" />',
    'folder-kanban': '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /> <path d="M8 10v4" /> <path d="M12 10v2" /> <path d="M16 10v6" />',
    'x': '<path d="M18 6 6 18" /> <path d="m6 6 12 12" />',
    'check': '<path d="M20 6 9 17l-5-5" />',
    'plus': '<path d="M5 12h14" /> <path d="M12 5v14" />',
    'arrow-up-down': '<path d="m21 16-4 4-4-4" /> <path d="M17 20V4" /> <path d="m3 8 4-4 4 4" /> <path d="M7 4v16" />',
    'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1" /> <rect width="7" height="7" x="14" y="3" rx="1" /> <rect width="7" height="7" x="14" y="14" rx="1" /> <rect width="7" height="7" x="3" y="14" rx="1" />',
    'list': '<path d="M3 5h.01" /> <path d="M3 12h.01" /> <path d="M3 19h.01" /> <path d="M8 5h13" /> <path d="M8 12h13" /> <path d="M8 19h13" />',
    'table-2': '<path d="M3 9h18" /> <path d="M9 3v18" /> <rect x="3" y="3" width="18" height="18" rx="2" />',
    'flame': '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />',
    'sparkles': '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /> <path d="M20 2v4" /> <path d="M22 4h-4" /> <circle cx="4" cy="20" r="2" />',
    'log-out': '<path d="m16 17 5-5-5-5" /> <path d="M21 12H9" /> <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
    'download': '<path d="M12 15V3" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> <path d="m7 10 5 5 5-5" />',
    'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /> <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />',
    'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /> <path d="M22 10v6" /> <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />',
    'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /> <circle cx="12" cy="10" r="3" />',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /> <circle cx="12" cy="7" r="4" />',
    'settings-2': '<path d="M14 17H5" /> <path d="M19 7h-9" /> <circle cx="17" cy="17" r="3" /> <circle cx="7" cy="7" r="3" />',
    'megaphone': '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /> <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" /> <path d="M8 6v8" />',
    'circle-check-big': '<path d="M21.801 10A10 10 0 1 1 17 3.335" /> <path d="m9 11 3 3L22 4" />',
    'sun': '<circle cx="12" cy="12" r="4" /> <path d="M12 2v2" /> <path d="M12 20v2" /> <path d="m4.93 4.93 1.41 1.41" /> <path d="m17.66 17.66 1.41 1.41" /> <path d="M2 12h2" /> <path d="M20 12h2" /> <path d="m6.34 17.66-1.41 1.41" /> <path d="m19.07 4.93-1.41 1.41" />',
    'moon': '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />',
    'monitor': '<rect width="20" height="14" x="2" y="3" rx="2" /> <line x1="8" x2="16" y1="21" y2="21" /> <line x1="12" x2="12" y1="17" y2="21" />',
    'camera': '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" /> <circle cx="12" cy="13" r="3" />',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /> <path d="M7 11V7a5 5 0 0 1 10 0v4" />',
    'mail': '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /> <rect x="2" y="4" width="20" height="16" rx="2" />',
    'phone': '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />',
    'palette': '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /> <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /> <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /> <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /> <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path d="m9 12 2 2 4-4" />',
    'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /> <circle cx="12" cy="12" r="3" />',
    'circle-alert': '<circle cx="12" cy="12" r="10" /> <line x1="12" x2="12" y1="8" y2="12" /> <line x1="12" x2="12.01" y1="16" y2="16" />',
    'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /> <path d="M21 3v5h-5" /> <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /> <path d="M8 16H3v5" />',
    'undo-2': '<path d="M9 14 4 9l5-5" /> <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />'
  };

  function getIconSvg(name, size, strokeWidth) {
    size = size || 16;
    strokeWidth = strokeWidth || 2;
    var path = ICONS[name] || '';
    return '<svg class="ar-icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  // Renderizar ícones em elementos com [data-icon]
  function renderIcons(container) {
    var scope = container || document;
    scope.querySelectorAll('[data-icon]').forEach(function (el) {
      var name = el.getAttribute('data-icon');
      var size = parseInt(el.getAttribute('data-size') || '16', 10);
      var sw = parseFloat(el.getAttribute('data-sw') || '2');
      if (name && ICONS[name]) {
        el.innerHTML = getIconSvg(name, size, sw);
      }
    });
  }

  // Controle de tema claro/escuro e preferências visuais
  function applyTheme(mode) {
    var dark = false;
    try {
      if (mode) localStorage.setItem(THEME_KEY, mode);
      else mode = localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      mode = mode || 'light';
    }

    if (mode === 'auto') {
      dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      dark = (mode === 'dark');
    }

    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', mode);
    return mode;
  }

  // Listener para quando estiver em modo auto e o sistema operacional mudar
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      var curMode = 'light';
      try { curMode = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
      if (curMode === 'auto') {
        applyTheme('auto');
      }
    });
  }

  function applyAccent(tone) {
    if (tone) {
      root.setAttribute('data-accent', tone);
      try { localStorage.setItem(THEME_KEY + '-accent', tone); } catch (e) {}
    }
    return tone;
  }

  function applyTextSize(size) {
    if (size == null) {
      try { size = localStorage.getItem(THEME_KEY + '-text') || 'default'; } catch (e) { size = 'default'; }
    } else {
      try { localStorage.setItem(THEME_KEY + '-text', size); } catch (e) {}
    }
    if (size === 'large') root.setAttribute('data-text', 'large');
    else root.removeAttribute('data-text');
    return size;
  }

  function applyMotion(reduced) {
    if (reduced == null) {
      try { reduced = localStorage.getItem(THEME_KEY + '-motion') === 'reduced'; } catch (e) { reduced = false; }
    } else {
      try { localStorage.setItem(THEME_KEY + '-motion', reduced ? 'reduced' : 'full'); } catch (e) {}
    }
    if (reduced) root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    return !!reduced;
  }

  // Sistema de notificações toast com opção de desfazer
  var toastTimeout = null;
  function showToast(message, actionLabel, onAction, duration) {
    duration = duration || 5000;
    var existing = document.getElementById('ar-toast-global');
    if (existing) existing.remove();
    if (toastTimeout) clearTimeout(toastTimeout);

    var dock = document.getElementById('ar-toast-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'ar-toast-dock';
      dock.className = 'ar-toast-dock';
      dock.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:99; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
      document.body.appendChild(dock);
    }

    var toast = document.createElement('div');
    toast.id = 'ar-toast-global';
    toast.className = 'ar-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.pointerEvents = 'auto';

    var html = getIconSvg('check', 16) + '<span class="ar-toast-msg">' + message + '</span>';
    if (actionLabel && onAction) {
      html += '<button type="button" class="ar-toast-action" id="ar-toast-action-btn">' + actionLabel + '</button>';
    }
    html += '<button type="button" class="ar-iconbtn ar-iconbtn--sm" aria-label="Fechar aviso" id="ar-toast-close-btn">' + getIconSvg('x', 14) + '</button>';
    toast.innerHTML = html;

    dock.appendChild(toast);

    if (actionLabel && onAction) {
      var actionBtn = toast.querySelector('#ar-toast-action-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', function () {
          onAction();
          toast.remove();
          if (toastTimeout) clearTimeout(toastTimeout);
        });
      }
    }

    var closeBtn = toast.querySelector('#ar-toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        toast.remove();
        if (toastTimeout) clearTimeout(toastTimeout);
      });
    }

    toastTimeout = setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, duration);
  }

  // Sistema para abrir e fechar janelas modais
  function openDialog(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'grid';
    var input = modalEl.querySelector('input, textarea, button:not([aria-label="Fechar"])');
    if (input) setTimeout(function () { input.focus(); }, 50);
  }

  function closeDialog(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'none';
  }

  // Vincular fechamento de modais via botão de fechar e clique no fundo escuro (scrim)
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('ar-scrim')) {
      e.target.style.display = 'none';
    }
    var closeBtn = e.target.closest('[data-close-dialog]');
    if (closeBtn) {
      var scrim = closeBtn.closest('.ar-scrim');
      if (scrim) scrim.style.display = 'none';
    }
  });

  // Fechar no Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.ar-scrim').forEach(function (scrim) {
        if (scrim.style.display !== 'none') {
          scrim.style.display = 'none';
        }
      });
    }
  });

  // Paleta de comandos e busca rápida do portal (Ctrl+K / ⌘K)
  var PALETTE_DATA = [
    { type: 'Avisos', title: 'Período de matrícula 2026/2', meta: 'Avisos · Aluno · Prazo 27 set', desc: 'Confirme suas disciplinas pelo portal do estudante até o fim do prazo.', href: 'aviso.html', icon: 'bell' },
    { type: 'Avisos', title: 'Aulas suspensas no Bloco C', meta: 'Avisos · Manutenção elétrica · 09 set', desc: 'Manutenção elétrica no prédio. A coordenação já marcou a reposição.', href: 'avisos.html', icon: 'bell' },
    { type: 'Avisos', title: 'Bolsas de Iniciação Científica', meta: 'Avisos · Edital 012/2026 · Vagas 12', desc: 'Seleção de estudantes para projetos de pesquisa do campus.', href: 'aviso.html', icon: 'bell' },
    { type: 'Tarefas', title: 'Confirmar disciplinas do semestre', meta: 'Tarefas · Prazo 12 set · Aberta', desc: 'Acesse o sistema acadêmico para conferir os horários.', href: 'tarefas.html', icon: 'check' },
    { type: 'Tarefas', title: 'Entregar relatório de estágio', meta: 'Tarefas · Prazo 20 set · Em andamento', desc: 'Protocolar termo de encerramento assinado pela empresa.', href: 'tarefas.html', icon: 'check' },
    { type: 'Documentos', title: 'Histórico escolar completo', meta: 'Documentos · PDF emitido · 08 set', desc: 'Documento oficial com assinatura digital da secretaria.', href: 'documentos.html', icon: 'file-text' },
    { type: 'Documentos', title: 'Declaração de vínculo', meta: 'Documentos · Em análise · Previsão 15 set', desc: 'Para solicitação de passe escolar e estágio supervisionado.', href: 'documentos.html', icon: 'file-text' },
    { type: 'Projetos', title: 'Monitoramento da Qualidade das Águas', meta: 'Projetos · Pesquisa · 6 vagas', desc: 'Coleta de amostras na bacia do Guajará e análise laboratorial.', href: 'projetos.html', icon: 'folder-kanban' },
    { type: 'Calendário', title: 'Semana de Ciência e Tecnologia', meta: 'Calendário · 05 out · Auditório central', desc: 'Programação de palestras e minicursos.', href: 'calendario.html', icon: 'calendar' }
  ];

  function buildCommandPalette() {
    var scrim = document.getElementById('ar-command-palette-scrim');
    if (scrim) return scrim;

    scrim = document.createElement('div');
    scrim.id = 'ar-command-palette-scrim';
    scrim.className = 'ar-scrim';
    scrim.style.cssText = 'display:none; align-items:flex-start; padding-top:80px; z-index:100;';

    scrim.innerHTML = 
      '<div class="ar-pal" role="dialog" aria-label="Busca no portal">' +
        '<div class="ar-pal-top">' +
          '<label class="ar-search" style="width:100%">' +
            getIconSvg('search', 16) +
            '<span class="ar-sr">Buscar no portal</span>' +
            '<input type="search" id="ar-pal-input" placeholder="Buscar aviso, documento ou projeto" autocomplete="off">' +
            '<kbd class="ar-kbd">Esc</kbd>' +
          '</label>' +
          '<p class="ar-pal-hint">Tente "matrícula", "edital 012" ou o nome de uma pessoa.</p>' +
          '<div class="ar-chipbar" id="ar-pal-scopes" role="group" aria-label="Escopos de busca">' +
            '<button type="button" class="ar-chip" aria-pressed="true" data-scope="Tudo">Tudo</button>' +
            '<button type="button" class="ar-chip" aria-pressed="false" data-scope="Avisos">Avisos</button>' +
            '<button type="button" class="ar-chip" aria-pressed="false" data-scope="Tarefas">Tarefas</button>' +
            '<button type="button" class="ar-chip" aria-pressed="false" data-scope="Documentos">Documentos</button>' +
            '<button type="button" class="ar-chip" aria-pressed="false" data-scope="Projetos">Projetos</button>' +
          '</div>' +
        '</div>' +
        '<div class="ar-pal-body">' +
          '<div class="ar-pal-list" id="ar-pal-results" role="listbox"></div>' +
          '<div class="ar-pal-preview" id="ar-pal-preview">' +
            '<div class="ar-field-label" style="color:var(--on-field)" id="ar-pal-prev-eyebrow">Avisos</div>' +
            '<h4 id="ar-pal-prev-title">Selecione um item</h4>' +
            '<p id="ar-pal-prev-meta" style="margin-top:4px;">Use as setas para navegar</p>' +
            '<p id="ar-pal-prev-desc" style="margin-top:8px;"></p>' +
            '<span class="ar-pal-keys">' +
              '<kbd class="ar-kbd">Enter</kbd> abre ' +
              '<kbd class="ar-kbd">↑ ↓</kbd> navega' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(scrim);

    var input = scrim.querySelector('#ar-pal-input');
    var resultsEl = scrim.querySelector('#ar-pal-results');
    var prevEyebrow = scrim.querySelector('#ar-pal-prev-eyebrow');
    var prevTitle = scrim.querySelector('#ar-pal-prev-title');
    var prevMeta = scrim.querySelector('#ar-pal-prev-meta');
    var prevDesc = scrim.querySelector('#ar-pal-prev-desc');
    var activeScope = 'Tudo';
    var activeIndex = 0;
    var filteredItems = [];

    function updatePreview(item) {
      if (!item) {
        prevEyebrow.textContent = '';
        prevTitle.textContent = 'Nada selecionado';
        prevMeta.textContent = '';
        prevDesc.textContent = '';
        return;
      }
      prevEyebrow.textContent = item.type;
      prevTitle.textContent = item.title;
      prevMeta.textContent = item.meta;
      prevDesc.textContent = item.desc || '';
    }

    function renderResults() {
      var q = input.value.trim().toLowerCase();
      filteredItems = PALETTE_DATA.filter(function (it) {
        if (activeScope !== 'Tudo' && it.type !== activeScope) return false;
        if (!q) return true;
        return (it.title.toLowerCase().indexOf(q) > -1 || it.meta.toLowerCase().indexOf(q) > -1 || (it.desc && it.desc.toLowerCase().indexOf(q) > -1));
      });

      if (filteredItems.length === 0) {
        resultsEl.innerHTML = 
          '<div class="ar-empty ar-empty--compact">' +
            '<span class="ar-empty-icon">' + getIconSvg('search', 22) + '</span>' +
            '<div class="ar-empty-title">Nada encontrado para "' + input.value + '"</div>' +
            '<p class="ar-empty-desc">Confira a grafia ou busque por outra palavra. Avisos antigos ficam em Calendário.</p>' +
          '</div>';
        updatePreview(null);
        return;
      }

      if (activeIndex >= filteredItems.length) activeIndex = 0;

      // Agrupar por type
      var groups = {};
      filteredItems.forEach(function (it, idx) {
        if (!groups[it.type]) groups[it.type] = [];
        groups[it.type].push({ item: it, index: idx });
      });

      var html = '';
      Object.keys(groups).forEach(function (grp) {
        html += '<div class="ar-pal-group">' + grp + '</div>';
        groups[grp].forEach(function (pair) {
          var sel = pair.index === activeIndex;
          html += '<div class="ar-pal-item" role="option" tabIndex="0" data-idx="' + pair.index + '" aria-selected="' + (sel ? 'true' : 'false') + '">' +
            getIconSvg(pair.item.icon || 'bell', 16) +
            '<div style="min-width:0; flex:1;">' +
              '<b>' + pair.item.title + '</b>' +
              '<small style="display:block; color:var(--ink-muted); font-size:12px;">' + pair.item.meta + '</small>' +
            '</div>' +
          '</div>';
        });
      });

      resultsEl.innerHTML = html;
      updatePreview(filteredItems[activeIndex]);

      resultsEl.querySelectorAll('.ar-pal-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var idx = parseInt(el.getAttribute('data-idx'), 10);
          var it = filteredItems[idx];
          if (it && it.href) window.location.href = it.href;
        });
      });
    }

    input.addEventListener('input', function () {
      activeIndex = 0;
      renderResults();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredItems.length > 0) {
          activeIndex = (activeIndex + 1) % filteredItems.length;
          renderResults();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredItems.length > 0) {
          activeIndex = (activeIndex - 1 + filteredItems.length) % filteredItems.length;
          renderResults();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[activeIndex] && filteredItems[activeIndex].href) {
          window.location.href = filteredItems[activeIndex].href;
        }
      }
    });

    scrim.querySelectorAll('#ar-pal-scopes button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scrim.querySelectorAll('#ar-pal-scopes button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        activeScope = btn.getAttribute('data-scope');
        activeIndex = 0;
        renderResults();
      });
    });

    renderResults();
    return scrim;
  }

  function openCommandPalette() {
    var scrim = buildCommandPalette();
    scrim.style.display = 'grid';
    var input = scrim.querySelector('#ar-pal-input');
    if (input) {
      input.value = '';
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  // Atalho global ⌘K / Ctrl+K
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  });

  // Preenchimento dos dados do usuário na barra de navegação
  function updateUserAvatar(foto, userName, userInitials) {
    if (!userName) {
      try {
        var s = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
        userName = s.nome || 'Ana Ribeiro';
      } catch (e) {
        userName = 'Ana Ribeiro';
      }
    }
    if (!userInitials) {
      userInitials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || 'AR';
    }

    document.querySelectorAll('.ar-user .ar-avatar').forEach(function (el) {
      if (foto) {
        el.innerHTML = '<img src="' + foto + '" alt="' + userName + '" class="ar-avatar-img">';
      } else {
        el.textContent = userInitials;
      }
    });
  }

  function hydrateTopNav() {
    var sessao = {};
    try {
      sessao = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
    } catch (e) {}

    var userName = sessao.nome || 'Ana Ribeiro';
    var userRole = sessao.vinculo || 'Aluno';
    var userInitials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || 'AR';

    // Atualizar avatares e nomes
    document.querySelectorAll('.ar-user-name').forEach(function (el) { el.textContent = userName; });
    document.querySelectorAll('.ar-user-role').forEach(function (el) { el.textContent = userRole; });
    updateUserAvatar(sessao.foto, userName, userInitials);

    // Sincronização em segundo plano com backend se houver token
    var token = '';
    try { token = localStorage.getItem('arcadiaToken') || ''; } catch (e) {}
    if (token) {
      fetch('/api/auth/perfil', {
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function (res) {
        if (res.ok) return res.json();
      }).then(function (userData) {
        if (userData && userData.id) {
          var updated = Object.assign({}, sessao, userData);
          localStorage.setItem('arcadiaSessao', JSON.stringify(updated));
          if (updated.foto !== sessao.foto) {
            updateUserAvatar(updated.foto, updated.nome);
          }
        }
      }).catch(function () {});
    }

    // Botão de busca
    document.querySelectorAll('[data-search-trigger]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openCommandPalette();
      });
    });

    // Botão Sair
    document.querySelectorAll('[data-sign-out]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        try {
          fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {}
        localStorage.removeItem('arcadiaSessao');
        localStorage.removeItem('arcadiaToken');
        window.location.href = 'login.html';
      });
    });
  }

  // Alternador de visualização entre lista, quadro e tabela
  function setupViewToolbar() {
    document.querySelectorAll('.ar-toolbar .ar-seg').forEach(function (seg) {
      var buttons = seg.querySelectorAll('button');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          var view = btn.getAttribute('data-view') || btn.textContent.trim().toLowerCase();
          
          var container = document.getElementById('view-container');
          if (!container) return;

          container.querySelectorAll('[data-view-panel]').forEach(function (panel) {
            if (panel.getAttribute('data-view-panel') === view) {
              panel.style.display = 'block';
            } else {
              panel.style.display = 'none';
            }
          });
        });
      });
    });
  }

  // Inicialização geral dos componentes após o carregamento do DOM
  document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    hydrateTopNav();
    setupViewToolbar();
  });

  // Exportar API global Arcadia
  window.Arcadia = Object.assign(window.Arcadia || {}, {
    applyTheme: applyTheme,
    applyAccent: applyAccent,
    applyTextSize: applyTextSize,
    applyMotion: applyMotion,
    getIconSvg: getIconSvg,
    renderIcons: renderIcons,
    showToast: showToast,
    openDialog: openDialog,
    closeDialog: closeDialog,
    openCommandPalette: openCommandPalette,
    updateUserAvatar: updateUserAvatar,
    hydrateTopNav: hydrateTopNav
  });

})();
