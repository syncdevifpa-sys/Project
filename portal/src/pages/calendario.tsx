import { useState, useMemo, useEffect } from "react";
import { MetricCard } from "@/components/metric-card";
import { ViewControls, type ViewMode } from "@/components/view-controls";
import { SelectionBar } from "@/components/selection-bar";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { type EventoCalendario } from "@/mock-data";
import {
  getEventosCalendario,
  adicionarEventoCalendario,
  removerEventoCalendario,
  salvarEventosCalendario,
  subscribeToDataChanges,
} from "@/state/storage";
import { cn } from "@/lib/utils";

export default function Calendario() {
  const [itens, setItens] = useState<EventoCalendario[]>(getEventosCalendario);
  const [viewMode, setViewMode] = useState<ViewMode>("lista"); // PDF Página 6 tem Lista ativo por padrão
  const [activeFilter, setActiveFilter] = useState("Tudo");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getEventosCalendario());
    });
    return unsubscribe;
  }, []);

  const categorias = ["Tudo", "Matrícula", "Cancelamento", "Evento", "Edital"];

  const getCategoriaDisplay = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "matricula": return "Matrícula";
      case "cancelamento": return "Cancelamento";
      case "evento": return "Evento";
      case "edital": return "Edital";
      default: return cat;
    }
  };

  const getCategoriaBadgeClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "matricula": return "bg-[#8ae4f9] text-[#10141A] border-black";
      case "cancelamento": return "bg-[#ef4444] text-white border-transparent";
      case "evento": return "bg-[#facc15] text-[#10141A] border-black";
      case "edital": return "bg-[#16a34a] text-white border-transparent";
      default: return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
    }
  };

  const filteredItens = useMemo(() => {
    let result = [...itens];
    if (activeFilter !== "Tudo") {
      result = result.filter(
        (item) => getCategoriaDisplay(item.categoria).toLowerCase() === activeFilter.toLowerCase()
      );
    }
    result.sort((a, b) => {
      return sortAscending
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });
    return result;
  }, [itens, activeFilter, sortAscending]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItens.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItens.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExcluirSelecionados = () => {
    if (confirm(`Deseja excluir as ${selectedIds.length} datas selecionadas?`)) {
      const restantes = itens.filter((i) => !selectedIds.includes(i.id));
      salvarEventosCalendario(restantes);
      setSelectedIds([]);
    }
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Evento,Detalhes,Categoria,Data"]
        .concat(
          filteredItens.map(
            (i) => `"${i.titulo}","${i.subtitulo}","${getCategoriaDisplay(i.categoria)}","${i.data}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "calendario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNovoEvento = (novo: any) => {
    adicionarEventoCalendario({
      titulo: novo.titulo,
      subtitulo: novo.resumo || "Evento institucional",
      categoria: novo.categoria.toLowerCase(),
      data: novo.data || "2026-09-15",
    });
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Calendário
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
            {itens.length} REGISTROS
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportar}
            className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-4 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Nova data &rarr;
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total no calendário"
          value={itens.length}
          sublabel="EVENTOS AGENDADOS"
          badgeText="SEMESTRE ATUAL"
          badgeVariant="lime"
        />
        <MetricCard
          title="Eventos acadêmicos"
          value={itens.filter((i) => i.categoria === "evento" || i.categoria === "matricula").length}
          sublabel="AULAS E MATRÍCULAS"
          badgeText="PRIORIDADE ALTA"
          badgeVariant="yellow"
        />
        <MetricCard
          title="Editais vigentes"
          value={itens.filter((i) => i.categoria === "edital").length}
          sublabel="PUBLICAÇÕES E PRAZOS"
          badgeText="VER EM EDITAIS"
          badgeVariant="lavender"
        />
      </div>

      {/* Controles de Visualização */}
      <ViewControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredItens.length}
        filterLabel="CATEGORIA"
        filterOptions={categorias}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortAscending={sortAscending}
        onToggleSort={() => setSortAscending(!sortAscending)}
      />

      {/* Conteúdo */}
      {filteredItens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-12 text-center shadow-md">
          <span className="mb-3 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            CALENDÁRIO
          </span>
          <h3 className="text-2xl font-extrabold text-white mb-2">
            Nenhuma data encontrada
          </h3>
          <p className="max-w-md text-sm text-[#9ca3af] mb-6">
            Você não possui eventos ou datas para o filtro selecionado.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Nova data &rarr;
          </button>
        </div>
      ) : viewMode === "lista" ? (
        /* Lista (PDF Página 6) */
        <div className="flex flex-col gap-3">
          {filteredItens.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col md:flex-row md:items-center justify-between rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-5 shadow-md gap-3 transition-colors hover:bg-white/[0.04]",
                  isSelected && "bg-blue-900/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectItem(item.id)}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-zinc-500 hover:border-white transition"
                    aria-label={`Selecionar ${item.titulo}`}
                  >
                    {isSelected && <span className="size-2.5 rounded-full bg-[#bef264]" />}
                  </button>
                  <div>
                    <h4 className="text-base font-extrabold text-white mb-0.5">
                      {item.titulo}
                    </h4>
                    <p className="text-xs text-[#9ca3af]">{item.subtitulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-start md:self-auto ml-8 md:ml-0">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-0.5 text-xs font-bold",
                      getCategoriaBadgeClass(item.categoria)
                    )}
                  >
                    {getCategoriaDisplay(item.categoria)}
                  </span>
                  <span className="text-xs font-bold text-[#9ca3af] w-16 text-right">
                    {item.data}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir a data "${item.titulo}"?`)) {
                        removerEventoCalendario(item.id);
                      }
                    }}
                    className="ml-2 text-xs text-zinc-500 hover:text-red-400 font-semibold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Tabela */
        <div className="overflow-x-auto rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#2e3646] bg-[#121620] text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex size-5 mx-auto items-center justify-center rounded-full border-[1.5px] border-zinc-500 hover:border-white transition"
                  >
                    {selectedIds.length === filteredItens.length && (
                      <span className="size-2.5 rounded-full bg-[#bef264]" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-white">EVENTO</th>
                <th className="px-4 py-3">DETALHES</th>
                <th className="px-4 py-3">CATEGORIA</th>
                <th className="px-4 py-3">DATA</th>
                <th className="px-4 py-3 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242c3d]">
              {filteredItens.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "transition-colors hover:bg-white/[0.04]",
                      isSelected && "bg-blue-900/20"
                    )}
                  >
                    <td className="w-12 px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(item.id)}
                        className="flex size-5 mx-auto items-center justify-center rounded-full border-[1.5px] border-zinc-500 hover:border-white transition"
                      >
                        {isSelected && <span className="size-2.5 rounded-full bg-[#bef264]" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">
                      {item.titulo}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#9ca3af]">
                      {item.subtitulo}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-3 py-0.5 text-xs font-bold",
                          getCategoriaBadgeClass(item.categoria)
                        )}
                      >
                        {getCategoriaDisplay(item.categoria)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[#9ca3af]">
                      {item.data}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => removerEventoCalendario(item.id)}
                        className="text-xs text-zinc-500 hover:text-red-400 font-semibold"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Selection Bar */}
      <SelectionBar
        count={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onDelete={handleExcluirSelecionados}
        onExport={handleExportar}
      />

      {/* Modal Novo Evento */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleNovoEvento}
        tipoRegistro="Evento"
      />
    </div>
  );
}
