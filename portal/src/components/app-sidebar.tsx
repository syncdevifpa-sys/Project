import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePalette } from "@/components/command-palette";
import {
  getUsuarioSessao,
  getAvisos,
  getTarefas,
  getDocumentos,
  getEventosCalendario,
  getPessoas,
  getProjetos,
  getTotalRegistros,
  encerrarSessao,
  subscribeToDataChanges,
} from "@/state/storage";

export interface AppSidebarProps {
  colapsada?: boolean;
  onAlternar?: () => void;
  onOpenSearch?: () => void;
}

export function AppSidebar({ onOpenSearch }: AppSidebarProps) {
  const [usuario, setUsuario] = useState(getUsuarioSessao);
  const [contadores, setContadores] = useState(() => ({
    avisos: getAvisos().length,
    tarefas: getTarefas().length,
    documentos: getDocumentos().length,
    calendario: getEventosCalendario().length,
    pessoas: getPessoas().length,
    projetos: getProjetos().length,
    total: getTotalRegistros(),
  }));

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setUsuario(getUsuarioSessao());
      setContadores({
        avisos: getAvisos().length,
        tarefas: getTarefas().length,
        documentos: getDocumentos().length,
        calendario: getEventosCalendario().length,
        pessoas: getPessoas().length,
        projetos: getProjetos().length,
        total: getTotalRegistros(),
      });
    });
    return unsubscribe;
  }, []);

  const itensPortal = [
    { rotulo: "Painel", href: "/", count: null },
    { rotulo: "Avisos", href: "/avisos", count: contadores.avisos },
    { rotulo: "Tarefas", href: "/tarefas", count: contadores.tarefas },
    { rotulo: "Documentos", href: "/documentos", count: contadores.documentos },
    { rotulo: "Calendário", href: "/calendario", count: contadores.calendario },
  ];

  const itensRegistros = [
    { rotulo: "Pessoas", href: "/pessoas", count: contadores.pessoas },
    { rotulo: "Projetos", href: "/projetos", count: contadores.projetos },
  ];

  const getIniciais = (nome: string) => {
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  let paletteAbrir: (() => void) | null = null;
  try {
    const palette = usePalette();
    paletteAbrir = () => palette.abrir("tudo");
  } catch {
    // Fora do provider
  }

  const handleSearchClick = onOpenSearch || paletteAbrir || undefined;

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#121620] p-4 text-white shadow-2xl">
      {/* Bloco Superior: Marca e Busca */}
      <div>
        <div className="flex items-center gap-3 pl-1 pt-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-black bg-[#d8d1ff] text-sm font-extrabold text-[#10141A]">
            A
          </div>
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-white leading-none">
              Arcádia
            </h1>
            <p className="text-[9.5px] font-bold tracking-wider text-[#9ca3af] uppercase mt-0.5">
              IFPA — CAMPUS BELÉM
            </p>
          </div>
        </div>

        {/* Barra de Busca */}
        <button
          type="button"
          onClick={handleSearchClick}
          className="mt-5 flex w-full items-center justify-between rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-3.5 py-1.5 text-xs text-[#9ca3af] transition hover:border-zinc-500 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sm leading-none">⌕</span>
            <span className="text-[11.5px] font-medium text-zinc-300">Buscar nesta seção</span>
          </span>
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9.5px] font-semibold text-zinc-300">
            ⌘K
          </kbd>
        </button>

        {/* Navegação Principal */}
        <nav aria-label="Navegação do portal" className="mt-5 flex flex-col gap-1">
          {itensPortal.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
                  isActive
                    ? "border-[1.5px] border-black bg-[#bef264] font-bold text-[#10141A]"
                    : "text-zinc-200 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <span>{item.rotulo}</span>
              {item.count !== null && (
                <span className="text-xs font-semibold text-zinc-400">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}

          {/* Grupo Registros */}
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            REGISTROS
          </div>

          {itensRegistros.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
                  isActive
                    ? "border-[1.5px] border-black bg-[#bef264] font-bold text-[#10141A]"
                    : "text-zinc-200 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <span>{item.rotulo}</span>
              {item.count !== null && (
                <span className="text-xs font-semibold text-zinc-400">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bloco Inferior: Usuário e Sessão */}
      <div className="mt-6 border-t-[1.5px] border-[#2e3646] pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-black bg-[#38bdf8] text-xs font-bold text-black">
              {getIniciais(usuario.nome)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-bold text-white">
                {usuario.nome}
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9ca3af]">
                {usuario.vinculo?.toUpperCase() || "ALUNO"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={encerrarSessao}
            className="text-[11px] font-bold text-[#ef4444] hover:text-red-400 hover:underline shrink-0"
            title="Sair da conta"
          >
            Sair
          </button>
        </div>
        <p className="mt-2.5 text-left text-[10px] font-bold tracking-wider text-[#9ca3af] uppercase">
          {contadores.total} REGISTROS NO ESPAÇO
        </p>
      </div>
    </div>
  );
}

export const SidebarConteudo = AppSidebar;
