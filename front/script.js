/* =========================================================
   Arcádia — script principal
   Roda em todas as páginas; cada bloco verifica se os
   elementos existem antes de agir.
   ========================================================= */

const STORAGE = {
  user: "arcadia-user",
  perfil: "arcadia-perfil",
  config: "arcadia-config",
};

function lerStorage(chave, padrao) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave));
    return valor === null || valor === undefined ? padrao : valor;
  } catch {
    return padrao;
  }
}

function salvarStorage(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

/* ---------- Toast (feedback rápido) ---------- */

function toast(mensagem, tipo = "info") {
  let wrap = document.getElementById("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${tipo}`;
  el.textContent = mensagem;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ---------- Tema (claro / escuro / sistema) ---------- */

const configPadrao = {
  tema: "system",
  notifAvisos: true,
  notifPrazos: true,
  notifProjetos: false,
};

function lerConfig() {
  return { ...configPadrao, ...lerStorage(STORAGE.config, {}) };
}

function temaEfetivo(config) {
  if (config.tema === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return config.tema;
}

const ICON_SOL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const ICON_LUA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

const themeToggle = document.createElement("button");
themeToggle.className = "theme-toggle";
themeToggle.setAttribute("aria-label", "Alternar tema");

function aplicarTema() {
  const escuro = temaEfetivo(lerConfig()) === "dark";
  document.body.classList.toggle("dark-theme", escuro);
  themeToggle.innerHTML = escuro ? ICON_SOL : ICON_LUA;
}

const navEnd = document.querySelector(".nav-end");
if (navEnd) navEnd.prepend(themeToggle);

themeToggle.addEventListener("click", () => {
  const config = lerConfig();
  config.tema = temaEfetivo(config) === "dark" ? "light" : "dark";
  salvarStorage(STORAGE.config, config);
  aplicarTema();
  sincronizarConfigUI();
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (lerConfig().tema === "system") aplicarTema();
  });

aplicarTema();

/* ---------- Menu mobile ---------- */

const navToggle = document.getElementById("navToggle");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    document.querySelector("nav").classList.toggle("menu-open");
  });
  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () =>
      document.querySelector("nav").classList.remove("menu-open"),
    ),
  );
}

/* ---------- Sessão (login simulado) ---------- */

function usuarioAtual() {
  return lerStorage(STORAGE.user, null);
}

function iniciais(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function sincronizarSessaoUI() {
  const user = usuarioAtual();
  const loginBtn = document.getElementById("login");
  const avatarBtn = document.getElementById("openSidebar");
  const sidebarAvatar = document.getElementById("sidebarAvatar");
  const sidebarNome = document.getElementById("sidebarUserName");
  const sidebarRole = document.getElementById("sidebarUserRole");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) loginBtn.style.display = user ? "none" : "";
  if (avatarBtn) avatarBtn.textContent = user ? iniciais(user.nome) : "U";
  if (sidebarAvatar) sidebarAvatar.textContent = user ? iniciais(user.nome) : "U";
  if (sidebarNome) sidebarNome.textContent = user ? user.nome : "Visitante";
  if (sidebarRole) sidebarRole.textContent = user ? `@${user.usuario}` : "Não conectado";
  if (logoutBtn) logoutBtn.style.display = user ? "" : "none";
}

function abrirModalLogin() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Entrar no Arcádia">
      <button class="modal-close" type="button" aria-label="Fechar">×</button>
      <h2>Entrar</h2>
      <p class="modal-sub">Acesse com seu usuário institucional.</p>
      <label class="field">
        <span>Nome completo</span>
        <input type="text" id="loginNome" placeholder="Ex.: Renzo Divino" autocomplete="name">
      </label>
      <label class="field">
        <span>Usuário</span>
        <input type="text" id="loginUser" placeholder="Ex.: renzo.divino" autocomplete="username">
      </label>
      <label class="field">
        <span>Senha</span>
        <input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password">
      </label>
      <div class="field-error" id="loginError"></div>
      <button class="btn-primary modal-submit" id="submitLogin" type="button">Entrar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const fechar = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", fechar);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fechar();
  });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") {
      fechar();
      document.removeEventListener("keydown", esc);
    }
  });

  const enviar = () => {
    const nome = modal.querySelector("#loginNome").value.trim();
    const usuario = modal.querySelector("#loginUser").value.trim();
    const senha = modal.querySelector("#loginPass").value;
    const erro = modal.querySelector("#loginError");

    if (nome.length < 3) {
      erro.textContent = "Informe seu nome completo.";
      return;
    }
    if (usuario.length < 3) {
      erro.textContent = "O usuário precisa ter pelo menos 3 caracteres.";
      return;
    }
    if (senha.length < 4) {
      erro.textContent = "A senha precisa ter pelo menos 4 caracteres.";
      return;
    }

    salvarStorage(STORAGE.user, { nome, usuario });
    sincronizarSessaoUI();
    fechar();
    toast(`Bem-vindo, ${nome.split(" ")[0]}!`, "sucesso");
  };

  modal.querySelector("#submitLogin").addEventListener("click", enviar);
  modal.querySelectorAll("input").forEach((input) =>
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") enviar();
    }),
  );
  modal.querySelector("#loginNome").focus();
}

const loginBtn = document.getElementById("login");
if (loginBtn) loginBtn.addEventListener("click", abrirModalLogin);

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE.user);
    sincronizarSessaoUI();
    fecharSidebar();
    toast("Você saiu da sua conta.", "info");
  });
}

sincronizarSessaoUI();

/* ---------- Sidebar ---------- */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const openBtn = document.getElementById("openSidebar");
const closeBtn = document.getElementById("closeSidebar");

function fecharSidebar() {
  if (sidebar) sidebar.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
}

if (sidebar && overlay && openBtn && closeBtn) {
  openBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  });
  closeBtn.addEventListener("click", fecharSidebar);
  overlay.addEventListener("click", fecharSidebar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharSidebar();
  });
}

/* ---------- Feed de avisos ---------- */

const feedData = [
  {
    id: 1,
    pinned: true,
    dia: 20,
    mes: "Jun",
    titulo: "Período de matrícula 2026/2 — Alunos veteranos",
    desc: "As matrículas para o segundo semestre de 2026 estarão abertas de 20 a 27 de junho. Acesse o portal do aluno para realizar a operação.",
    categoria: "matricula",
    publico: ["aluno"],
    palavras: "matrícula semestre portal aluno veterano",
  },
  {
    id: 2,
    dia: 18,
    mes: "Jun",
    titulo: "Cancelamento de aulas — Greve parcial dos servidores técnicos",
    desc: "Informamos que as aulas dos turnos vespertino e noturno do dia 18/06 estão canceladas em virtude da paralisação. Acompanhe comunicados oficiais.",
    categoria: "cancelamento",
    publico: ["aluno", "professor", "servidor"],
    palavras: "cancelamento aula greve paralisação servidor técnico",
  },
  {
    id: 3,
    dia: 15,
    mes: "Jun",
    titulo: "Edital Nº 012/2026 — Bolsas de Iniciação Científica",
    desc: "Abertas inscrições para bolsas de IC referentes ao segundo semestre. Alunos matriculados a partir do 2º período podem candidatar-se até 30/06.",
    categoria: "edital",
    publico: ["aluno"],
    palavras: "edital bolsa iniciação científica IC inscrição pesquisa",
  },
  {
    id: 4,
    dia: 12,
    mes: "Jun",
    titulo: "Semana Acadêmica Arcádia 2026 — Programação completa",
    desc: "Confira a grade de palestras, workshops e apresentações de projetos da Semana Acadêmica, programada para os dias 7 a 11 de julho.",
    categoria: "evento",
    publico: ["aluno", "professor"],
    palavras: "evento semana acadêmica palestra workshop programação julho",
  },
  {
    id: 5,
    dia: 10,
    mes: "Jun",
    titulo: "Atualização do Calendário Acadêmico — Reposições de junho",
    desc: "Foram acrescidas datas de reposição nos dias 21/06 (sábado) e 28/06 (sábado). Professores devem registrar presença normalmente.",
    categoria: "calendario",
    publico: ["professor", "servidor"],
    palavras: "calendário reposição sábado junho presença professor",
  },
  {
    id: 6,
    dia: 5,
    mes: "Jun",
    titulo: "Recredenciamento do curso de Engenharia de Software",
    desc: "O MEC realizará visita de recredenciamento entre os dias 25 e 26 de junho. Discentes e docentes poderão ser convidados para entrevistas.",
    categoria: "edital",
    publico: ["aluno", "professor", "servidor"],
    palavras: "MEC recredenciamento engenharia software visita avaliação",
  },
  {
    id: 7,
    dia: 1,
    mes: "Jun",
    titulo: "Processo Seletivo Interno — Monitor de Cálculo I",
    desc: "Estão abertas vagas para monitoria em Cálculo I. Alunos aprovados na disciplina com nota igual ou superior a 7,0 podem se inscrever até 10/06.",
    categoria: "edital",
    publico: ["aluno"],
    palavras: "monitoria monitor cálculo seletivo vaga inscrição",
  },
];

let activoPublico = "todos";
let activaCategoria = "todas";
let searchTerm = "";

const ICON_PIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

function renderFeed() {
  const list = document.getElementById("feedList");
  const empty = document.getElementById("feedEmpty");
  const count = document.getElementById("feedCount");
  if (!list || !empty) return;
  const term = searchTerm.toLowerCase().trim();

  const filtered = feedData
    .filter((item) => {
      const matchPublico =
        activoPublico === "todos" || item.publico.includes(activoPublico);
      const matchCategoria =
        activaCategoria === "todas" || item.categoria === activaCategoria;
      const matchSearch =
        !term ||
        item.titulo.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        item.palavras.toLowerCase().includes(term) ||
        item.mes.toLowerCase().includes(term) ||
        String(item.dia).includes(term);
      return matchPublico && matchCategoria && matchSearch;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (count) {
    count.textContent =
      filtered.length === 1 ? "1 aviso encontrado" : `${filtered.length} avisos encontrados`;
  }

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const tagClasses = {
    matricula: "tag-matricula",
    evento: "tag-evento",
    cancelamento: "tag-cancelamento",
    edital: "tag-edital",
    calendario: "tag-calendario",
    geral: "tag-geral",
  };
  const tagLabels = {
    matricula: "Matrícula",
    evento: "Evento",
    cancelamento: "Cancelamento",
    edital: "Edital",
    calendario: "Calendário",
    geral: "Geral",
  };
  const publicoLabel = {
    aluno: "Aluno",
    professor: "Professor",
    servidor: "Servidor",
  };

  list.innerHTML = filtered
    .map(
      (item) => `
    <div class="feed-item${item.pinned ? " pinned" : ""}">
      <div class="feed-item-left">
        <span class="feed-date-day">${String(item.dia).padStart(2, "0")}</span>
        <span class="feed-date-month">${item.mes}</span>
      </div>
      <div class="feed-divider"></div>
      <div class="feed-item-body">
        <div class="feed-item-top">
          <span class="feed-tag ${tagClasses[item.categoria] || "tag-geral"}">${tagLabels[item.categoria] || item.categoria}</span>
          ${item.publico.map((p) => `<span class="feed-public-badge">${publicoLabel[p] || p}</span>`).join("")}
        </div>
        <div class="feed-item-title">${item.titulo}</div>
        <div class="feed-item-desc">${item.desc}</div>
      </div>
      ${item.pinned ? `<div class="feed-item-right"><span class="feed-pin" title="Fixado">${ICON_PIN} Fixado</span></div>` : ""}
    </div>
  `,
    )
    .join("");
}

const filterPublico = document.getElementById("filterPublico");
if (filterPublico) {
  filterPublico.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filterPublico
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activoPublico = btn.dataset.filter;
    renderFeed();
  });
}

const filterCategoria = document.getElementById("filterCategoria");
if (filterCategoria) {
  filterCategoria.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filterCategoria
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activaCategoria = btn.dataset.cat;
    renderFeed();
  });
}

const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value;
    if (searchClear) {
      searchClear.style.display = searchTerm ? "block" : "none";
    }
    renderFeed();
  });
}
if (searchClear) {
  searchClear.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    searchTerm = "";
    searchClear.style.display = "none";
    renderFeed();
  });
}

renderFeed();

/* ---------- Calendário acadêmico ---------- */

const calEventos = [
  { ano: 2026, mes: 5, dia: 15, nome: "Prazo — Entrega de notas 1ª AV", tipo: "prazo" },
  { ano: 2026, mes: 5, dia: 20, nome: "Início do período de matrículas", tipo: "prazo" },
  { ano: 2026, mes: 5, dia: 21, nome: "Reposição de aulas (sábado)", tipo: "evento" },
  { ano: 2026, mes: 5, dia: 24, nome: "Prova Parcial — Cálculo I", tipo: "prova" },
  { ano: 2026, mes: 5, dia: 28, nome: "Reposição de aulas (sábado)", tipo: "evento" },
  { ano: 2026, mes: 6, dia: 4, nome: "Início do 2º Bimestre", tipo: "evento" },
  { ano: 2026, mes: 6, dia: 9, nome: "Corpus Christi — Feriado", tipo: "feriado" },
  { ano: 2026, mes: 6, dia: 15, nome: "Prazo — Solicitação de revisão de prova", tipo: "prazo" },
  { ano: 2026, mes: 6, dia: 20, nome: "Prova 2ª AV — Física Aplicada", tipo: "prova" },
  { ano: 2026, mes: 6, dia: 25, nome: "Recredenciamento MEC (visita)", tipo: "evento" },
  { ano: 2026, mes: 6, dia: 30, nome: "Encerramento do prazo de IC", tipo: "prazo" },
  { ano: 2026, mes: 7, dia: 7, nome: "Semana Acadêmica Arcádia 2026", tipo: "evento" },
  { ano: 2026, mes: 7, dia: 14, nome: "Prova Final — 1º Semestre", tipo: "prova" },
  { ano: 2026, mes: 7, dia: 25, nome: "Recesso — Festa de Sant'Ana", tipo: "feriado" },
];

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const TIPO_LABEL = {
  prova: "Prova",
  prazo: "Prazo",
  evento: "Evento",
  feriado: "Feriado",
};

let calAno = 2026;
let calMes = 5;
let calDiaSelecionado = null;

function renderCalendario() {
  const label = document.getElementById("calMonthLabel");
  const grid = document.getElementById("calGrid");
  const evList = document.getElementById("calEventsList");
  const evTitle = document.getElementById("calEventsTitle");
  const clearBtn = document.getElementById("calClearDay");
  if (!label || !grid || !evList) return;
  label.textContent = `${MESES_PT[calMes]} ${calAno}`;

  const hoje = new Date();

  const diasComEvento = new Set(
    calEventos
      .filter((e) => e.ano === calAno && e.mes === calMes)
      .map((e) => e.dia),
  );

  const primeiroDia = new Date(calAno, calMes, 1).getDay();
  const totalDias = new Date(calAno, calMes + 1, 0).getDate();

  let html = "";
  for (let i = 0; i < primeiroDia; i++) {
    const prevDia = new Date(calAno, calMes, 0).getDate() - primeiroDia + 1 + i;
    html += `<div class="cal-day other-month">${prevDia}</div>`;
  }
  for (let d = 1; d <= totalDias; d++) {
    const isHoje =
      d === hoje.getDate() &&
      calMes === hoje.getMonth() &&
      calAno === hoje.getFullYear();
    const temEvento = diasComEvento.has(d);
    const selecionado = calDiaSelecionado === d;
    html += `<div class="cal-day${isHoje ? " today" : ""}${temEvento ? " has-event" : ""}${selecionado ? " selected" : ""}"
                  data-dia="${d}" title="${temEvento ? "Ver eventos do dia" : ""}">${d}</div>`;
  }
  const total = primeiroDia + totalDias;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= resto; i++)
    html += `<div class="cal-day other-month">${i}</div>`;

  grid.innerHTML = html;

  let eventosMes = calEventos
    .filter((e) => e.ano === calAno && e.mes === calMes)
    .sort((a, b) => a.dia - b.dia);

  if (calDiaSelecionado !== null) {
    eventosMes = eventosMes.filter((e) => e.dia === calDiaSelecionado);
    if (evTitle)
      evTitle.textContent = `Eventos de ${String(calDiaSelecionado).padStart(2, "0")} de ${MESES_PT[calMes]}`;
    if (clearBtn) clearBtn.style.display = "";
  } else {
    if (evTitle) evTitle.textContent = "Eventos do mês";
    if (clearBtn) clearBtn.style.display = "none";
  }

  evList.innerHTML = eventosMes.length
    ? eventosMes
        .map(
          (e) => `
        <div class="cal-event-item tipo-${e.tipo}">
          <span class="cal-event-day">${String(e.dia).padStart(2, "0")}</span>
          <div class="cal-event-info">
            <div class="cal-event-name">${e.nome}</div>
            <div class="cal-event-type"><i class="leg-dot leg-${e.tipo}"></i> ${TIPO_LABEL[e.tipo]}</div>
          </div>
        </div>`,
        )
        .join("")
    : `<p class="cal-events-vazio">Nenhum evento ${calDiaSelecionado !== null ? "neste dia" : "neste mês"}.</p>`;
}

const calGridEl = document.getElementById("calGrid");
if (calGridEl) {
  calGridEl.addEventListener("click", (e) => {
    const dia = e.target.closest(".cal-day:not(.other-month)");
    if (!dia) return;
    const valor = Number(dia.dataset.dia);
    calDiaSelecionado = calDiaSelecionado === valor ? null : valor;
    renderCalendario();
  });
}

const calClearDay = document.getElementById("calClearDay");
if (calClearDay) {
  calClearDay.addEventListener("click", () => {
    calDiaSelecionado = null;
    renderCalendario();
  });
}

const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
if (prevMonth && nextMonth) {
  prevMonth.addEventListener("click", () => {
    calMes--;
    if (calMes < 0) {
      calMes = 11;
      calAno--;
    }
    calDiaSelecionado = null;
    renderCalendario();
  });
  nextMonth.addEventListener("click", () => {
    calMes++;
    if (calMes > 11) {
      calMes = 0;
      calAno++;
    }
    calDiaSelecionado = null;
    renderCalendario();
  });
}

renderCalendario();

/* ---------- Lembretes (próximos 30 dias) ---------- */

function renderLembretes() {
  const grid = document.getElementById("remindersGrid");
  if (!grid) return;
  const hoje = new Date();
  const limite = new Date(hoje);
  limite.setDate(hoje.getDate() + 30);

  const proximos = calEventos
    .map((e) => ({ ...e, data: new Date(e.ano, e.mes, e.dia) }))
    .filter((e) => e.data >= hoje && e.data <= limite)
    .sort((a, b) => a.data - b.data)
    .slice(0, 6);

  if (!proximos.length) {
    grid.innerHTML =
      '<p class="cal-events-vazio">Nenhum lembrete para os próximos 30 dias.</p>';
    return;
  }

  grid.innerHTML = proximos
    .map((e) => {
      const diff = Math.ceil((e.data - hoje) / 86400000);
      const urgente = diff <= 5;
      return `
      <div class="reminder-card tipo-${e.tipo}">
        <div class="reminder-info">
          <div class="reminder-name">${e.nome}</div>
          <div class="reminder-date"><i class="leg-dot leg-${e.tipo}"></i> ${TIPO_LABEL[e.tipo]} · ${String(e.dia).padStart(2, "0")} de ${MESES_PT[e.mes]}</div>
        </div>
        <span class="reminder-days${urgente ? " urgente" : ""}">
          ${diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : `em ${diff}d`}
        </span>
      </div>`;
    })
    .join("");
}

renderLembretes();

/* ---------- Documentos e links úteis ---------- */

const DOC_ICONS = {
  form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>',
  lib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

const docsData = [
  { cat: "Formulários", tipo: "form", classe: "doc-icon-form", nome: "Requerimento Geral", desc: "Solicitações diversas à secretaria acadêmica", href: "#" },
  { cat: "Formulários", tipo: "form", classe: "doc-icon-form", nome: "Aproveitamento de Disciplina", desc: "Dispensa de matéria por conhecimento prévio", href: "#" },
  { cat: "Formulários", tipo: "form", classe: "doc-icon-form", nome: "Declaração de Vínculo", desc: "Documento para comprovar matrícula ativa", href: "#" },
  { cat: "Formulários", tipo: "form", classe: "doc-icon-form", nome: "Trancamento de Matrícula", desc: "Suspensão temporária das atividades acadêmicas", href: "#" },
  { cat: "Manuais e Regulamentos", tipo: "manual", classe: "doc-icon-manual", nome: "Regulamento Acadêmico 2026", desc: "Normas gerais de ensino, avaliação e conduta", href: "#" },
  { cat: "Manuais e Regulamentos", tipo: "manual", classe: "doc-icon-manual", nome: "Manual do Aluno Ingressante", desc: "Guia de orientação para calouros", href: "#" },
  { cat: "Manuais e Regulamentos", tipo: "manual", classe: "doc-icon-manual", nome: "Manual de TCC", desc: "Normas para elaboração de trabalho de conclusão", href: "#" },
  { cat: "E-mails e Contatos", tipo: "email", classe: "doc-icon-email", nome: "Secretaria Acadêmica", desc: "secretaria@arcadia.edu.br", href: "mailto:secretaria@arcadia.edu.br" },
  { cat: "E-mails e Contatos", tipo: "email", classe: "doc-icon-email", nome: "Coordenação Geral", desc: "coordenacao@arcadia.edu.br", href: "mailto:coordenacao@arcadia.edu.br" },
  { cat: "E-mails e Contatos", tipo: "email", classe: "doc-icon-email", nome: "Ouvidoria", desc: "ouvidoria@arcadia.edu.br", href: "mailto:ouvidoria@arcadia.edu.br" },
  { cat: "Bibliotecas Digitais", tipo: "lib", classe: "doc-icon-lib", nome: "Portal Periódicos CAPES", desc: "Acesso a artigos e revistas científicas", href: "https://www.periodicos.capes.gov.br" },
  { cat: "Bibliotecas Digitais", tipo: "lib", classe: "doc-icon-lib", nome: "Biblioteca Virtual Pearson", desc: "E-books de diversas disciplinas", href: "#" },
  { cat: "Bibliotecas Digitais", tipo: "lib", classe: "doc-icon-lib", nome: "SciELO Brasil", desc: "Biblioteca científica eletrônica online", href: "https://scielo.br" },
  { cat: "Links Úteis", tipo: "link", classe: "doc-icon-link", nome: "Portal do Aluno", desc: "Notas, histórico, matrícula online", href: "#" },
  { cat: "Links Úteis", tipo: "link", classe: "doc-icon-link", nome: "Sistema de Frequência", desc: "Controle de presença e faltas", href: "#" },
  { cat: "Links Úteis", tipo: "link", classe: "doc-icon-link", nome: "e-MEC", desc: "Informações oficiais do MEC sobre o curso", href: "https://emec.mec.gov.br" },
];

function renderDocs(filtro = "") {
  const grid = document.getElementById("docsGrid");
  if (!grid) return;
  const term = filtro.toLowerCase().trim();

  const filtered = docsData.filter(
    (d) =>
      !term ||
      d.nome.toLowerCase().includes(term) ||
      d.desc.toLowerCase().includes(term) ||
      d.cat.toLowerCase().includes(term),
  );

  const grupos = {};
  filtered.forEach((d) => {
    (grupos[d.cat] = grupos[d.cat] || []).push(d);
  });

  let html = "";
  Object.entries(grupos).forEach(([cat, items]) => {
    html += `<div class="doc-category-label">${cat}</div>`;
    items.forEach((d) => {
      html += `
        <a class="doc-card" href="${d.href}" target="_blank" rel="noopener">
          <div class="doc-icon ${d.classe}">${DOC_ICONS[d.tipo]}</div>
          <div class="doc-info">
            <div class="doc-name">${d.nome}</div>
            <div class="doc-desc">${d.desc}</div>
          </div>
          <span class="doc-arrow">→</span>
        </a>`;
    });
  });

  grid.innerHTML =
    html ||
    '<p class="cal-events-vazio" style="padding:20px;">Nenhum resultado encontrado.</p>';
}

const docsSearch = document.getElementById("docsSearch");
if (docsSearch) {
  docsSearch.addEventListener("input", (e) => renderDocs(e.target.value));
}
renderDocs();

/* ---------- Página de Projetos ---------- */

const projetosData = [
  { nome: "Sistema de gerenciamento escolar", desc: "Plataforma para controle acadêmico, notas e frequência dos alunos.", cat: "web", status: "ativo", tags: ["HTML", "CSS", "JavaScript"], img: "https://picsum.photos/400/250?random=10" },
  { nome: "Dashboard administrativo", desc: "Interface minimalista focada em produtividade e experiência do usuário.", cat: "uiux", status: "ativo", tags: ["Figma", "Design System"], img: "https://picsum.photos/400/250?random=11" },
  { nome: "App de notícias em tempo real", desc: "Aplicativo responsivo com integração de API e atualização dinâmica.", cat: "mobile", status: "concluido", tags: ["React Native", "API"], img: "https://picsum.photos/400/250?random=12" },
  { nome: "Portal Arcádia", desc: "Portal institucional com feed de avisos, calendário acadêmico e documentos.", cat: "web", status: "ativo", tags: ["JavaScript", "LocalStorage"], img: "https://picsum.photos/400/250?random=13" },
  { nome: "Sistema Biblioteca", desc: "Catálogo e controle de empréstimos da biblioteca do campus.", cat: "web", status: "concluido", tags: ["Node.js", "SQL"], img: "https://picsum.photos/400/250?random=14" },
  { nome: "Estudo de acessibilidade no campus", desc: "Pesquisa sobre navegação assistiva em sistemas acadêmicos.", cat: "pesquisa", status: "ativo", tags: ["A11y", "UX Research"], img: "https://picsum.photos/400/250?random=15" },
];

const CAT_PROJ_LABEL = {
  web: "Web App",
  mobile: "Mobile",
  uiux: "UI/UX",
  pesquisa: "Pesquisa",
};
const STATUS_LABEL = { ativo: "Em andamento", concluido: "Concluído" };

let projCat = "todas";
let projStatus = "todos";
let projTerm = "";

function renderProjetos() {
  const grid = document.getElementById("projetosGrid");
  const empty = document.getElementById("projEmpty");
  const count = document.getElementById("projCount");
  if (!grid || !empty) return;
  const term = projTerm.toLowerCase().trim();

  const filtered = projetosData.filter((p) => {
    const matchCat = projCat === "todas" || p.cat === projCat;
    const matchStatus = projStatus === "todos" || p.status === projStatus;
    const matchTerm =
      !term ||
      p.nome.toLowerCase().includes(term) ||
      p.desc.toLowerCase().includes(term) ||
      p.tags.join(" ").toLowerCase().includes(term);
    return matchCat && matchStatus && matchTerm;
  });

  if (count) {
    count.textContent =
      filtered.length === 1
        ? "1 projeto encontrado"
        : `${filtered.length} projetos encontrados`;
  }

  if (!filtered.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  grid.innerHTML = filtered
    .map(
      (p) => `
    <div class="card">
      <img src="${p.img}" alt="">
      <div class="card-content">
        <div class="card-badges">
          <span class="card-category">${CAT_PROJ_LABEL[p.cat]}</span>
          <span class="status-badge status-${p.status}">${STATUS_LABEL[p.status]}</span>
        </div>
        <h3>${p.nome}</h3>
        <p>${p.desc}</p>
        <div class="tech-tags">
          ${p.tags.map((t) => `<span class="tech-tag">${t}</span>`).join("")}
        </div>
      </div>
    </div>`,
    )
    .join("");
}

const filterProjCat = document.getElementById("filterProjCat");
if (filterProjCat) {
  filterProjCat.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filterProjCat
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    projCat = btn.dataset.pcat;
    renderProjetos();
  });
}

const filterProjStatus = document.getElementById("filterProjStatus");
if (filterProjStatus) {
  filterProjStatus.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filterProjStatus
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    projStatus = btn.dataset.pstatus;
    renderProjetos();
  });
}

const projSearch = document.getElementById("projSearch");
if (projSearch) {
  projSearch.addEventListener("input", (e) => {
    projTerm = e.target.value;
    renderProjetos();
  });
}

renderProjetos();

/* ---------- Página de Perfil ---------- */

const perfilPadrao = {
  nome: "Usuário",
  usuario: "usuario",
  bio: "Estudante de Desenvolvimento de Sistemas. Apaixonado por programação, música e tecnologia.",
};

function lerPerfil() {
  const user = usuarioAtual();
  const base = { ...perfilPadrao };
  if (user) {
    base.nome = user.nome;
    base.usuario = user.usuario;
  }
  return { ...base, ...lerStorage(STORAGE.perfil, {}) };
}

function renderPerfil() {
  const nomeEl = document.getElementById("profileName");
  if (!nomeEl) return;
  const perfil = lerPerfil();
  nomeEl.textContent = perfil.nome;
  document.getElementById("profileUser").textContent = `@${perfil.usuario}`;
  document.getElementById("profileBio").textContent = perfil.bio;
  document.getElementById("profileAvatar").textContent = iniciais(perfil.nome);
}

function abrirModalPerfil() {
  const perfil = lerPerfil();
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Editar perfil">
      <button class="modal-close" type="button" aria-label="Fechar">×</button>
      <h2>Editar Perfil</h2>
      <p class="modal-sub">As alterações ficam salvas neste navegador.</p>
      <label class="field">
        <span>Nome</span>
        <input type="text" id="perfilNome" value="${perfil.nome.replace(/"/g, "&quot;")}">
      </label>
      <label class="field">
        <span>Usuário</span>
        <input type="text" id="perfilUsuario" value="${perfil.usuario.replace(/"/g, "&quot;")}">
      </label>
      <label class="field">
        <span>Bio</span>
        <textarea id="perfilBio" rows="3">${perfil.bio}</textarea>
      </label>
      <div class="field-error" id="perfilError"></div>
      <button class="btn-primary modal-submit" id="salvarPerfil" type="button">Salvar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const fechar = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", fechar);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fechar();
  });

  modal.querySelector("#salvarPerfil").addEventListener("click", () => {
    const nome = modal.querySelector("#perfilNome").value.trim();
    const usuario = modal
      .querySelector("#perfilUsuario")
      .value.trim()
      .replace(/^@/, "");
    const bio = modal.querySelector("#perfilBio").value.trim();
    const erro = modal.querySelector("#perfilError");

    if (nome.length < 2) {
      erro.textContent = "Informe um nome válido.";
      return;
    }
    if (usuario.length < 3) {
      erro.textContent = "O usuário precisa ter pelo menos 3 caracteres.";
      return;
    }

    salvarStorage(STORAGE.perfil, { nome, usuario, bio });
    renderPerfil();
    fechar();
    toast("Perfil atualizado!", "sucesso");
  });

  modal.querySelector("#perfilNome").focus();
}

const editProfileBtn = document.getElementById("editProfileBtn");
if (editProfileBtn) editProfileBtn.addEventListener("click", abrirModalPerfil);
renderPerfil();

/* ---------- Página de Configurações ---------- */

function sincronizarConfigUI() {
  const segment = document.getElementById("themeSegment");
  if (!segment) return;
  const config = lerConfig();

  segment.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tema === config.tema);
  });
  ["notifAvisos", "notifPrazos", "notifProjetos"].forEach((chave) => {
    const input = document.getElementById(chave);
    if (input) input.checked = config[chave];
  });
}

const themeSegment = document.getElementById("themeSegment");
if (themeSegment) {
  themeSegment.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const config = lerConfig();
    config.tema = btn.dataset.tema;
    salvarStorage(STORAGE.config, config);
    aplicarTema();
    sincronizarConfigUI();
    toast("Tema atualizado.", "sucesso");
  });

  ["notifAvisos", "notifPrazos", "notifProjetos"].forEach((chave) => {
    const input = document.getElementById(chave);
    if (input) {
      input.addEventListener("change", () => {
        const config = lerConfig();
        config[chave] = input.checked;
        salvarStorage(STORAGE.config, config);
        toast("Preferência salva.", "sucesso");
      });
    }
  });

  const clearBtn = document.getElementById("clearDataBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const confirmado = confirm(
        "Isso remove sessão, perfil e preferências salvas neste navegador. Continuar?",
      );
      if (!confirmado) return;
      Object.values(STORAGE).forEach((chave) => localStorage.removeItem(chave));
      localStorage.removeItem("theme");
      aplicarTema();
      sincronizarConfigUI();
      sincronizarSessaoUI();
      toast("Dados locais removidos.", "info");
    });
  }

  sincronizarConfigUI();
}

/* ---------- Voltar ao topo ---------- */

const backToTop = document.createElement("button");
backToTop.className = "back-to-top";
backToTop.setAttribute("aria-label", "Voltar ao topo");
backToTop.innerHTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
document.body.appendChild(backToTop);

window.addEventListener("scroll", () => {
  backToTop.classList.toggle("visible", window.scrollY > 600);
});
backToTop.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" }),
);
