import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronsUpDown,
  CircleUser,
  FileText,
  FolderOpen,
  House,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ATALHOS_SALVOS, ROTULO_VINCULO, USUARIO_PADRAO, type Categoria } from "@/mock-data";
import { useDemo, ROTULO_ESTADO_VINCULO, type EstadoDados } from "@/state/demo";
import type { EstadoVinculo } from "@/mock-data";

const ITENS_NAV = [
  { rotulo: "Início", href: "/", icone: House },
  { rotulo: "Avisos", href: "/avisos", icone: Bell },
  { rotulo: "Documentos", href: "/documentos", icone: FileText },
  { rotulo: "Projetos", href: "/projetos", icone: FolderOpen },
  { rotulo: "Calendário", href: "/calendario", icone: CalendarDays },
  { rotulo: "Perfil", href: "/perfil", icone: CircleUser },
];

const COR_PONTO: Record<Categoria, string> = {
  matricula: "bg-matricula",
  edital: "bg-edital",
  evento: "bg-evento",
  cancelamento: "bg-cancelamento",
  documento: "bg-documento",
};

function ItemNav({
  rotulo,
  href,
  icone: Icone,
  colapsada,
}: (typeof ITENS_NAV)[number] & { colapsada: boolean }) {
  const link = (
    <NavLink
      to={href}
      end={href === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-full text-[14.5px] transition-colors",
          colapsada ? "size-10 justify-center" : "px-4 py-2.5",
          isActive
            ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
            : "text-[#B4B3AC] hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )
      }
      aria-current={undefined /* NavLink já aplica aria-current="page" */}
    >
      <Icone aria-hidden className="size-5 shrink-0" strokeWidth={1.6} />
      {!colapsada && <span>{rotulo}</span>}
    </NavLink>
  );

  if (!colapsada) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{rotulo}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarConteudo({
  colapsada = false,
  onAlternar,
}: {
  colapsada?: boolean;
  onAlternar?: () => void;
}) {
  const navigate = useNavigate();
  const { vinculo, setVinculo, dados, setDados } = useDemo();
  const usuario = USUARIO_PADRAO;

  return (
    <div className="sidebar-escura flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* bloco 1 — marca + navegação */}
      <div className={cn("flex items-center", colapsada ? "flex-col gap-3 px-3 pt-5" : "justify-between pl-7 pr-4 pt-6")}>
        {!colapsada && (
          <NavLink to="/" className="text-[20px] font-bold tracking-tight">
            Arcádia
          </NavLink>
        )}
        {onAlternar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAlternar}
                aria-label={colapsada ? "Expandir navegação" : "Recolher navegação"}
                className="flex size-9 items-center justify-center rounded-full text-[#B4B3AC] transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                {colapsada ? (
                  <PanelLeftOpen aria-hidden className="size-5" strokeWidth={1.6} />
                ) : (
                  <PanelLeftClose aria-hidden className="size-5" strokeWidth={1.6} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {colapsada ? "Expandir" : "Recolher"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav aria-label="Navegação principal" className={cn("mt-6", colapsada ? "px-3" : "px-4")}>
        {!colapsada && (
          <p className="micro-label mb-3 px-4 text-[#A3A29B]">Portal</p>
        )}
        <ul className={cn("flex flex-col gap-1", colapsada && "items-center")}>
          {ITENS_NAV.map((item) => (
            <li key={item.href} className={cn(!colapsada && "w-full")}>
              <ItemNav {...item} colapsada={colapsada} />
            </li>
          ))}
        </ul>
      </nav>

      {/* bloco 2 — atalhos salvos */}
      <div className={cn("mt-6 border-t border-sidebar-border pt-5", colapsada ? "px-3" : "px-4")}>
        {!colapsada && (
          <p className="micro-label mb-3 px-4 text-[#A3A29B]">Atalhos</p>
        )}
        {ATALHOS_SALVOS.length === 0 ? (
          !colapsada && (
            <p className="px-4 text-[13px] leading-snug text-[#A3A29B]">
              Salve um aviso para acessá-lo aqui.
            </p>
          )
        ) : (
          <ul className={cn("flex flex-col gap-1", colapsada && "items-center")}>
            {ATALHOS_SALVOS.map((atalho) => {
              const item = (
                <NavLink
                  to={atalho.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full text-[13.5px] text-[#B4B3AC] transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    colapsada ? "size-10 justify-center" : "px-4 py-2",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", COR_PONTO[atalho.categoria])}
                  />
                  {!colapsada && <span className="truncate">{atalho.rotulo}</span>}
                </NavLink>
              );
              return (
                <li key={atalho.id} className={cn(!colapsada && "w-full")}>
                  {colapsada ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{item}</TooltipTrigger>
                      <TooltipContent side="right">{atalho.rotulo}</TooltipContent>
                    </Tooltip>
                  ) : (
                    item
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* bloco 3 — identidade */}
      <div className={cn("mt-auto border-t border-sidebar-border", colapsada ? "px-3 py-4" : "px-4 py-4")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl text-left transition-colors hover:bg-sidebar-accent",
                colapsada ? "justify-center p-2" : "px-4 py-3",
              )}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[13px] font-bold text-sidebar-primary-foreground"
              >
                {usuario.nome.charAt(0)}
              </span>
              {!colapsada && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="micro-label block truncate text-sidebar-foreground">
                      {usuario.nome}
                    </span>
                    <span className="micro-label block truncate text-[#A3A29B]">
                      {ROTULO_VINCULO[usuario.vinculo]}
                      {usuario.periodo ? ` · ${usuario.periodo.replace(" período", " per.")}` : ""}
                    </span>
                  </span>
                  <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-[#A3A29B]" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuItem onSelect={() => navigate("/perfil")}>
              <UserRound aria-hidden /> Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/perfil")}>
              <Settings2 aria-hidden /> Preferências
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => alert("Sessão encerrada (simulação).")}>
              <LogOut aria-hidden /> Sair
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="micro-label text-muted-foreground">
              Demonstração · vínculo
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={vinculo}
              onValueChange={(v) => setVinculo(v as EstadoVinculo)}
            >
              {(Object.keys(ROTULO_ESTADO_VINCULO) as EstadoVinculo[]).map((estado) => (
                <DropdownMenuRadioItem key={estado} value={estado}>
                  {ROTULO_ESTADO_VINCULO[estado]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="micro-label text-muted-foreground">
              Demonstração · dados
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={dados}
              onValueChange={(v) => setDados(v as EstadoDados)}
            >
              {(["normal", "carregando", "vazio", "erro"] as const).map((estado) => (
                <DropdownMenuRadioItem key={estado} value={estado} className="capitalize">
                  {estado}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
