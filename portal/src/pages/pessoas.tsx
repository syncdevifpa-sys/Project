import { useState, useMemo, useEffect } from "react";
import { MetricCard } from "@/components/metric-card";
import { ViewControls, type ViewMode } from "@/components/view-controls";
import { SelectionBar } from "@/components/selection-bar";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import { type Pessoa } from "@/mock-data";
import {
  getPessoas,
  adicionarPessoa,
  removerPessoa,
  salvarPessoas,
  subscribeToDataChanges,
} from "@/state/storage";
import { cn } from "@/lib/utils";

export default function Pessoas() {
  const [itens, setItens] = useState<Pessoa[]>(getPessoas);
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [activeFilter, setActiveFilter] = useState("Tudo");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setItens(getPessoas());
    });
    return unsubscribe;
  }, []);

  const vinculosFiltro = ["Tudo", "Aluno", "Professor", "Servidor"];

  const getVinculoBadgeClass = (vinculo: string) => {
    switch (vinculo) {
      case "Aluno":
        return "bg-[#8ae4f9] text-[#10141A] border-black";
      case "Professor":
        return "bg-[#d8d1ff] text-[#10141A] border-black";
      case "Servidor":
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
      default:
        return "bg-[#181e2b] text-zinc-300 border-[#2e3646]";
    }
  };

  const filteredItens = useMemo(() => {
    let result = [...itens];
    if (activeFilter !== "Tudo") {
      result = result.filter(
        (item) => item.vinculo.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    result.sort((a, b) => {
      return sortAscending
        ? a.nome.localeCompare(b.nome)
        : b.nome.localeCompare(a.nome);
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
    if (confirm(`Deseja excluir as ${selectedIds.length} pessoas selecionadas?`)) {
      const restantes = itens.filter((i) => !selectedIds.includes(i.id));
      salvarPessoas(restantes);
      setSelectedIds([]);
    }
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Nome,Vínculo,Curso ou Setor,E-mail Institucional"]
        .concat(
          filteredItens.map(
            (i) => `"${i.nome}","${i.vinculo}","${i.cursoOuSetor}","${i.email}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pessoas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNovaPessoa = (novo: any) => {
    adicionarPessoa({
      nome: novo.titulo,
      vinculo: (novo.publico === "Todos" ? "Aluno" : novo.publico) as any,
      cursoOuSetor: novo.resumo || "IFPA Campus Belém",
      email: `${novo.titulo.toLowerCase().replace(/\s+/g, ".")}@ifpa.edu.br`,
    });
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Pessoas
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
            Nova pessoa &rarr;
          </button>
        </div>
      </div>

      {/* 3 Metric Cards (Alinhados ao PDF Página 7) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total em pessoas"
          value={itens.length}
          sublabel="REGISTROS ATIVOS"
          badgeText="TODOS OS VÍNCULOS"
          badgeVariant="lime"
        />
        <MetricCard
          title="Na visão atual"
          value={filteredItens.length}
          sublabel={activeFilter === "Tudo" ? "TODOS OS VÍNCULOS" : `FILTRO: ${activeFilter.toUpperCase()}`}
          badgeText={activeFilter === "Tudo" ? "MOSTRANDO TUDO" : "FILTRADO"}
          badgeVariant="cyan"
        />
        <MetricCard
          title="Vínculos distintos"
          value={3}
          sublabel="3 VÍNCULOS EM USO"
          badgeText="ALUNO · PROF · SERV"
          badgeVariant="lavender"
        />
      </div>

      {/* Controles de Visualização */}
      <ViewControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredItens.length}
        filterLabel="VÍNCULO"
        filterOptions={vinculosFiltro}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortAscending={sortAscending}
        onToggleSort={() => setSortAscending(!sortAscending)}
      />

      {/* Conteúdo */}
      {filteredItens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-12 text-center shadow-md">
          <span className="mb-3 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            PESSOAS
          </span>
          <h3 className="text-2xl font-extrabold text-white mb-2">
            Nenhuma pessoa encontrada
          </h3>
          <p className="max-w-md text-sm text-[#9ca3af] mb-6">
            Você não possui cadastros registrados para o filtro selecionado.
          </p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-[#1070e5] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
          >
            Nova pessoa &rarr;
          </button>
        </div>
      ) : viewMode === "tabela" ? (
        /* Tabela (PDF Página 7) */
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
                <th className="px-4 py-3 text-white">
                  <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setSortAscending(!sortAscending)}>
                    <span>NOME</span>
                    <span className="text-[#bef264]">{sortAscending ? "↑" : "↓"}</span>
                  </div>
                </th>
                <th className="px-4 py-3">VÍNCULO ⇅</th>
                <th className="px-4 py-3">CURSO OU SETOR ⇅</th>
                <th className="px-4 py-3">E-MAIL INSTITUCIONAL ⇅</th>
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
                      {item.nome}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block rounded-full border-[1.5px] px-3 py-0.5 text-xs font-bold",
                          getVinculoBadgeClass(item.vinculo)
                        )}
                      >
                        {item.vinculo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-zinc-300">
                      {item.cursoOuSetor}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-[#9ca3af]">
                      {item.email}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir ${item.nome}?`)) {
                            removerPessoa(item.id);
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 font-semibold"
                        title="Excluir pessoa"
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
                  {item.nome}
                </h4>
                <p className="text-xs text-[#9ca3af]">{item.cursoOuSetor} · {item.email}</p>
              </div>
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <span
                  className={cn(
                    "rounded-full border-[1.5px] px-3 py-0.5 text-xs font-bold",
                    getVinculoBadgeClass(item.vinculo)
                  )}
                >
                  {item.vinculo}
                </span>
                <button
                  type="button"
                  onClick={() => removerPessoa(item.id)}
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

      {/* Modal Nova Pessoa */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleNovaPessoa}
        tipoRegistro="Pessoa"
      />
    </div>
  );
}
