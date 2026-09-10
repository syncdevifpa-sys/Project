/* Dados simulados do portal — alinhados 1:1 com Arcadia Portal PDF.pdf */

export type Vinculo = "aluno" | "professor" | "servidor";
export type EstadoVinculo = "verificacao" | "verificado" | "recusado";

export type Categoria =
  | "matricula"
  | "edital"
  | "evento"
  | "cancelamento"
  | "documento"
  | "calendario";

export interface Usuario {
  id?: string;
  nome: string;
  vinculo: Vinculo;
  periodo?: string;
  curso?: string;
  email: string;
  matricula?: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  resumo: string;
  categoria: Categoria;
  publico: string;
  data: string;
  situacao: "Publicado" | "Rascunho" | "Arquivado";
}

export interface Tarefa {
  id: string;
  titulo: string;
  responsavel: string;
  prazo: string;
  situacao: "Aberta" | "Em andamento" | "Aguardando" | "Concluída";
}

export interface Documento {
  id: string;
  titulo: string;
  protocolo: string;
  tipo: "PDF" | "Requerimento" | "Assinatura" | "Link" | "E-mail";
  situacao: "Pronto" | "Em análise" | "Solicitado" | "Pendente";
  previsao: string;
}

export interface EventoCalendario {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: Categoria;
  data: string;
}

export interface Pessoa {
  id: string;
  nome: string;
  vinculo: "Aluno" | "Professor" | "Servidor";
  cursoOuSetor: string;
  email: string;
}

export interface Projeto {
  id: string;
  titulo: string;
  autor: string;
  eixo: "Pesquisa" | "Ensino" | "Extensão" | "Inovação";
  vagas: number;
  situacao: "Inscrições" | "Em seleção" | "Ativo" | "Concluído";
}

export const USUARIO_PADRAO: Usuario = {
  nome: "Ana Ribeiro",
  vinculo: "aluno",
  periodo: "4º período",
  curso: "Técnico em Informática",
  email: "ana.ribeiro@ifpa.edu.br",
  matricula: "2026104882",
};

export const ROTULO_VINCULO: Record<Vinculo, string> = {
  aluno: "Aluno",
  professor: "Professor",
  servidor: "Servidor",
};

export const AVISOS_INICIAIS: Aviso[] = [
  {
    id: "1",
    titulo: "Abertura da matrícula 2026/2",
    resumo: "Confirmação de disciplinas pelo portal",
    categoria: "matricula",
    publico: "Todos",
    data: "14 SET",
    situacao: "Publicado",
  },
  {
    id: "2",
    titulo: "Edital PIBIC 2026",
    resumo: "Bolsas de iniciação científica",
    categoria: "edital",
    publico: "Aluno",
    data: "22 SET",
    situacao: "Publicado",
  },
  {
    id: "3",
    titulo: "Semana de Ciência e Tecnologia",
    resumo: "Programação nos três turnos",
    categoria: "evento",
    publico: "Todos",
    data: "05 OUT",
    situacao: "Rascunho",
  },
  {
    id: "4",
    titulo: "Aula suspensa — Bloco C",
    resumo: "Manutenção elétrica no prédio",
    categoria: "cancelamento",
    publico: "Todos",
    data: "09 SET",
    situacao: "Publicado",
  },
  {
    id: "5",
    titulo: "Calendário do 2º semestre",
    resumo: "Datas oficiais consolidadas",
    categoria: "calendario",
    publico: "Todos",
    data: "01 SET",
    situacao: "Arquivado",
  },
];

export const TAREFAS_INICIAIS: Tarefa[] = [
  {
    id: "1",
    titulo: "Confirmar disciplinas do semestre",
    responsavel: "Ana Ribeiro",
    prazo: "12 SET",
    situacao: "Aberta",
  },
  {
    id: "2",
    titulo: "Entregar relatório de estágio",
    responsavel: "Ana Ribeiro",
    prazo: "20 SET",
    situacao: "Em andamento",
  },
  {
    id: "3",
    titulo: "Assinar termo de bolsa",
    responsavel: "Coordenação de pesquisa",
    prazo: "18 SET",
    situacao: "Aguardando",
  },
  {
    id: "4",
    titulo: "Atualizar dados cadastrais",
    responsavel: "Secretaria acadêmica",
    prazo: "05 SET",
    situacao: "Concluída",
  },
];

export const DOCUMENTOS_INICIAIS: Documento[] = [
  {
    id: "1",
    titulo: "Histórico escolar completo",
    protocolo: "2026-0001",
    tipo: "PDF",
    situacao: "Pronto",
    previsao: "08 SET",
  },
  {
    id: "2",
    titulo: "Declaração de vínculo",
    protocolo: "2026-0002",
    tipo: "Requerimento",
    situacao: "Em análise",
    previsao: "15 SET",
  },
  {
    id: "3",
    titulo: "Atestado de matrícula",
    protocolo: "2026-0003",
    tipo: "PDF",
    situacao: "Solicitado",
    previsao: "19 SET",
  },
  {
    id: "4",
    titulo: "Termo de compromisso de estágio",
    protocolo: "2026-0004",
    tipo: "Assinatura",
    situacao: "Pendente",
    previsao: "11 SET",
  },
];

export const EVENTOS_CALENDARIO_INICIAIS: EventoCalendario[] = [
  {
    id: "1",
    titulo: "Início do período de matrícula",
    subtitulo: "Portal do estudante, a partir das 8h",
    categoria: "matricula",
    data: "14 SET",
  },
  {
    id: "2",
    titulo: "Prazo final de trancamento",
    subtitulo: "Protocolo na secretaria acadêmica",
    categoria: "cancelamento",
    data: "26 SET",
  },
  {
    id: "3",
    titulo: "Semana de Ciência e Tecnologia",
    subtitulo: "Auditório central e laboratórios",
    categoria: "evento",
    data: "05 OUT",
  },
  {
    id: "4",
    titulo: "Publicação do resultado PIBIC",
    subtitulo: "Mural institucional e portal",
    categoria: "edital",
    data: "12 OUT",
  },
];

export const PESSOAS_INICIAIS: Pessoa[] = [
  {
    id: "1",
    nome: "Ana Ribeiro",
    vinculo: "Aluno",
    cursoOuSetor: "Técnico em Informática",
    email: "ana.ribeiro@ifpa.edu.br",
  },
  {
    id: "2",
    nome: "Marcos Tavares",
    vinculo: "Professor",
    cursoOuSetor: "Coordenação de Pesquisa",
    email: "marcos.tavares@ifpa.edu.br",
  },
  {
    id: "3",
    nome: "Júlia Andrade",
    vinculo: "Servidor",
    cursoOuSetor: "Secretaria Acadêmica",
    email: "julia.andrade@ifpa.edu.br",
  },
  {
    id: "4",
    nome: "Rafael Lima",
    vinculo: "Aluno",
    cursoOuSetor: "Agroecologia",
    email: "rafael.lima@ifpa.edu.br",
  },
];

export const PROJETOS_INICIAIS: Projeto[] = [
  {
    id: "1",
    titulo: "Palestra: Preservação, Biodiversidade e Bioeconomia na Amazônia",
    autor: "Prof. Dr. Mauro Santos",
    eixo: "Extensão",
    vagas: 60,
    situacao: "Inscrições",
  },
  {
    id: "2",
    titulo: "Monitoramento da Qualidade das Águas da Bacia do Guajará",
    autor: "Larissa Menezes",
    eixo: "Pesquisa",
    vagas: 6,
    situacao: "Ativo",
  },
  {
    id: "3",
    titulo: "Robótica Educacional com Reaproveitamento de Sucata",
    autor: "Júlia Andrade",
    eixo: "Ensino",
    vagas: 8,
    situacao: "Em seleção",
  },
  {
    id: "4",
    titulo: "Mapeamento Colaborativo de Saberes Tradicionais e Etnobotânica",
    autor: "Rafael Lima",
    eixo: "Inovação",
    vagas: 12,
    situacao: "Ativo",
  },
];

export const ATALHOS_SALVOS = [
  { id: "1", rotulo: "Edital PIBIC 2026", categoria: "edital" as Categoria, href: "/avisos" },
  { id: "2", rotulo: "Matrícula veteranos", categoria: "matricula" as Categoria, href: "/avisos" },
];

export const AVISOS = AVISOS_INICIAIS;
export const DOCUMENTOS = DOCUMENTOS_INICIAIS;
export const PROJETOS = PROJETOS_INICIAIS;

export const ROTULO_CATEGORIA: Record<string, string> = {
  matricula: "Matrícula",
  edital: "Edital",
  evento: "Evento",
  cancelamento: "Cancelamento",
  documento: "Documento",
  calendario: "Calendário",
};

export const PASSOS_ONBOARDING = [
  { id: "curso", rotulo: "Confirmar dados do curso" },
  { id: "categorias", rotulo: "Explorar categorias de avisos" },
  { id: "documentos", rotulo: "Verificar pendências de documentos" },
];

