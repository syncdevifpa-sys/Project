import { useState, useMemo, useEffect } from "react";
import { MetricCard } from "@/components/metric-card";
import { ViewControls, type ViewMode } from "@/components/view-controls";
import { SelectionBar } from "@/components/selection-bar";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { type Projeto } from "@/mock-data";
import {
  getProjetos,
  adicionarProjeto,
  removerProjeto,
  salvarProjetos,
  subscribeToDataChanges,
} from "@/state/storage";
import { cn } from "@/lib/utils";

export default function Projetos() {
  const [itens, setItens] = useState<Projeto[]>(getProjetos);
  const [viewMode, setViewMode] = useState<ViewMode>("quadro"); // PDF Página 8 tem Quadro ativo por padrão
  const [activeFilter, setActiveFilter] = useState("Tudo");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getProjetos());
    });
    return unsubscribe;
  }, []);

  const eixosFiltro = ["Tudo", "Pesquisa", "Ensino", "Extensão", "Inovação"];

  const getEixoBadgeClass = (eixo: string) => {
    switch (eixo) {
      case "Pesquisa":
        return "bg-[#8ae4f9] text-[#10141A] border-black";
      case "Ensino":
        return "bg-[#d8d1ff] text-[#10141A] border-black";
      case "Extensão":
        return "bg-[#bef264] text-[#10141A] border-black";
      case "Inovação":
        return "bg-[#facc15] text-[#10141A] border-black";
      default:
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
    }
  };

  const getSituacaoHeaderClass = (sit: string) => {
    switch (sit) {
      case "Inscrições":
        return "bg-[#facc15] text-[#10141A] border-black";
      case "Em seleção":
        return "bg-[#fef08a] text-[#10141A] border-black";
      case "Ativo":
        return "bg-[#10b981] text-white border-transparent";
      case "Concluído":
        return "bg-[#22c55e] text-white border-transparent";
      default:
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
    }
  };

  const filteredItens = useMemo(() => {
    let result = [...itens];
    if (activeFilter !== "Tudo") {
      result = result.filter(
        (item) => item.eixo.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    result.sort((a, b) => {
      return sortAscending
        ? a.titulo.localeCompare(b.titulo)
        : b.titulo.localeCompare(a.titulo);
    });
    return result;
  }, [itens, activeFilter, sortAscending]);

  const totalVagas = useMemo(() => {
    return itens.reduce((acc, curr) => acc + curr.vagas, 0);
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
    if (confirm(`Deseja excluir os ${selectedIds.length} projetos selecionados?`)) {
      const restantes = itens.filter((i) => !selectedIds.includes(i.id));
      salvarProjetos(restantes);
      setSelectedIds([]);
    }
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Projeto,Autor,Eixo,Vagas,Situação"]
        .concat(
          filteredItens.map(
            (i) =>
              `"${i.titulo}","${i.autor}","${i.eixo}","${i.vagas}","${i.situacao}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "projetos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNovoProjeto = (novo: any) => {
    adicionarProjeto({
      titulo: novo.titulo,
      autor: novo.publico || "Coordenação Geral",
      eixo: (novo.categoria === "Edital" ? "Pesquisa" : "Extensão") as any,
      vagas: Math.floor(2 + Math.random() * 8),
      situacao: (novo.situacao === "Publicado" ? "Inscrições" : "Ativo") as any,
    });
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Projetos
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
            Novo projeto &rarr;
          </button>
        </div>
      </div>

      {/* 3 Metric Cards (Alinhados ao PDF Página 8) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total em projetos"
          value={itens.length}
          sublabel="PROJETOS CADASTRADOS"
          badgeText="TODOS OS EIXOS"
          badgeVariant="lime"
        />
        <MetricCard
          title="Vagas disponíveis"
          value={totalVagas}
          sublabel="BOLSAS E VOLUNTÁRIOS"
          badgeText="VAGAS ABERTAS"
          badgeVariant="cyan"
        />
        <MetricCard
          title="Situações distintas"
          value={3}
          sublabel="3 SITUAÇÕES EM USO"
          badgeText="EM ANDAMENTO"
          badgeVariant="lavender"
        />
      </div>

      {/* Controles de Visualização */}
      <ViewControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredItens.length}
        filterLabel="EIXO"
        filterOptions={eixosFiltro}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortAscending={sortAscending}
        onToggleSort={() => setSortAscending(!sortAscending)}
      />

      {/* Conteúdo */}
      {filteredItens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-12 text-center shadow-md">
          <span className="mb-3 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            PROJETOS
          </span>
          <h3 className="text-2xl font-extrabold text-white mb-2">
            Nenhum projeto encontrado
          </h3>
          <p className="max-w-md text-sm text-[#9ca3af] mb-6">
            Você não possui projetos cadastrados para o filtro selecionado.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Novo projeto &rarr;
          </button>
        </div>
      ) : viewMode === "quadro" ? (
        /* Visualização: Quadro Kanban (PDF Página 8) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["Inscrições", "Em seleção", "Ativo", "Concluído"] as const).map((sit) => {
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
                      getSituacaoHeaderClass(sit)
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
                          onClick={() => removerProjeto(item.id)}
                          className="text-xs text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-[#9ca3af] mb-2">{item.autor}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#2e3646] text-xs">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                            getEixoBadgeClass(item.eixo)
                          )}
                        >
                          {item.eixo}
                        </span>
                        <span className="font-bold text-zinc-300">
                          {item.vagas} {item.vagas === 1 ? "vaga" : "vagas"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {grupoItens.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#9ca3af]">Sem projetos</p>
                  )}
                </div>
              </div>
            );
          })}
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
                  >
                    {selectedIds.length === filteredItens.length && (
                      <span className="size-2.5 rounded-full bg-[#bef264]" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-white">PROJETO</th>
                <th className="px-4 py-3">COORDENADOR</th>
                <th className="px-4 py-3">EIXO</th>
                <th className="px-4 py-3">VAGAS</th>
                <th className="px-4 py-3">SITUAÇÃO</th>
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
                    <td className="px-4 py-3.5 text-xs text-zinc-300">
                      {item.autor}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-3 py-0.5 text-xs font-bold",
                          getEixoBadgeClass(item.eixo)
                        )}
                      >
                        {item.eixo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-zinc-300">
                      {item.vagas} vagas
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-3 py-0.5 text-xs font-bold",
                          getSituacaoHeaderClass(item.situacao)
                        )}
                      >
                        {item.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => removerProjeto(item.id)}
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
                <p className="text-xs text-[#9ca3af]">Autor: {item.autor} · {item.vagas} vagas</p>
              </div>
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getEixoBadgeClass(item.eixo)
                  )}
                >
                  {item.eixo}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-bold",
                    getSituacaoHeaderClass(item.situacao)
                  )}
                >
                  {item.situacao}
                </span>
                <button
                  type="button"
                  onClick={() => removerProjeto(item.id)}
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

      {/* Modal Novo Projeto */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleNovoProjeto}
        tipoRegistro="Projeto"
      />
    </div>
  );
}
