import { useState, useMemo, useEffect } from "react";
import { MetricCard } from "@/components/metric-card";
import { ViewControls, type ViewMode } from "@/components/view-controls";
import { SelectionBar } from "@/components/selection-bar";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { type Aviso } from "@/mock-data";
import {
  getAvisos,
  adicionarAviso,
  removerAviso,
  salvarAvisos,
  subscribeToDataChanges,
} from "@/state/storage";
import { cn } from "@/lib/utils";

export default function Avisos() {
  const [itens, setItens] = useState<Aviso[]>(getAvisos);
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [activeFilter, setActiveFilter] = useState("Tudo");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [camposAberto, setCamposAberto] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState({
    titulo: true,
    resumo: true,
    categoria: true,
    publico: true,
    data: true,
    situacao: true,
  });

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getAvisos());
    });
    return unsubscribe;
  }, []);

  const categorias = ["Tudo", "Matrícula", "Edital", "Evento", "Cancelamento", "Calendário"];

  const getCategoriaDisplay = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "matricula": return "Matrícula";
      case "edital": return "Edital";
      case "evento": return "Evento";
      case "cancelamento": return "Cancelamento";
      case "calendario": return "Calendário";
      default: return cat;
    }
  };

  const getCategoriaBadgeClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "matricula": return "bg-[#8ae4f9] text-[#10141A] border-black";
      case "edital": return "bg-[#16a34a] text-white border-transparent";
      case "evento": return "bg-[#facc15] text-[#10141A] border-black";
      case "cancelamento": return "bg-[#ef4444] text-white border-transparent";
      case "calendario": return "bg-[#ffbac4] text-[#10141A] border-black";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getSituacaoBadge = (sit: string) => {
    switch (sit) {
      case "Publicado":
        return "bg-[#16a34a] text-white border-transparent";
      case "Rascunho":
        return "bg-[#181e2b] text-zinc-200 border-[#2e3646]";
      case "Arquivado":
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
      default:
        return "bg-[#181e2b] text-zinc-200 border-[#2e3646]";
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
    if (confirm(`Deseja excluir os ${selectedIds.length} avisos selecionados?`)) {
      const restantes = itens.filter((i) => !selectedIds.includes(i.id));
      salvarAvisos(restantes);
      setSelectedIds([]);
    }
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Título,Resumo,Categoria,Público,Data,Situação"]
        .concat(
          filteredItens.map(
            (i) =>
              `"${i.titulo}","${i.resumo}","${getCategoriaDisplay(i.categoria)}","${i.publico}","${i.data}","${i.situacao}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "avisos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNovoRegistro = (novo: any) => {
    adicionarAviso({
      titulo: novo.titulo,
      resumo: novo.resumo,
      categoria: novo.categoria.toLowerCase(),
      publico: novo.publico,
      data: novo.data || "Hoje",
      situacao: novo.situacao as any,
    });
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Avisos
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
            Novo aviso &rarr;
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total em avisos"
          value={itens.length}
          sublabel="REGISTROS CRIADOS"
          badgeText="INCLUI RASCUNHOS"
          badgeVariant="lime"
        />
        <MetricCard
          title="Na visão atual"
          value={filteredItens.length}
          sublabel={activeFilter === "Tudo" ? "SEM FILTRO APLICADO" : `FILTRO: ${activeFilter.toUpperCase()}`}
          badgeText={activeFilter === "Tudo" ? "MOSTRANDO TUDO" : "FILTRADO"}
          badgeVariant="cyan"
        />
        <MetricCard
          title="Em 3 grupos"
          value={3}
          sublabel="SITUAÇÕES DISTINTAS"
          badgeText="3 SITUAÇÕES EM USO"
          badgeVariant="lavender"
        />
      </div>

      {/* Controles de Visualização */}
      <div className="relative">
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
          onToggleCampos={() => setCamposAberto((v) => !v)}
        />
      </div>

      {/* Popover Colunas Visíveis */}
      {camposAberto && (
        <div className="mb-4 rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#121620] p-4 shadow-xl animate-in fade-in duration-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block mb-2">
            COLUNAS VISÍVEIS
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["titulo", "Título do aviso"],
                ["resumo", "Resumo"],
                ["categoria", "Categoria"],
                ["publico", "Público"],
                ["data", "Data de referência"],
                ["situacao", "Situação"],
              ] as const
            ).map(([key, label]) => {
              const ativo = colunasVisiveis[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setColunasVisiveis((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  className={cn(
                    "rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition",
                    ativo
                      ? "border-black bg-[#bef264] text-[#10141A]"
                      : "border-[#2e3646] bg-[#181e2b] text-zinc-300 hover:text-white"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado Vazio */}
      {filteredItens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-12 text-center shadow-md">
          <span className="mb-3 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            AVISOS
          </span>
          <h3 className="text-2xl font-extrabold text-white mb-2">
            Nenhum aviso publicado ainda
          </h3>
          <p className="max-w-md text-sm text-[#9ca3af] mb-6">
            Cada aviso criado aqui entra no mural com categoria, público e data.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Novo aviso &rarr;
          </button>
        </div>
      ) : viewMode === "tabela" ? (
        /* Visualização: Tabela */
        <div className="overflow-x-auto rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-[#2e3646] bg-[#121620] text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex size-5 mx-auto items-center justify-center rounded-full border-[1.5px] border-zinc-500 hover:border-white transition"
                    aria-label="Selecionar todos"
                  >
                    {selectedIds.length === filteredItens.length && (
                      <span className="size-2.5 rounded-full bg-[#bef264]" />
                    )}
                  </button>
                </th>
                {colunasVisiveis.titulo && (
                  <th className="px-4 py-3 text-white">
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setSortAscending(!sortAscending)}>
                      <span>TÍTULO DO AVISO</span>
                      <span className="text-[#bef264]">{sortAscending ? "↑" : "↓"}</span>
                    </div>
                  </th>
                )}
                {colunasVisiveis.resumo && <th className="px-4 py-3">RESUMO ⇅</th>}
                {colunasVisiveis.categoria && <th className="px-4 py-3">CATEGORIA ⇅</th>}
                {colunasVisiveis.publico && <th className="px-4 py-3">PÚBLICO ⇅</th>}
                {colunasVisiveis.data && <th className="px-4 py-3">DATA ⇅</th>}
                {colunasVisiveis.situacao && <th className="px-4 py-3">SITUAÇÃO ⇅</th>}
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
                        aria-label={`Selecionar ${item.titulo}`}
                      >
                        {isSelected && <span className="size-2.5 rounded-full bg-[#bef264]" />}
                      </button>
                    </td>
                    {colunasVisiveis.titulo && (
                      <td className="px-4 py-3.5 font-bold text-white">
                        {item.titulo}
                      </td>
                    )}
                    {colunasVisiveis.resumo && (
                      <td className="px-4 py-3.5 text-xs text-[#9ca3af] max-w-[220px] truncate">
                        {item.resumo}
                      </td>
                    )}
                    {colunasVisiveis.categoria && (
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
                    )}
                    {colunasVisiveis.publico && (
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "rounded-full border-[1.5px] px-3 py-0.5 text-xs font-bold",
                            item.publico === "Aluno"
                              ? "border-black bg-[#8ae4f9] text-[#10141A]"
                              : "border-[#2e3646] bg-[#121620] text-zinc-300"
                          )}
                        >
                          {item.publico}
                        </span>
                      </td>
                    )}
                    {colunasVisiveis.data && (
                      <td className="px-4 py-3.5 text-xs font-semibold text-[#9ca3af]">
                        {item.data}
                      </td>
                    )}
                    {colunasVisiveis.situacao && (
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-block rounded-full border px-3 py-0.5 text-xs font-bold",
                            getSituacaoBadge(item.situacao)
                          )}
                        >
                          {item.situacao}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir o aviso "${item.titulo}"?`)) {
                            removerAviso(item.id);
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 font-semibold transition"
                        title="Excluir aviso"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-[#2e3646] px-5 py-3 text-xs bg-[#121620]">
            <span className="font-bold text-[#9ca3af] uppercase tracking-wider text-[10.5px]">
              MOSTRANDO TODOS OS {filteredItens.length}
            </span>
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-3.5 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            >
              + Novo registro
            </button>
          </div>
        </div>
      ) : viewMode === "quadro" ? (
        /* Visualização: Quadro Kanban */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["Rascunho", "Publicado", "Arquivado"] as const).map((sit) => {
            const grupoItens = filteredItens.filter((i) => i.situacao === sit);
            return (
              <div
                key={sit}
                className="rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-4 shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider",
                      getSituacaoBadge(sit)
                    )}
                  >
                    {sit} {grupoItens.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {grupoItens.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border-[1.5px] border-[#2e3646] p-3.5 bg-[#121620] shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="font-bold text-sm text-white">
                          {item.titulo}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removerAviso(item.id)}
                          className="text-xs text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-[#9ca3af] mb-2.5 line-clamp-2">
                        {item.resumo}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#2e3646] text-xs">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                            getCategoriaBadgeClass(item.categoria)
                          )}
                        >
                          {getCategoriaDisplay(item.categoria)}
                        </span>
                        <span className="font-semibold text-[#9ca3af]">{item.data}</span>
                      </div>
                    </div>
                  ))}
                  {grupoItens.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#9ca3af]">Nenhum registro</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização: Lista */
        <div className="flex flex-col gap-3">
          {filteredItens.map((item) => (
            <div
              key={item.id}
              className="flex flex-col md:flex-row md:items-center justify-between rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-5 shadow-md gap-3"
            >
              <div>
                <h4 className="text-base font-extrabold text-white mb-1">
                  {item.titulo}
                </h4>
                <p className="text-xs text-[#9ca3af]">{item.resumo}</p>
              </div>
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getCategoriaBadgeClass(item.categoria)
                  )}
                >
                  {getCategoriaDisplay(item.categoria)}
                </span>
                <span className="text-xs font-semibold text-[#9ca3af]">
                  {item.data}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getSituacaoBadge(item.situacao)
                  )}
                >
                  {item.situacao}
                </span>
                <button
                  type="button"
                  onClick={() => removerAviso(item.id)}
                  className="ml-2 text-xs text-zinc-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Selection Bar */}
      <SelectionBar
        count={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onDelete={handleExcluirSelecionados}
        onExport={handleExportar}
      />

      {/* Modal Novo Registro */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleNovoRegistro}
        tipoRegistro="Aviso"
      />
    </div>
  );
}
