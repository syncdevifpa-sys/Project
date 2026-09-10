import { cn } from "@/lib/utils";

export type ViewMode = "tabela" | "quadro" | "lista";

export interface ViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  filterLabel?: string;
  filterOptions?: string[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  sortAscending?: boolean;
  onToggleSort?: () => void;
  onToggleCampos?: () => void;
}

export function ViewControls({
  viewMode,
  onViewModeChange,
  totalCount,
  filterLabel = "CATEGORIA",
  filterOptions = ["Tudo"],
  activeFilter = "Tudo",
  onFilterChange,
  sortAscending = true,
  onToggleSort,
  onToggleCampos,
}: ViewControlsProps) {
  return (
    <div className="mb-6 flex flex-col gap-3.5">
      {/* Linha superior: Switch de visualização + Contador + Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#2e3646] p-1 bg-[#181e2b]">
          <button
            type="button"
            onClick={() => onViewModeChange("tabela")}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-bold transition-colors",
              viewMode === "tabela"
                ? "bg-[#bef264] text-[#10141A] border-[1.5px] border-black"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            )}
          >
            Tabela
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("quadro")}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-bold transition-colors",
              viewMode === "quadro"
                ? "bg-[#bef264] text-[#10141A] border-[1.5px] border-black"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            )}
          >
            Quadro
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("lista")}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-bold transition-colors",
              viewMode === "lista"
                ? "bg-[#bef264] text-[#10141A] border-[1.5px] border-black"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            )}
          >
            Lista
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
            Mostrando todos os {totalCount}
          </span>
          <button
            type="button"
            onClick={onToggleCampos}
            className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-3.5 py-1 text-xs font-bold text-white hover:bg-white/10 transition"
          >
            Campos
          </button>
          <button
            type="button"
            onClick={onToggleSort}
            className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-3.5 py-1 text-xs font-bold text-white hover:bg-white/10 transition"
          >
            {sortAscending ? "Crescente ↑" : "Decrescente ↓"}
          </button>
        </div>
      </div>

      {/* Linha inferior: Filtros de categoria/situação/vínculo */}
      {filterOptions.length > 0 && onFilterChange && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af] mr-1">
            {filterLabel}
          </span>
          {filterOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onFilterChange(opt)}
              className={cn(
                "rounded-full px-4 py-1 text-xs font-bold border-[1.5px] transition-colors",
                activeFilter === opt
                  ? "bg-[#bef264] text-[#10141A] border-black"
                  : "bg-[#181e2b] text-zinc-300 border-[#2e3646] hover:border-zinc-500 hover:text-white"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
