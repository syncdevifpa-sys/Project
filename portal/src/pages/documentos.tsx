import { useState, useMemo, useEffect } from "react";
import { MetricCard } from "@/components/metric-card";
import { ViewControls, type ViewMode } from "@/components/view-controls";
import { SelectionBar } from "@/components/selection-bar";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { type Documento } from "@/mock-data";
import {
  getDocumentos,
  adicionarDocumento,
  removerDocumento,
  salvarDocumentos,
  subscribeToDataChanges,
} from "@/state/storage";
import { cn } from "@/lib/utils";

export default function Documentos() {
  const [itens, setItens] = useState<Documento[]>(getDocumentos);
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [activeFilter, setActiveFilter] = useState("Tudo");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getDocumentos());
    });
    return unsubscribe;
  }, []);

  const situacoesFiltro = ["Tudo", "Solicitado", "Em análise", "Pronto", "Pendente"];

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case "PDF":
        return "bg-[#facc15] text-[#10141A] border-black";
      case "Requerimento":
        return "bg-[#d8d1ff] text-[#10141A] border-black";
      case "Assinatura":
        return "bg-[#fbbf24] text-[#10141A] border-black";
      default:
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
    }
  };

  const getSituacaoBadgeClass = (sit: string) => {
    switch (sit) {
      case "Pronto":
        return "bg-[#16a34a] text-white border-transparent";
      case "Em análise":
        return "bg-[#facc15] text-[#10141A] border-black";
      case "Solicitado":
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
      case "Pendente":
        return "bg-[#ef4444] text-white border-transparent";
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

  const emCursoCount = useMemo(() => {
    return itens.filter((i) => i.situacao === "Solicitado" || i.situacao === "Em análise").length;
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
    if (confirm(`Deseja excluir os ${selectedIds.length} documentos selecionados?`)) {
      const restantes = itens.filter((i) => !selectedIds.includes(i.id));
      salvarDocumentos(restantes);
      setSelectedIds([]);
    }
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Documento,Protocolo,Tipo,Situação,Previsão"]
        .concat(
          filteredItens.map(
            (i) => `"${i.titulo}","${i.protocolo}","${i.tipo}","${i.situacao}","${i.previsao}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "documentos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNovoDocumento = (novo: any) => {
    adicionarDocumento({
      titulo: novo.titulo,
      protocolo: `2026/BEL-${Math.floor(1000 + Math.random() * 9000)}`,
      tipo: (novo.categoria === "Matrícula" ? "Requerimento" : "PDF") as any,
      situacao: (novo.situacao === "Publicado" ? "Solicitado" : novo.situacao) as any,
      previsao: novo.data || "5 dias úteis",
    });
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Documentos
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
            Novo documento &rarr;
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total em documentos"
          value={itens.length}
          sublabel="SOLICITAÇÕES REGISTRADAS"
          badgeText="TODOS OS TIPOS"
          badgeVariant="lime"
        />
        <MetricCard
          title="Em andamento"
          value={emCursoCount}
          sublabel="AGUARDANDO CONCLUSÃO"
          badgeText="EM ANÁLISE"
          badgeVariant="yellow"
        />
        <MetricCard
          title="Prontos para retirada"
          value={itens.filter((i) => i.situacao === "Pronto").length}
          sublabel="CONCLUÍDOS"
          badgeText="DOCUMENTOS EMITIDOS"
          badgeVariant="cyan"
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
            DOCUMENTOS
          </span>
          <h3 className="text-2xl font-extrabold text-white mb-2">
            Nenhum documento encontrado
          </h3>
          <p className="max-w-md text-sm text-[#9ca3af] mb-6">
            Você não possui documentos registrados para o filtro selecionado.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Novo documento &rarr;
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
                    <span>DOCUMENTO</span>
                    <span className="text-[#bef264]">{sortAscending ? "↑" : "↓"}</span>
                  </div>
                </th>
                <th className="px-4 py-3">PROTOCOLO ⇅</th>
                <th className="px-4 py-3">TIPO ⇅</th>
                <th className="px-4 py-3">SITUAÇÃO ⇅</th>
                <th className="px-4 py-3">PREVISÃO ⇅</th>
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
                      {item.titulo}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-zinc-400">
                      {item.protocolo}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-3 py-0.5 text-xs font-bold",
                          getTipoBadgeClass(item.tipo)
                        )}
                      >
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-3 py-0.5 text-xs font-bold",
                          getSituacaoBadgeClass(item.situacao)
                        )}
                      >
                        {item.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-[#9ca3af]">
                      {item.previsao}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir o documento "${item.titulo}"?`)) {
                            removerDocumento(item.id);
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 font-semibold"
                        title="Excluir documento"
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
                <p className="text-xs font-mono text-zinc-400">Protocolo: {item.protocolo}</p>
              </div>
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getTipoBadgeClass(item.tipo)
                  )}
                >
                  {item.tipo}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getSituacaoBadgeClass(item.situacao)
                  )}
                >
                  {item.situacao}
                </span>
                <span className="text-xs font-semibold text-[#9ca3af]">
                  {item.previsao}
                </span>
                <button
                  type="button"
                  onClick={() => removerDocumento(item.id)}
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

      {/* Modal Novo Documento */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleNovoDocumento}
        tipoRegistro="Documento"
      />
    </div>
  );
}
