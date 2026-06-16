const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const openBtn = document.getElementById("openSidebar");
const closeBtn = document.getElementById("closeSidebar");

if (sidebar && overlay && openBtn && closeBtn) {
  openBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  });
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });
}

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

function renderFeed() {
  const list = document.getElementById("feedList");
  const empty = document.getElementById("feedEmpty");
  if (!list || !empty) return;
  const term = searchTerm.toLowerCase().trim();

  const filtered = feedData.filter((item) => {
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
  });

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
    <div class="feed-item">
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
      ${item.pinned ? '<div class="feed-item-right"><span class="feed-pin" title="Fixado">📌</span></div>' : ""}
    </div>
  `,
    )
    .join("");
}

document.getElementById("filterPublico").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document
    .querySelectorAll("#filterPublico .chip")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  activoPublico = btn.dataset.filter;
  renderFeed();
});

document.getElementById("filterCategoria").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document
    .querySelectorAll("#filterCategoria .chip")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  activaCategoria = btn.dataset.cat;
  renderFeed();
});

const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  searchClear.style.display = searchTerm ? "block" : "none";
  renderFeed();
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchTerm = "";
  searchClear.style.display = "none";
  renderFeed();
});

renderFeed();

const calEventos = [
  {
    ano: 2026,
    mes: 5,
    dia: 15,
    nome: "Prazo — Entrega de notas 1ª AV",
    tipo: "prazo",
  },
  {
    ano: 2026,
    mes: 5,
    dia: 20,
    nome: "Início do período de matrículas",
    tipo: "prazo",
  },
  {
    ano: 2026,
    mes: 5,
    dia: 21,
    nome: "Reposição de aulas (sábado)",
    tipo: "evento",
  },
  {
    ano: 2026,
    mes: 5,
    dia: 24,
    nome: "Prova Parcial — Cálculo I",
    tipo: "prova",
  },
  {
    ano: 2026,
    mes: 5,
    dia: 28,
    nome: "Reposição de aulas (sábado)",
    tipo: "evento",
  },
  { ano: 2026, mes: 6, dia: 4, nome: "Início do 2º Bimestre", tipo: "evento" },
  {
    ano: 2026,
    mes: 6,
    dia: 9,
    nome: "Corpus Christi — Feriado",
    tipo: "feriado",
  },
  {
    ano: 2026,
    mes: 6,
    dia: 15,
    nome: "Prazo — Solicitação de revisão de prova",
    tipo: "prazo",
  },
  {
    ano: 2026,
    mes: 6,
    dia: 20,
    nome: "Prova 2ª AV — Física Aplicada",
    tipo: "prova",
  },
  {
    ano: 2026,
    mes: 6,
    dia: 25,
    nome: "Recredenciamento MEC (visita)",
    tipo: "evento",
  },
  {
    ano: 2026,
    mes: 6,
    dia: 30,
    nome: "Encerramento do prazo de IC",
    tipo: "prazo",
  },
  {
    ano: 2026,
    mes: 7,
    dia: 7,
    nome: "Semana Acadêmica Arcádia 2026",
    tipo: "evento",
  },
  {
    ano: 2026,
    mes: 7,
    dia: 14,
    nome: "Prova Final — 1º Semestre",
    tipo: "prova",
  },
  {
    ano: 2026,
    mes: 7,
    dia: 25,
    nome: "Recesso — Festa de Sant'Ana",
    tipo: "feriado",
  },
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

const TIPO_ICON = { prova: "📝", prazo: "⏰", evento: "🗓️", feriado: "🏖️" };
const TIPO_LABEL = {
  prova: "Prova",
  prazo: "Prazo",
  evento: "Evento",
  feriado: "Feriado",
};

let calAno = 2026;
let calMes = 5;

function renderCalendario() {
  const label = document.getElementById("calMonthLabel");
  const grid = document.getElementById("calGrid");
  const evList = document.getElementById("calEventsList");
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
    html += `<div class="cal-day${isHoje ? " today" : ""}${temEvento ? " has-event" : ""}"
                  data-dia="${d}" title="${temEvento ? "Ver evento" : ""}">${d}</div>`;
  }
  const total = primeiroDia + totalDias;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= resto; i++)
    html += `<div class="cal-day other-month">${i}</div>`;

  grid.innerHTML = html;

  const eventosMes = calEventos
    .filter((e) => e.ano === calAno && e.mes === calMes)
    .sort((a, b) => a.dia - b.dia);
  const evList = document.getElementById("calEventsList");
  evList.innerHTML = eventosMes.length
    ? eventosMes
        .map(
          (e) => `
        <div class="cal-event-item tipo-${e.tipo}">
          <span class="cal-event-day">${String(e.dia).padStart(2, "0")}</span>
          <div class="cal-event-info">
            <div class="cal-event-name">${e.nome}</div>
            <div class="cal-event-type">${TIPO_ICON[e.tipo]} ${TIPO_LABEL[e.tipo]}</div>
          </div>
        </div>`,
        )
        .join("")
    : '<p style="font-size:13px;color:var(--muted)">Nenhum evento neste mês.</p>';
}

document.getElementById("prevMonth").addEventListener("click", () => {
  calMes--;
  if (calMes < 0) {
    calMes = 11;
    calAno--;
  }
  renderCalendario();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calMes++;
  if (calMes > 11) {
    calMes = 0;
    calAno++;
  }
  renderCalendario();
});

renderCalendario();

function renderLembretes() {
  const hoje = new Date();
  const limite = new Date(hoje);
  limite.setDate(hoje.getDate() + 30);
  const grid = document.getElementById("remindersGrid");
  if (!grid) return;

  const proximos = calEventos
    .map((e) => ({ ...e, data: new Date(e.ano, e.mes, e.dia) }))
    .filter((e) => e.data >= hoje && e.data <= limite)
    .sort((a, b) => a.data - b.data)
    .slice(0, 6);

  const grid = document.getElementById("remindersGrid");
  grid.innerHTML = proximos
    .map((e) => {
      const diff = Math.ceil((e.data - hoje) / 86400000);
      const urgente = diff <= 5;
      return `
      <div class="reminder-card">
        <span class="reminder-icon">${TIPO_ICON[e.tipo]}</span>
        <div class="reminder-info">
          <div class="reminder-name">${e.nome}</div>
          <div class="reminder-date">${String(e.dia).padStart(2, "0")} de ${MESES_PT[e.mes]}</div>
        </div>
        <span class="reminder-days${urgente ? " urgente" : ""}">
          ${diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : `em ${diff}d`}
        </span>
      </div>`;
    })
    .join("");
}

renderLembretes();

const docsData = [
  {
    cat: "Formulários",
    icone: "📋",
    classe: "doc-icon-form",
    nome: "Requerimento Geral",
    desc: "Solicitações diversas à secretaria acadêmica",
    href: "#",
  },
  {
    cat: "Formulários",
    icone: "📋",
    classe: "doc-icon-form",
    nome: "Aproveitamento de Disciplina",
    desc: "Dispensa de matéria por conhecimento prévio",
    href: "#",
  },
  {
    cat: "Formulários",
    icone: "📋",
    classe: "doc-icon-form",
    nome: "Declaração de Vínculo",
    desc: "Documento para comprovar matrícula ativa",
    href: "#",
  },
  {
    cat: "Formulários",
    icone: "📋",
    classe: "doc-icon-form",
    nome: "Trancamento de Matrícula",
    desc: "Suspensão temporária das atividades acadêmicas",
    href: "#",
  },
  {
    cat: "Manuais e Regulamentos",
    icone: "📖",
    classe: "doc-icon-manual",
    nome: "Regulamento Acadêmico 2026",
    desc: "Normas gerais de ensino, avaliação e conduta",
    href: "#",
  },
  {
    cat: "Manuais e Regulamentos",
    icone: "📖",
    classe: "doc-icon-manual",
    nome: "Manual do Aluno Ingressante",
    desc: "Guia de orientação para calouros",
    href: "#",
  },
  {
    cat: "Manuais e Regulamentos",
    icone: "📖",
    classe: "doc-icon-manual",
    nome: "Manual de TCC",
    desc: "Normas para elaboração de trabalho de conclusão",
    href: "#",
  },
  {
    cat: "E-mails e Contatos",
    icone: "✉️",
    classe: "doc-icon-email",
    nome: "Secretaria Acadêmica",
    desc: "secretaria@arcadia.edu.br",
    href: "mailto:secretaria@arcadia.edu.br",
  },
  {
    cat: "E-mails e Contatos",
    icone: "✉️",
    classe: "doc-icon-email",
    nome: "Coordenação Geral",
    desc: "coordenacao@arcadia.edu.br",
    href: "mailto:coordenacao@arcadia.edu.br",
  },
  {
    cat: "E-mails e Contatos",
    icone: "✉️",
    classe: "doc-icon-email",
    nome: "Ouvidoria",
    desc: "ouvidoria@arcadia.edu.br",
    href: "mailto:ouvidoria@arcadia.edu.br",
  },
  {
    cat: "Bibliotecas Digitais",
    icone: "📚",
    classe: "doc-icon-lib",
    nome: "Portal Periódicos CAPES",
    desc: "Acesso a artigos e revistas científicas",
    href: "https://www.periodicos.capes.gov.br",
  },
  {
    cat: "Bibliotecas Digitais",
    icone: "📚",
    classe: "doc-icon-lib",
    nome: "Biblioteca Virtual Pearson",
    desc: "E-books de diversas disciplinas",
    href: "#",
  },
  {
    cat: "Bibliotecas Digitais",
    icone: "📚",
    classe: "doc-icon-lib",
    nome: "SciELO Brasil",
    desc: "Biblioteca científica eletrônica online",
    href: "https://scielo.br",
  },
  {
    cat: "Links Úteis",
    icone: "🔗",
    classe: "doc-icon-link",
    nome: "Portal do Aluno",
    desc: "Notas, histórico, matrícula online",
    href: "#",
  },
  {
    cat: "Links Úteis",
    icone: "🔗",
    classe: "doc-icon-link",
    nome: "Sistema de Frequência",
    desc: "Controle de presença e faltas",
    href: "#",
  },
  {
    cat: "Links Úteis",
    icone: "🔗",
    classe: "doc-icon-link",
    nome: "e-MEC",
    desc: "Informações oficiais do MEC sobre o curso",
    href: "https://emec.mec.gov.br",
  },
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
          <div class="doc-icon ${d.classe}">${d.icone}</div>
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
    '<p style="padding:20px;color:var(--muted)">Nenhum resultado encontrado.</p>';
}

const docsSearch = document.getElementById("docsSearch");
if (docsSearch) {
  docsSearch.addEventListener("input", (e) => renderDocs(e.target.value));
}
renderDocs();

const themeToggle = document.createElement("button");
themeToggle.className = "theme-toggle";
themeToggle.innerHTML = "🌙";
themeToggle.setAttribute("aria-label", "Alternar tema");
document.querySelector(".nav-end").prepend(themeToggle);

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-theme");
    themeToggle.innerHTML = "☀️";
  } else {
    document.body.classList.remove("dark-theme");
    themeToggle.innerHTML = "🌙";
  }
}

function toggleTheme() {
  if (document.body.classList.contains("dark-theme")) {
    document.body.classList.remove("dark-theme");
    localStorage.setItem("theme", "light");
    themeToggle.innerHTML = "🌙";
  } else {
    document.body.classList.add("dark-theme");
    localStorage.setItem("theme", "dark");
    themeToggle.innerHTML = "☀️";
  }
}

themeToggle.addEventListener("click", toggleTheme);
initTheme();
