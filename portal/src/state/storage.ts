import {
  AVISOS_INICIAIS,
  TAREFAS_INICIAIS,
  DOCUMENTOS_INICIAIS,
  EVENTOS_CALENDARIO_INICIAIS,
  PESSOAS_INICIAIS,
  PROJETOS_INICIAIS,
  USUARIO_PADRAO,
  type Aviso,
  type Tarefa,
  type Documento,
  type EventoCalendario,
  type Pessoa,
  type Projeto,
  type Usuario,
} from "@/mock-data";

// Chaves do localStorage
const KEYS = {
  SESSAO: "arcadiaSessao",
  USUARIOS: "arcadiaUsuarios",
  AVISOS: "arcadia_avisos",
  TAREFAS: "arcadia_tarefas",
  DOCUMENTOS: "arcadia_documentos",
  CALENDARIO: "arcadia_calendario",
  PESSOAS: "arcadia_pessoas",
  PROJETOS: "arcadia_projetos",
};

// Event emitter simples para reatividade entre componentes
type Listener = () => void;
const listeners = new Set<Listener>();

function notificarMudanca() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToDataChanges(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ---- Sessão do Usuário ----
export function getUsuarioSessao(): Usuario {
  try {
    const raw = localStorage.getItem(KEYS.SESSAO);
    if (raw) {
      const sessao = JSON.parse(raw);
      if (sessao.nome) {
        return {
          id: String(sessao.id || "1"),
          nome: sessao.nome,
          email: sessao.email || USUARIO_PADRAO.email,
          vinculo: (sessao.vinculo?.toLowerCase() as any) || USUARIO_PADRAO.vinculo,
          curso: sessao.curso || USUARIO_PADRAO.curso,
          matricula: sessao.matricula || USUARIO_PADRAO.matricula,
        };
      }
    }
  } catch {}
  return USUARIO_PADRAO;
}

export function salvarUsuarioSessao(usuario: Partial<Usuario>): void {
  const atual = getUsuarioSessao();
  const atualizado = { ...atual, ...usuario };
  localStorage.setItem(KEYS.SESSAO, JSON.stringify(atualizado));
  notificarMudanca();
}

export function encerrarSessao(): void {
  try {
    fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  localStorage.removeItem(KEYS.SESSAO);
  window.location.href = "/login.html";
}

// ---- Avisos ----
export function getAvisos(): Aviso[] {
  try {
    const raw = localStorage.getItem(KEYS.AVISOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.AVISOS, JSON.stringify(AVISOS_INICIAIS));
  return AVISOS_INICIAIS;
}

export function salvarAvisos(itens: Aviso[]): void {
  localStorage.setItem(KEYS.AVISOS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarAviso(novo: Omit<Aviso, "id"> & { id?: string }): Aviso {
  const itens = getAvisos();
  const criado: Aviso = {
    ...novo,
    id: novo.id || String(Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarAvisos(atualizados);

  // Tentar sincronizar em background com o backend
  try {
    fetch("/api/avisos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: criado.titulo,
        conteudo: criado.resumo,
        data: criado.data,
      }),
    }).catch(() => {});
  } catch {}

  return criado;
}

export function removerAviso(id: string): void {
  const itens = getAvisos().filter((i) => i.id !== id);
  salvarAvisos(itens);
}

// ---- Tarefas ----
export function getTarefas(): Tarefa[] {
  try {
    const raw = localStorage.getItem(KEYS.TAREFAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.TAREFAS, JSON.stringify(TAREFAS_INICIAIS));
  return TAREFAS_INICIAIS;
}

export function salvarTarefas(itens: Tarefa[]): void {
  localStorage.setItem(KEYS.TAREFAS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarTarefa(nova: Omit<Tarefa, "id"> & { id?: string }): Tarefa {
  const itens = getTarefas();
  const criada: Tarefa = {
    ...nova,
    id: nova.id || String(Date.now()),
  };
  const atualizados = [criada, ...itens];
  salvarTarefas(atualizados);
  return criada;
}

export function removerTarefa(id: string): void {
  const itens = getTarefas().filter((i) => i.id !== id);
  salvarTarefas(itens);
}

export function alternarSituacaoTarefa(id: string): void {
  const itens = getTarefas().map((t) => {
    if (t.id === id) {
      const proximaSituacao =
        t.situacao === "Concluída"
          ? "Aberta"
          : t.situacao === "Aberta"
          ? "Em andamento"
          : "Concluída";
      return { ...t, situacao: proximaSituacao as any };
    }
    return t;
  });
  salvarTarefas(itens);
}

// ---- Documentos ----
export function getDocumentos(): Documento[] {
  try {
    const raw = localStorage.getItem(KEYS.DOCUMENTOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify(DOCUMENTOS_INICIAIS));
  return DOCUMENTOS_INICIAIS;
}

export function salvarDocumentos(itens: Documento[]): void {
  localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarDocumento(novo: Omit<Documento, "id"> & { id?: string }): Documento {
  const itens = getDocumentos();
  const criado: Documento = {
    ...novo,
    id: novo.id || String(Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarDocumentos(atualizados);

  try {
    fetch("/api/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: criado.titulo,
        descricao: `${criado.protocolo} — ${criado.tipo}`,
      }),
    }).catch(() => {});
  } catch {}

  return criado;
}

export function removerDocumento(id: string): void {
  const itens = getDocumentos().filter((i) => i.id !== id);
  salvarDocumentos(itens);
}

// ---- Calendário ----
export function getEventosCalendario(): EventoCalendario[] {
  try {
    const raw = localStorage.getItem(KEYS.CALENDARIO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.CALENDARIO, JSON.stringify(EVENTOS_CALENDARIO_INICIAIS));
  return EVENTOS_CALENDARIO_INICIAIS;
}

export function salvarEventosCalendario(itens: EventoCalendario[]): void {
  localStorage.setItem(KEYS.CALENDARIO, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarEventoCalendario(novo: Omit<EventoCalendario, "id"> & { id?: string }): EventoCalendario {
  const itens = getEventosCalendario();
  const criado: EventoCalendario = {
    ...novo,
    id: novo.id || String(Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarEventosCalendario(atualizados);
  return criado;
}

export function removerEventoCalendario(id: string): void {
  const itens = getEventosCalendario().filter((i) => i.id !== id);
  salvarEventosCalendario(itens);
}

// ---- Pessoas ----
export function getPessoas(): Pessoa[] {
  try {
    const raw = localStorage.getItem(KEYS.PESSOAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.PESSOAS, JSON.stringify(PESSOAS_INICIAIS));
  return PESSOAS_INICIAIS;
}

export function salvarPessoas(itens: Pessoa[]): void {
  localStorage.setItem(KEYS.PESSOAS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarPessoa(nova: Omit<Pessoa, "id"> & { id?: string }): Pessoa {
  const itens = getPessoas();
  const criada: Pessoa = {
    ...nova,
    id: nova.id || String(Date.now()),
  };
  const atualizados = [criada, ...itens];
  salvarPessoas(atualizados);
  return criada;
}

export function removerPessoa(id: string): void {
  const itens = getPessoas().filter((i) => i.id !== id);
  salvarPessoas(itens);
}

// ---- Projetos ----
export function getProjetos(): Projeto[] {
  try {
    const raw = localStorage.getItem(KEYS.PROJETOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.PROJETOS, JSON.stringify(PROJETOS_INICIAIS));
  return PROJETOS_INICIAIS;
}

export function salvarProjetos(itens: Projeto[]): void {
  localStorage.setItem(KEYS.PROJETOS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarProjeto(novo: Omit<Projeto, "id"> & { id?: string }): Projeto {
  const itens = getProjetos();
  const criado: Projeto = {
    ...novo,
    id: novo.id || String(Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarProjetos(atualizados);

  try {
    fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: criado.titulo,
        categoria: criado.eixo,
        link: criado.autor,
      }),
    }).catch(() => {});
  } catch {}

  return criado;
}

export function removerProjeto(id: string): void {
  const itens = getProjetos().filter((i) => i.id !== id);
  salvarProjetos(itens);
}

// ---- Contagem Total de Registros ----
export function getTotalRegistros(): number {
  return (
    getAvisos().length +
    getTarefas().length +
    getDocumentos().length +
    getEventosCalendario().length +
    getPessoas().length +
    getProjetos().length
  );
}
