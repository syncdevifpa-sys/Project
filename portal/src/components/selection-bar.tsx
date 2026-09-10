export interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

export function SelectionBar({
  count,
  onClear,
  onExport,
  onDelete,
}: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <aside aria-label="Barra de ações para itens selecionados" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-full border border-gray-700 bg-[#10141A] px-5 py-2.5 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-150">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
        {count} {count === 1 ? "registro selecionado" : "registros selecionados"}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExport || (() => alert("Exportando seleção..."))}
          className="rounded-full border border-white/40 px-3.5 py-1 text-xs font-semibold transition hover:bg-white/10"
        >
          Exportar seleção
        </button>
        <button
          type="button"
          onClick={onDelete || (() => alert("Excluir itens selecionados?"))}
          className="rounded-full bg-[#ff5c5c] px-3.5 py-1 text-xs font-bold text-white transition hover:bg-[#e04545]"
        >
          Excluir
        </button>
        <button
          type="button"
          onClick={onClear}
          className="ml-2 text-xs text-gray-400 hover:text-white"
          title="Desmarcar todos"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
