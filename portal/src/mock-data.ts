/* Dados simulados do portal — único ponto de mock, tipado. */

export type Vinculo = "aluno" | "professor" | "servidor";
export type EstadoVinculo = "verificacao" | "verificado" | "recusado";

export type Categoria =
  | "matricula"
  | "edital"
  | "evento"
  | "cancelamento"
  | "documento";

export interface Usuario {
  nome: string;
  vinculo: Vinculo;
  periodo?: string;
  curso?: string;
  email: string;
  matricula?: string;
}

export interface Aviso {
  id: string;
  data: string; // ISO
  categoria: Categoria;
  publico: Vinculo[] | "todos";
  titulo: string;
  resumo: string;
  lido: boolean;
  fixado?: boolean;
}

export interface Documento {
  id: string;
  grupo: "formularios" | "manuais" | "contatos" | "bibliotecas";
  titulo: string;
  tipo: "PDF" | "E-mail" | "Link";
  acessos: number;
}

export interface Projeto {
  id: string;
  categoria: "web-app" | "ui-ux" | "mobile" | "pesquisa";
  titulo: string;
  autoria: string;
  detalhe: string;
}

export interface PassoOnboarding {
  id: string;
  rotulo: string;
}

export const USUARIO_PADRAO: Usuario = {
  nome: "Ana Ribeiro",
  vinculo: "aluno",
  periodo: "4º período",
  curso: "Engenharia de Software",
  email: "ana.ribeiro@arcadia.edu.br",
  matricula: "2026104882",
};

export const PASSOS_ONBOARDING: PassoOnboarding[] = [
  { id: "curso", rotulo: "Confirme seu curso" },
  { id: "categorias", rotulo: "Escolha as categorias" },
  { id: "resumo", rotulo: "Ative o resumo diário" },
];

export const AVISOS: Aviso[] = [
  {
    id: "matricula-2026-2",
    data: "2026-06-20",
    categoria: "matricula",
    publico: ["aluno"],
    titulo: "Período de matrícula 2026/2 para alunos veteranos",
    resumo: "As matrículas para o segundo semestre estarão abertas de 20 a 27 de junho, pelo portal do aluno.",
    lido: false,
    fixado: true,
  },
  {
    id: "greve-servidores",
    data: "2026-06-18",
    categoria: "cancelamento",
    publico: "todos",
    titulo: "Cancelamento de aulas por greve parcial dos servidores",
    resumo: "As aulas dos turnos vespertino e noturno do dia 18/06 estão canceladas.",
    lido: false,
  },
  {
    id: "edital-012",
    data: "2026-06-15",
    categoria: "edital",
    publico: ["aluno"],
    titulo: "Edital Nº 012/2026 — Bolsas de Iniciação Científica",
    resumo: "Inscrições abertas até 30/08 para alunos matriculados a partir do 2º período.",
    lido: true,
    fixado: true,
  },
  {
    id: "semana-academica",
    data: "2026-06-12",
    categoria: "evento",
    publico: "todos",
    titulo: "Semana Acadêmica Arcádia 2026 com a programação completa",
    resumo: "Palestras, workshops e apresentações de projetos entre os dias 7 e 11 de julho.",
    lido: true,
  },
  {
    id: "reposicoes-junho",
    data: "2026-06-10",
    categoria: "documento",
    publico: "todos",
    titulo: "Atualização do calendário com as reposições de junho",
    resumo: "Foram acrescidas datas de reposição em 21/06 e 28/06.",
    lido: true,
  },
  {
    id: "monitoria-calculo",
    data: "2026-06-01",
    categoria: "edital",
    publico: ["aluno"],
    titulo: "Monitoria de Cálculo I com inscrições até 10/06",
    resumo: "Processo seletivo para monitores com bolsa parcial.",
    lido: true,
  },
];

export const NOTIFICACOES = [
  { id: "n1", titulo: "Matrícula 2026/2 aberta", meta: "Hoje, 07:00 · não lida", avisoId: "matricula-2026-2" },
  { id: "n2", titulo: "Sua inscrição no Edital 012 foi recebida", meta: "Ontem, 14:32", avisoId: "edital-012" },
  { id: "n3", titulo: "Aulas de 18/06 canceladas", meta: "18/06, 09:10", avisoId: "greve-servidores" },
  { id: "n4", titulo: "Projeto aprovado pela coordenação", meta: "14/06, 16:45", avisoId: null },
];

export const RESUMO_DIARIO = {
  origem: "Arcádia · 20 de junho",
  titulo: "3 publicações para você hoje",
  itens: [
    "Matrícula 2026/2 — veteranos",
    "Reposição de aula — 21/06",
    "Semana Acadêmica — inscrições",
  ],
};

export const DOCUMENTOS: Documento[] = [
  { id: "d1", grupo: "formularios", titulo: "Requerimento Geral", tipo: "PDF", acessos: 412 },
  { id: "d2", grupo: "formularios", titulo: "Aproveitamento de Disciplina", tipo: "PDF", acessos: 168 },
  { id: "d3", grupo: "formularios", titulo: "Declaração de Vínculo", tipo: "PDF", acessos: 355 },
  { id: "d4", grupo: "formularios", titulo: "Trancamento de Matrícula", tipo: "PDF", acessos: 90 },
  { id: "d5", grupo: "manuais", titulo: "Regulamento Acadêmico 2026", tipo: "PDF", acessos: 501 },
  { id: "d6", grupo: "manuais", titulo: "Manual do Aluno Ingressante", tipo: "PDF", acessos: 233 },
  { id: "d7", grupo: "manuais", titulo: "Manual de TCC", tipo: "PDF", acessos: 187 },
  { id: "d8", grupo: "contatos", titulo: "Secretaria Acadêmica", tipo: "E-mail", acessos: 640 },
  { id: "d9", grupo: "contatos", titulo: "Coordenação Geral", tipo: "E-mail", acessos: 210 },
  { id: "d10", grupo: "contatos", titulo: "Ouvidoria", tipo: "E-mail", acessos: 96 },
  { id: "d11", grupo: "bibliotecas", titulo: "Portal de Periódicos CAPES", tipo: "Link", acessos: 322 },
  { id: "d12", grupo: "bibliotecas", titulo: "Biblioteca Virtual Pearson", tipo: "Link", acessos: 278 },
  { id: "d13", grupo: "bibliotecas", titulo: "Portal do Aluno", tipo: "Link", acessos: 720 },
  { id: "d14", grupo: "bibliotecas", titulo: "Sistema de Frequência", tipo: "Link", acessos: 154 },
];

export const PROJETOS: Projeto[] = [
  { id: "p1", categoria: "web-app", titulo: "Sistema de gerenciamento escolar", autoria: "Ana Ribeiro · 4º período", detalhe: "Aplicação web para secretarias." },
  { id: "p2", categoria: "ui-ux", titulo: "Dashboard administrativo", autoria: "Marcos Lima · 6º período", detalhe: "Redesenho do painel interno." },
  { id: "p3", categoria: "mobile", titulo: "Avisos em tempo real", autoria: "Júlia Prado · 5º período", detalhe: "App de notificações do mural." },
  { id: "p4", categoria: "pesquisa", titulo: "Espectrometria de baixo custo", autoria: "Lab. de Química", detalhe: "Instrumentação com hardware aberto." },
];

/** Atalhos salvos pelo usuário — abastecem o bloco 2 da sidebar. */
export const ATALHOS_SALVOS: { id: string; rotulo: string; categoria: Categoria; href: string }[] = [
  { id: "a1", rotulo: "Edital 012 · Bolsas IC", categoria: "edital", href: "/avisos/edital-012" },
  { id: "a2", rotulo: "Matrícula 2026/2", categoria: "matricula", href: "/avisos/matricula-2026-2" },
  { id: "a3", rotulo: "Requerimento Geral", categoria: "documento", href: "/documentos" },
];

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  matricula: "Matrícula",
  edital: "Edital",
  evento: "Evento",
  cancelamento: "Cancelamento",
  documento: "Documento",
};

export const ROTULO_VINCULO: Record<Vinculo, string> = {
  aluno: "Aluno",
  professor: "Professor",
  servidor: "Servidor",
};
