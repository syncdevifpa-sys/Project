import { useState, useMemo, useEffect } from "react";
import { MetricCard } from "@/components/metric-card";
import { ViewControls, type ViewMode } from "@/components/view-controls";
import { SelectionBar } from "@/components/selection-bar";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { type Tarefa } from "@/mock-data";
import {
  getTarefas,
  adicionarTarefa,
  removerTarefa,
  salvarTarefas,
  alternarSituacaoTarefa,
  subscribeToDataChanges,
} from "@/state/storage";
import { cn } from "@/lib/utils";

export default function Tarefas() {
  const [itens, setItens] = useState<Tarefa[]>(getTarefas);
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [activeFilter, setActiveFilter] = useState("Tudo");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getTarefas());
    });
    return unsubscribe;
  }, []);

  const situacoesFiltro = ["Tudo", "Aberta", "Em andamento", "Aguardando", "Concluída"];

  const getSituacaoBadgeClass = (sit: string) => {
    switch (sit) {
      case "Aberta":
        return "bg-[#8ae4f9] text-[#10141A] border-black";
      case "Em andamento":
        return "bg-[#facc15] text-[#10141A] border-black";
      case "Aguardando":
        return "bg-[#d8d1ff] text-[#10141A] border-black";
      case "Concluída":
        return "bg-[#16a34a] text-white border-transparent";
      default:
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
    }
  };

  const filteredItens = useMemo(() => {
    let result = [...itens];
    if (activeFilter !== "Tudo") {
      result = result.filter(
        (item) => item.situacao.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    result.sort((a, b) => {
      return sortAscending
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });
    return result;
  }, [itens, activeFilter, sortAscending]);

  const emAbertoCount = useMemo(() => {
    return itens.filter((i) => i.situacao !== "Concluída").length;
  }, [itens]);

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
    if (confirm(`Deseja excluir as ${selectedIds.length} tarefas selecionadas?`)) {
      const restantes = itens.filter((i) => !selectedIds.includes(i.id));
      salvarTarefas(restantes);
      setSelectedIds([]);
    }
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Tarefa,Responsável,Prazo,Situação"]
        .concat(
          filteredItens.map(
            (i) => `"${i.titulo}","${i.responsavel}","${i.prazo}","${i.situacao}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tarefas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNovaTarefa = (novo: any) => {
    adicionarTarefa({
      titulo: novo.titulo,
      responsavel: novo.publico || "Ana Ribeiro",
      prazo: novo.data || "Hoje",
      situacao: (novo.situacao === "Publicado" ? "Aberta" : novo.situacao) as any,
    });
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Tarefas
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
            Nova tarefa &rarr;
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total em tarefas"
          value={itens.length}
          sublabel="REGISTROS CRIADOS"
          badgeText="INCLUI CONCLUÍDAS"
          badgeVariant="lime"
        />
        <MetricCard
          title="Em aberto"
          value={emAbertoCount}
          sublabel="NÃO CONCLUÍDAS"
          badgeText="ACOMPANHE OS PRAZOS"
          badgeVariant="yellow"
        />
        <MetricCard
          title="Em 4 grupos"
          value={4}
          sublabel="SITUAÇÕES DISTINTAS"
          badgeText="4 SITUAÇÕES EM USO"
          badgeVariant="lavender"
        />
      </div>

      {/* Controles de Visualização */}
      <ViewControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredItens.length}
        filterLabel="SITUAÇÃO"
        filterOptions={situacoesFiltro}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortAscending={sortAscending}
        onToggleSort={() => setSortAscending(!sortAscending)}
      />

      {/* Conteúdo */}
      {filteredItens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-12 text-center shadow-md">
          <span className="mb-3 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            TAREFAS
          </span>
          <h3 className="text-2xl font-extrabold text-white mb-2">
            Nenhuma tarefa encontrada
          </h3>
          <p className="max-w-md text-sm text-[#9ca3af] mb-6">
            Você não possui tarefas registradas para o filtro selecionado.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Nova tarefa &rarr;
          </button>
        </div>
      ) : viewMode === "tabela" ? (
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
                    aria-label="Selecionar todos"
                  >
                    {selectedIds.length === filteredItens.length && (
                      <span className="size-2.5 rounded-full bg-[#bef264]" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-white">
                  <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setSortAscending(!sortAscending)}>
                    <span>TAREFA</span>
                    <span className="text-[#bef264]">{sortAscending ? "↑" : "↓"}</span>
                  </div>
                </th>
                <th className="px-4 py-3">RESPONSÁVEL ⇅</th>
                <th className="px-4 py-3">PRAZO ⇅</th>
                <th className="px-4 py-3">SITUAÇÃO ⇅</th>
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
                    <td className="px-4 py-3.5 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alternarSituacaoTarefa(item.id)}
                          title="Alternar estado da tarefa"
                          className={cn(
                            "size-4 rounded-full border border-zinc-500 flex items-center justify-center transition shrink-0",
                            item.situacao === "Concluída" && "bg-[#16a34a] border-transparent"
                          )}
                        >
                          {item.situacao === "Concluída" && <span className="text-[10px] text-white font-bold">✓</span>}
                        </button>
                        <span className={cn(item.situacao === "Concluída" && "line-through text-zinc-400")}>
                          {item.titulo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-zinc-300">
                      {item.responsavel}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[#9ca3af]">
                      {item.prazo}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => alternarSituacaoTarefa(item.id)}
                        title="Clique para avançar situação"
                        className={cn(
                          "inline-block rounded-full border px-3 py-0.5 text-xs font-bold transition hover:scale-105",
                          getSituacaoBadgeClass(item.situacao)
                        )}
                      >
                        {item.situacao}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir a tarefa "${item.titulo}"?`)) {
                            removerTarefa(item.id);
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 font-semibold"
                        title="Excluir tarefa"
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
        /* Quadro Kanban */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["Aberta", "Em andamento", "Aguardando", "Concluída"] as const).map((sit) => {
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
                      getSituacaoBadgeClass(sit)
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
                          onClick={() => removerTarefa(item.id)}
                          className="text-xs text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-[#9ca3af] mb-2">{item.responsavel}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#2e3646] text-xs">
                        <span className="font-semibold text-[#9ca3af]">Prazo: {item.prazo}</span>
                        <button
                          type="button"
                          onClick={() => alternarSituacaoTarefa(item.id)}
                          className="text-[10px] text-[#8ae4f9] hover:underline"
                        >
                          Avançar
                        </button>
                      </div>
                    </div>
                  ))}
                  {grupoItens.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#9ca3af]">Sem itens</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Lista */
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
                <p className="text-xs text-[#9ca3af]">Responsável: {item.responsavel}</p>
              </div>
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <span className="text-xs font-semibold text-[#9ca3af]">
                  Prazo: {item.prazo}
                </span>
                <button
                  type="button"
                  onClick={() => alternarSituacaoTarefa(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getSituacaoBadgeClass(item.situacao)
                  )}
                >
                  {item.situacao}
                </button>
                <button
                  type="button"
                  onClick={() => removerTarefa(item.id)}
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

      {/* Modal Nova Tarefa */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleNovaTarefa}
        tipoRegistro="Tarefa"
      />
    </div>
  );
}
