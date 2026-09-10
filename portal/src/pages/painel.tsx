import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MetricCard } from "@/components/metric-card";
import { NovoRegistroModal } from "@/components/novo-registro-modal";
import {
  getAvisos,
  getTarefas,
  getDocumentos,
  getEventosCalendario,
  getProjetos,
  getTotalRegistros,
  adicionarAviso,
  subscribeToDataChanges,
} from "@/state/storage";

export default function Painel() {
  const [modalAberto, setModalAberto] = useState(false);
  const [dados, setDados] = useState(() => ({
    total: getTotalRegistros(),
    avisos: getAvisos(),
    tarefas: getTarefas(),
    documentos: getDocumentos(),
    eventos: getEventosCalendario(),
    projetos: getProjetos(),
  }));

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setDados({
        total: getTotalRegistros(),
        avisos: getAvisos(),
        tarefas: getTarefas(),
        documentos: getDocumentos(),
        eventos: getEventosCalendario(),
        projetos: getProjetos(),
      });
    });
    return unsubscribe;
  }, []);

  const tarefasEmAberto = useMemo(() => {
    return dados.tarefas.filter((t) => t.situacao !== "Concluída").length;
  }, [dados.tarefas]);

  const documentosEmAnalise = useMemo(() => {
    return dados.documentos.filter((d) => d.situacao === "Em análise" || d.situacao === "Solicitado").length;
  }, [dados.documentos]);

  const handleSalvarNovoAviso = (novo: any) => {
    adicionarAviso({
      titulo: novo.titulo,
      resumo: novo.resumo,
      categoria: novo.categoria.toLowerCase(),
      publico: novo.publico,
      data: novo.data || "Hoje",
      situacao: novo.situacao,
    });
  };

  const handleExportar = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Tipo,Título,Referência,Status"]
        .concat(
          dados.avisos.map((a) => `"Aviso","${a.titulo}","${a.data}","${a.situacao}"`),
          dados.tarefas.map((t) => `"Tarefa","${t.titulo}","${t.prazo}","${t.situacao}"`),
          dados.documentos.map((d) => `"Documento","${d.titulo}","${d.previsao}","${d.situacao}"`)
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "painel_geral.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col text-left text-white">
      {/* Cabeçalho da Seção */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3646] pb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Painel
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
            {dados.total} REGISTROS
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

      {/* 3 Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Registros no espaço"
          value={dados.total}
          sublabel="EM TODAS AS SEÇÕES"
          badgeText="ATUALIZADO AGORA"
          badgeVariant="lime"
        />
        <MetricCard
          title="Tarefas em aberto"
          value={tarefasEmAberto}
          sublabel="NÃO CONCLUÍDAS"
          badgeText="ACOMPANHE EM TAREFAS"
          badgeVariant="yellow"
        />
        <MetricCard
          title="Documentos em análise"
          value={documentosEmAnalise}
          sublabel="EM ANÁLISE"
          badgeText="ACOMPANHE EM DOCUMENTOS"
          badgeVariant="yellow"
        />
      </div>

      {/* Grid Inferior de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
        {/* Coluna 1: Próximas Datas */}
        <div className="flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#9ca3af]">
              PRÓXIMAS DATAS
            </span>
            <Link
              to="/calendario"
              className="rounded-full border-[1.5px] border-[#2e3646] bg-[#121620] px-3.5 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            >
              Abrir calendário
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Item 1 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Calendário do 2º semestre">
                Calendário do 2º semestre
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-black bg-[#ffbac4] px-2.5 py-0.5 text-[11px] font-bold text-[#10141A]">
                  Calendário
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  01 SET
                </span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Atualizar dados cadastrais">
                Atualizar dados cadastrais
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border border-transparent bg-[#16a34a] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Concluída
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  05 SET
                </span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Histórico escolar completo">
                Histórico escolar completo
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border border-transparent bg-[#16a34a] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Pronto
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  08 SET
                </span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Aula suspensa — Bloco C">
                Aula suspensa — Bloco C
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border border-transparent bg-[#ef4444] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Cancelamento
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  09 SET
                </span>
              </div>
            </div>

            {/* Item 5 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Confirmar disciplinas do semestre">
                Confirmar disciplinas do semestre
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-black bg-[#8ae4f9] px-2.5 py-0.5 text-[11px] font-bold text-[#10141A]">
                  Aberta
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  12 SET
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Criados Recentemente */}
        <div className="flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#9ca3af]">
              CRIADOS RECENTEMENTE
            </span>
            <Link
              to="/avisos"
              className="rounded-full border-[1.5px] border-[#2e3646] bg-[#121620] px-3.5 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            >
              Abrir avisos
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Item 1 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Painel de dados abertos do campus">
                Painel de dados abertos do campus
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
                  Projetos
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  02 SET
                </span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Termo de compromisso de estágio">
                Termo de compromisso de estágio
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
                  Documentos
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  02 SET
                </span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Publicação do resultado PIBIC">
                Publicação do resultado PIBIC
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-black bg-[#ffbac4] px-2.5 py-0.5 text-[11px] font-bold text-[#10141A]">
                  Calendário
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  01 SET
                </span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Rafael Lima">
                Rafael Lima
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
                  Pessoas
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  01 SET
                </span>
              </div>
            </div>

            {/* Item 5 */}
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#2e3646] bg-[#121620] p-3 hover:bg-[#1a2233] transition-colors">
              <span className="text-sm font-bold text-white truncate mr-2" title="Semana de Ciência e Tecnologia">
                Semana de Ciência e Tecnologia
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
                  Avisos
                </span>
                <span className="text-xs font-semibold text-[#9ca3af] w-14 text-right">
                  29 AGO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Novo Registro */}
      <NovoRegistroModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleSalvarNovoAviso}
        tipoRegistro="Aviso"
      />
    </div>
  );
}
