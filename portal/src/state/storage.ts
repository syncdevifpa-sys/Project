import {
  LINKS_UTEIS_INICIAIS,
  type Aviso,
  type Tarefa,
  type Documento,
  type EventoCalendario,
  type Pessoa,
  type Projeto,
  type Usuario,
  type Lembrete,
  type LinkUtil,
} from "@/mock-data";
import { api, getToken } from "@/lib/api";

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
  LEMBRETES: "arcadia_lembretes",
  LINKS_UTEIS: "arcadia_links_uteis",
  CATEGORIAS: "arcadia_categorias",
};

// Limpeza inicial automática de dados simulados anteriores para o sistema iniciar limpo "do zero"
const STORAGE_CLEAN_VERSION_KEY = "arcadia_zero_v4";
if (typeof window !== "undefined") {
  const version = localStorage.getItem(STORAGE_CLEAN_VERSION_KEY);
  if (!version) {
    localStorage.setItem(KEYS.AVISOS, JSON.stringify([]));
    localStorage.setItem(KEYS.TAREFAS, JSON.stringify([]));
    localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify([]));
    localStorage.setItem(KEYS.CALENDARIO, JSON.stringify([]));
    localStorage.setItem(KEYS.PESSOAS, JSON.stringify([]));
    localStorage.setItem(KEYS.PROJETOS, JSON.stringify([]));
    localStorage.setItem(KEYS.LEMBRETES, JSON.stringify([]));
    localStorage.setItem(STORAGE_CLEAN_VERSION_KEY, "clean_zero");
  }
}

// Event emitter para reatividade global
type Listener = () => void;
const listeners = new Set<Listener>();

export function notificarMudanca() {
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

// ---- Sincronização em Background com o Backend ----
let sincronizacaoIniciada = false;

export async function sincronizarComBackend(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Carregar perfil do usuário do backend apenas se houver token ativo
    const tokenAtual = getToken();
    if (tokenAtual) {
      api.get("/api/auth/perfil")
        .then((user) => {
          if (user && user.nome) {
            const sessaoLocal = getUsuarioSessao();
            const raw = localStorage.getItem(KEYS.SESSAO);
            let sessaoAnterior: any = {};
            try {
              if (raw) sessaoAnterior = JSON.parse(raw);
            } catch {}

            const merged: Usuario & { token?: string; logado?: boolean } = {
              ...sessaoAnterior,
              id: String(user.id || sessaoAnterior.id || (sessaoLocal ? sessaoLocal.id : "1")),
              nome: user.nome,
              email: user.email || sessaoAnterior.email || (sessaoLocal ? sessaoLocal.email : ""),
              vinculo: (user.vinculo?.toLowerCase() as any) || sessaoAnterior.vinculo || (sessaoLocal ? sessaoLocal.vinculo : "aluno"),
              matricula: user.matricula || sessaoAnterior.matricula || (sessaoLocal ? sessaoLocal.matricula : ""),
              curso: user.curso || sessaoAnterior.curso || (sessaoLocal ? sessaoLocal.curso : ""),
              token: tokenAtual,
              logado: true,
            };
            localStorage.setItem(KEYS.SESSAO, JSON.stringify(merged));
            localStorage.setItem("arcadiaToken", tokenAtual);
            notificarMudanca();
          }
        })
        .catch((err) => {
          if (err && String(err.message).includes("401")) {
            console.warn("Sessão expirada no backend:", err.message);
            encerrarSessao();
          }
        });
    }

    // 2. Avisos
    api.get<{ avisos: Aviso[] }>("/api/avisos")
      .then((data) => {
        if (data && Array.isArray(data.avisos)) {
          localStorage.setItem(KEYS.AVISOS, JSON.stringify(data.avisos));
          notificarMudanca();
        }
      })
      .catch(() => {});

    // 3. Tarefas
    api.get<{ tarefas: Tarefa[] }>("/api/tarefas")
      .then((data) => {
        if (data && Array.isArray(data.tarefas)) {
          localStorage.setItem(KEYS.TAREFAS, JSON.stringify(data.tarefas));
          notificarMudanca();
        }
      })
      .catch(() => {});

    // 4. Documentos
    api.get<{ documentos: Documento[] }>("/api/documentos")
      .then((data) => {
        if (data && Array.isArray(data.documentos)) {
          localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify(data.documentos));
          notificarMudanca();
        }
      })
      .catch(() => {});

    // 5. Calendário
    api.get<{ eventos: EventoCalendario[] }>("/api/calendario")
      .then((data) => {
        if (data && Array.isArray(data.eventos)) {
          localStorage.setItem(KEYS.CALENDARIO, JSON.stringify(data.eventos));
          notificarMudanca();
        }
      })
      .catch(() => {});

    // 6. Pessoas
    api.get<{ pessoas: Pessoa[] }>("/api/pessoas")
      .then((data) => {
        if (data && Array.isArray(data.pessoas)) {
          localStorage.setItem(KEYS.PESSOAS, JSON.stringify(data.pessoas));
          notificarMudanca();
        }
      })
      .catch(() => {});

    // 7. Projetos
    api.get<{ projetos: Projeto[] }>("/api/projetos")
      .then((data) => {
        if (data && Array.isArray(data.projetos)) {
          localStorage.setItem(KEYS.PROJETOS, JSON.stringify(data.projetos));
          notificarMudanca();
        }
      })
      .catch(() => {});

    // 8. Lembretes (RF08)
    api.get<{ lembretes: Lembrete[] }>("/api/lembretes")
      .then((data) => {
        if (data && Array.isArray(data.lembretes)) {
          localStorage.setItem(KEYS.LEMBRETES, JSON.stringify(data.lembretes));
          notificarMudanca();
        }
      })
      .catch(() => {});
  } catch (err) {
    console.warn("Sincronização em segundo plano não pôde ser completada:", err);
  }
}

// Disparar sincronização inicial
if (typeof window !== "undefined" && !sincronizacaoIniciada) {
  sincronizacaoIniciada = true;
  setTimeout(sincronizarComBackend, 100);
}

// ---- Sessão do Usuário ----
export function getUsuarioSessao(): Usuario | null {
  try {
    const raw = localStorage.getItem(KEYS.SESSAO);
    const token = localStorage.getItem("arcadiaToken");
    if (raw) {
      const sessao = JSON.parse(raw);
      if (sessao.nome && (sessao.logado || sessao.token || token)) {
        return {
          id: String(sessao.id || "1"),
          nome: sessao.nome,
          email: sessao.email || "",
          vinculo: (sessao.vinculo?.toLowerCase() as any) || "aluno",
          curso: sessao.curso || "",
          matricula: sessao.matricula || "",
        };
      }
    }
  } catch {}
  return null;
}

export function definirSessao(usuario: Usuario, token?: string): void {
  const sessao = {
    ...usuario,
    token: token || "",
    logado: true,
  };
  localStorage.setItem(KEYS.SESSAO, JSON.stringify(sessao));
  if (token) {
    localStorage.setItem("arcadiaToken", token);
  }
  notificarMudanca();
  sincronizarComBackend();
}

export function salvarUsuarioSessao(usuario: Partial<Usuario> & { nomeSocial?: string; emailPessoal?: string; telefone?: string; sobre?: string; preferences?: any }): void {
  const atual = getUsuarioSessao();
  if (!atual) return;
  const raw = localStorage.getItem(KEYS.SESSAO);
  let sessaoAnterior: any = {};
  try {
    if (raw) sessaoAnterior = JSON.parse(raw);
  } catch {}
  const atualizado = {
    ...sessaoAnterior,
    ...atual,
    ...usuario,
    logado: true,
    token: sessaoAnterior.token || localStorage.getItem("arcadiaToken") || "",
  };
  localStorage.setItem(KEYS.SESSAO, JSON.stringify(atualizado));
  notificarMudanca();

  // Sincronizar com o backend
  api.put("/api/auth/perfil", {
    nome: usuario.nome,
    nomeSocial: usuario.nomeSocial,
    emailPessoal: usuario.emailPessoal,
    telefone: usuario.telefone,
    sobre: usuario.sobre,
    preferences: usuario.preferences,
  }).catch((e) => console.warn("Erro ao salvar perfil no backend:", e));
}

export function encerrarSessao(): void {
  try {
    api.post("/api/auth/logout", {}).catch(() => {});
  } catch {}
  localStorage.removeItem(KEYS.SESSAO);
  localStorage.removeItem("arcadiaToken");
  notificarMudanca();
}

// ---- Avisos ----
export function getAvisos(): Aviso[] {
  try {
    const raw = localStorage.getItem(KEYS.AVISOS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.AVISOS, JSON.stringify([]));
  return [];
}

export function salvarAvisos(itens: Aviso[]): void {
  localStorage.setItem(KEYS.AVISOS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarAviso(novo: Omit<Aviso, "id"> & { id?: string }): Aviso {
  const itens = getAvisos();
  const criado: Aviso = {
    ...novo,
    id: String(novo.id || Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarAvisos(atualizados);

  // Sincronizar criação no SQLite
  api.post<{ aviso: Aviso }>("/api/avisos", {
    titulo: criado.titulo,
    resumo: criado.resumo,
    conteudo: criado.resumo,
    categoria: criado.categoria,
    publico: criado.publico,
    data: criado.data,
    situacao: criado.situacao,
    urgente: criado.categoria === "cancelamento" || criado.categoria === "matricula",
    fixado: false,
  })
    .then((res) => {
      if (res && res.aviso && res.aviso.id !== criado.id) {
        // Atualizar id retornado do backend
        const corrigidos = getAvisos().map((it) => (it.id === criado.id ? res.aviso : it));
        salvarAvisos(corrigidos);
      }
    })
    .catch(() => {});

  return criado;
}

export function removerAviso(id: string): void {
  const idStr = String(id);
  const itens = getAvisos().filter((i) => String(i.id) !== idStr);
  salvarAvisos(itens);
  api.delete(`/api/avisos/${idStr}`).catch(() => {});
}

export function removerAvisosEmLote(ids: string[]): void {
  const idsSet = new Set(ids.map(String));
  const itens = getAvisos().filter((i) => !idsSet.has(String(i.id)));
  salvarAvisos(itens);
  api.post("/api/avisos/batch-delete", { ids }).catch(() => {});
}

export function atualizarAviso(id: string, dados: Partial<Aviso>): void {
  const idStr = String(id);
  const itens = getAvisos().map((it) => (String(it.id) === idStr ? { ...it, ...dados } : it));
  salvarAvisos(itens);
  api.put(`/api/avisos/${idStr}`, dados).catch(() => {});
}

// ---- Tarefas ----
export function getTarefas(): Tarefa[] {
  try {
    const raw = localStorage.getItem(KEYS.TAREFAS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.TAREFAS, JSON.stringify([]));
  return [];
}

export function salvarTarefas(itens: Tarefa[]): void {
  localStorage.setItem(KEYS.TAREFAS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarTarefa(nova: Omit<Tarefa, "id"> & { id?: string }): Tarefa {
  const itens = getTarefas();
  const criada: Tarefa = {
    ...nova,
    id: String(nova.id || Date.now()),
  };
  const atualizados = [criada, ...itens];
  salvarTarefas(atualizados);

  api.post<{ tarefa: Tarefa }>("/api/tarefas", {
    titulo: criada.titulo,
    responsavel: criada.responsavel,
    prazo: criada.prazo,
    situacao: criada.situacao,
  })
    .then((res) => {
      if (res && res.tarefa && res.tarefa.id !== criada.id) {
        const corrigidos = getTarefas().map((it) => (it.id === criada.id ? res.tarefa : it));
        salvarTarefas(corrigidos);
      }
    })
    .catch(() => {});

  return criada;
}

export function atualizarTarefa(id: string, dados: Partial<Tarefa>): void {
  const idStr = String(id);
  const itens = getTarefas().map((t) => (String(t.id) === idStr ? { ...t, ...dados } : t));
  salvarTarefas(itens);
  api.put(`/api/tarefas/${idStr}`, dados).catch(() => {});
}

export function removerTarefa(id: string): void {
  const idStr = String(id);
  const itens = getTarefas().filter((i) => String(i.id) !== idStr);
  salvarTarefas(itens);
  api.delete(`/api/tarefas/${idStr}`).catch(() => {});
}

export function removerTarefasEmLote(ids: string[]): void {
  const idsSet = new Set(ids.map(String));
  const itens = getTarefas().filter((i) => !idsSet.has(String(i.id)));
  salvarTarefas(itens);
  api.post("/api/tarefas/batch-delete", { ids }).catch(() => {});
}

export function alternarSituacaoTarefa(id: string): void {
  const idStr = String(id);
  const tarefa = getTarefas().find((t) => String(t.id) === idStr);
  if (!tarefa) return;
  const proximaSituacao =
    tarefa.situacao === "Concluída"
      ? "Aberta"
      : tarefa.situacao === "Aberta"
      ? "Em andamento"
      : "Concluída";
  atualizarTarefa(idStr, { situacao: proximaSituacao as any });
}

// ---- Documentos ----
export function getDocumentos(): Documento[] {
  try {
    const raw = localStorage.getItem(KEYS.DOCUMENTOS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify([]));
  return [];
}

export function salvarDocumentos(itens: Documento[]): void {
  localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarDocumento(novo: Omit<Documento, "id"> & { id?: string }): Documento {
  const itens = getDocumentos();
  const criado: Documento = {
    ...novo,
    id: String(novo.id || Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarDocumentos(atualizados);

  api.post<{ documento: Documento }>("/api/documentos", {
    titulo: criado.titulo,
    protocolo: criado.protocolo,
    tipo: criado.tipo,
    situacao: criado.situacao,
    previsao: criado.previsao,
    descricao: `${criado.protocolo} · ${criado.tipo}`,
  })
    .then((res) => {
      if (res && res.documento && res.documento.id !== criado.id) {
        const corrigidos = getDocumentos().map((it) => (it.id === criado.id ? res.documento : it));
        salvarDocumentos(corrigidos);
      }
    })
    .catch(() => {});

  return criado;
}

export function removerDocumento(id: string): void {
  const idStr = String(id);
  const itens = getDocumentos().filter((i) => String(i.id) !== idStr);
  salvarDocumentos(itens);
  api.delete(`/api/documentos/${idStr}`).catch(() => {});
}

export function removerDocumentosEmLote(ids: string[]): void {
  const idsSet = new Set(ids.map(String));
  const itens = getDocumentos().filter((i) => !idsSet.has(String(i.id)));
  salvarDocumentos(itens);
  api.post("/api/documentos/batch-delete", { ids }).catch(() => {});
}

export function atualizarDocumento(id: string, dados: Partial<Documento>): void {
  const idStr = String(id);
  const itens = getDocumentos().map((it) => (String(it.id) === idStr ? { ...it, ...dados } : it));
  salvarDocumentos(itens);
  api.put(`/api/documentos/${idStr}`, dados).catch(() => {});
}

// ---- Calendário ----
export function getEventosCalendario(): EventoCalendario[] {
  try {
    const raw = localStorage.getItem(KEYS.CALENDARIO);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.CALENDARIO, JSON.stringify([]));
  return [];
}

export function salvarEventosCalendario(itens: EventoCalendario[]): void {
  localStorage.setItem(KEYS.CALENDARIO, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarEventoCalendario(novo: Omit<EventoCalendario, "id"> & { id?: string }): EventoCalendario {
  const itens = getEventosCalendario();
  const criado: EventoCalendario = {
    ...novo,
    id: String(novo.id || Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarEventosCalendario(atualizados);

  api.post<{ evento: EventoCalendario }>("/api/calendario", {
    titulo: criado.titulo,
    subtitulo: criado.subtitulo,
    categoria: criado.categoria,
    data: criado.data,
  })
    .then((res) => {
      if (res && res.evento && res.evento.id !== criado.id) {
        const corrigidos = getEventosCalendario().map((it) => (it.id === criado.id ? res.evento : it));
        salvarEventosCalendario(corrigidos);
      }
    })
    .catch(() => {});

  return criado;
}

export function removerEventoCalendario(id: string): void {
  const idStr = String(id);
  const itens = getEventosCalendario().filter((i) => String(i.id) !== idStr);
  salvarEventosCalendario(itens);
  api.delete(`/api/calendario/${idStr}`).catch(() => {});
}

export function removerEventosEmLote(ids: string[]): void {
  const idsSet = new Set(ids.map(String));
  const itens = getEventosCalendario().filter((i) => !idsSet.has(String(i.id)));
  salvarEventosCalendario(itens);
  api.post("/api/calendario/batch-delete", { ids }).catch(() => {});
}

export function atualizarEventoCalendario(id: string, dados: Partial<EventoCalendario>): void {
  const idStr = String(id);
  const itens = getEventosCalendario().map((it) => (String(it.id) === idStr ? { ...it, ...dados } : it));
  salvarEventosCalendario(itens);
  api.put(`/api/calendario/${idStr}`, dados).catch(() => {});
}

// ---- Pessoas ----
export function getPessoas(): Pessoa[] {
  try {
    const raw = localStorage.getItem(KEYS.PESSOAS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.PESSOAS, JSON.stringify([]));
  return [];
}

export function salvarPessoas(itens: Pessoa[]): void {
  localStorage.setItem(KEYS.PESSOAS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarPessoa(nova: Omit<Pessoa, "id"> & { id?: string }): Pessoa {
  const itens = getPessoas();
  const criada: Pessoa = {
    ...nova,
    id: String(nova.id || Date.now()),
  };
  const atualizados = [criada, ...itens];
  salvarPessoas(atualizados);

  api.post<{ pessoa: Pessoa }>("/api/pessoas", {
    nome: criada.nome,
    vinculo: criada.vinculo,
    cursoOuSetor: criada.cursoOuSetor,
    email: criada.email,
  })
    .then((res) => {
      if (res && res.pessoa && res.pessoa.id !== criada.id) {
        const corrigidos = getPessoas().map((it) => (it.id === criada.id ? res.pessoa : it));
        salvarPessoas(corrigidos);
      }
    })
    .catch(() => {});

  return criada;
}

export function removerPessoa(id: string): void {
  const idStr = String(id);
  const itens = getPessoas().filter((i) => String(i.id) !== idStr);
  salvarPessoas(itens);
  api.delete(`/api/pessoas/${idStr}`).catch(() => {});
}

export function removerPessoasEmLote(ids: string[]): void {
  const idsSet = new Set(ids.map(String));
  const itens = getPessoas().filter((i) => !idsSet.has(String(i.id)));
  salvarPessoas(itens);
  api.post("/api/pessoas/batch-delete", { ids }).catch(() => {});
}

export function atualizarPessoa(id: string, dados: Partial<Pessoa>): void {
  const idStr = String(id);
  const itens = getPessoas().map((it) => (String(it.id) === idStr ? { ...it, ...dados } : it));
  salvarPessoas(itens);
  api.put(`/api/pessoas/${idStr}`, dados).catch(() => {});
}

// ---- Projetos ----
export function getProjetos(): Projeto[] {
  try {
    const raw = localStorage.getItem(KEYS.PROJETOS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.PROJETOS, JSON.stringify([]));
  return [];
}

export function salvarProjetos(itens: Projeto[]): void {
  localStorage.setItem(KEYS.PROJETOS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarProjeto(novo: Omit<Projeto, "id"> & { id?: string }): Projeto {
  const itens = getProjetos();
  const criado: Projeto = {
    ...novo,
    id: String(novo.id || Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarProjetos(atualizados);

  api.post<{ projeto: Projeto }>("/api/projetos", {
    titulo: criado.titulo,
    autor: criado.autor,
    eixo: criado.eixo,
    vagas: criado.vagas,
    situacao: criado.situacao,
  })
    .then((res) => {
      if (res && res.projeto && res.projeto.id !== criado.id) {
        const corrigidos = getProjetos().map((it) => (it.id === criado.id ? res.projeto : it));
        salvarProjetos(corrigidos);
      }
    })
    .catch(() => {});

  return criado;
}

export function removerProjeto(id: string): void {
  const idStr = String(id);
  const itens = getProjetos().filter((i) => String(i.id) !== idStr);
  salvarProjetos(itens);
  api.delete(`/api/projetos/${idStr}`).catch(() => {});
}

export function removerProjetosEmLote(ids: string[]): void {
  const idsSet = new Set(ids.map(String));
  const itens = getProjetos().filter((i) => !idsSet.has(String(i.id)));
  salvarProjetos(itens);
  api.post("/api/projetos/batch-delete", { ids }).catch(() => {});
}

export function atualizarProjeto(id: string, dados: Partial<Projeto>): void {
  const idStr = String(id);
  const itens = getProjetos().map((it) => (String(it.id) === idStr ? { ...it, ...dados } : it));
  salvarProjetos(itens);
  api.put(`/api/projetos/${idStr}`, dados).catch(() => {});
}

// ---- Lembretes & Cronômetro (RF08) ----
export function getLembretes(): Lembrete[] {
  try {
    const raw = localStorage.getItem(KEYS.LEMBRETES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.LEMBRETES, JSON.stringify([]));
  return [];
}

export function salvarLembretes(itens: Lembrete[]): void {
  localStorage.setItem(KEYS.LEMBRETES, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarLembrete(novo: Omit<Lembrete, "id"> & { id?: string }): Lembrete {
  const itens = getLembretes();
  const criado: Lembrete = {
    ...novo,
    id: String(novo.id || Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarLembretes(atualizados);
  api.post("/api/lembretes", criado).catch(() => {});
  return criado;
}

export function alternarLembrete(id: string): void {
  const idStr = String(id);
  const itens = getLembretes().map((l) => (String(l.id) === idStr ? { ...l, ativo: !l.ativo } : l));
  salvarLembretes(itens);
  const alterado = itens.find((l) => String(l.id) === idStr);
  if (alterado) {
    api.put(`/api/lembretes/${idStr}`, { ativo: alterado.ativo }).catch(() => {});
  }
}

export function removerLembrete(id: string): void {
  const idStr = String(id);
  const itens = getLembretes().filter((l) => String(l.id) !== idStr);
  salvarLembretes(itens);
  api.delete(`/api/lembretes/${idStr}`).catch(() => {});
}

// ---- Links Úteis (RF09) ----
export function getLinksUteis(): LinkUtil[] {
  try {
    const raw = localStorage.getItem(KEYS.LINKS_UTEIS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  localStorage.setItem(KEYS.LINKS_UTEIS, JSON.stringify(LINKS_UTEIS_INICIAIS));
  return LINKS_UTEIS_INICIAIS;
}

export function salvarLinksUteis(itens: LinkUtil[]): void {
  localStorage.setItem(KEYS.LINKS_UTEIS, JSON.stringify(itens));
  notificarMudanca();
}

export function adicionarLinkUtil(novo: Omit<LinkUtil, "id"> & { id?: string }): LinkUtil {
  const itens = getLinksUteis();
  const criado: LinkUtil = {
    ...novo,
    id: String(novo.id || Date.now()),
  };
  const atualizados = [criado, ...itens];
  salvarLinksUteis(atualizados);
  api.post("/api/links-uteis", criado).catch(() => {});
  return criado;
}

export function removerLinkUtil(id: string): void {
  const idStr = String(id);
  const itens = getLinksUteis().filter((l) => String(l.id) !== idStr);
  salvarLinksUteis(itens);
  api.delete(`/api/links-uteis/${idStr}`).catch(() => {});
}

// ---- Limpeza Completa (Começar do Zero) ----
export function limparTodosDados(): void {
  salvarAvisos([]);
  salvarTarefas([]);
  salvarDocumentos([]);
  salvarEventosCalendario([]);
  salvarPessoas([]);
  salvarProjetos([]);
  salvarLembretes([]);
  api.post("/api/admin/limpar-dados", {}).catch(() => {});
  notificarMudanca();
}

// ---- Categorias Dinâmicas ----
export function getCategorias(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.CATEGORIAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const padrao = ["Matrícula", "Edital", "Evento", "Cancelamento", "Calendário", "Documento"];
  localStorage.setItem(KEYS.CATEGORIAS, JSON.stringify(padrao));
  return padrao;
}

export function adicionarCategoria(nome: string): void {
  const cat = nome.trim();
  if (!cat) return;
  const atuais = getCategorias();
  if (!atuais.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    const atualizadas = [...atuais, cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()];
    localStorage.setItem(KEYS.CATEGORIAS, JSON.stringify(atualizadas));
    notificarMudanca();
  }
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
