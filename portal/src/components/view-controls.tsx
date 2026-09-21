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
    <div className="mb-6 flex flex-col gap-4">
      {/* Linha superior: Switch de visualização + Contador + Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="inline-flex items-center gap-1 rounded-full p-1 bg-slate-100/90 shadow-2xs">
          <button
            type="button"
            onClick={() => onViewModeChange("tabela")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer",
              viewMode === "tabela"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Tabela
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("quadro")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer",
              viewMode === "quadro"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Quadro
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("lista")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer",
              viewMode === "lista"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Lista
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mostrando todos os {totalCount}
          </span>
          <button
            type="button"
            onClick={onToggleCampos}
            className="rounded-full border border-slate-200/70 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Campos
          </button>
          <button
            type="button"
            onClick={onToggleSort}
            className="rounded-full border border-slate-200/70 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            {sortAscending ? "Crescente ↑" : "Decrescente ↓"}
          </button>
        </div>
      </div>

      {/* Linha inferior: Filtros de categoria/situação/vínculo */}
      {filterOptions.length > 0 && onFilterChange && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-2">
            {filterLabel}
          </span>
          {filterOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onFilterChange(opt)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeFilter === opt
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
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
