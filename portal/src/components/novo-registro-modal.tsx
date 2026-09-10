import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface NovoRegistroModalProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar?: (dados: any) => void;
  tipoRegistro?: string;
}

export function NovoRegistroModal({
  aberto,
  onFechar,
  onSalvar,
  tipoRegistro = "Aviso",
}: NovoRegistroModalProps) {
  const [titulo, setTitulo] = useState("Abertura da matrícula 2026/2");
  const [resumo, setResumo] = useState("Confirmação de disciplinas pelo portal");
  const [categoria, setCategoria] = useState("Matrícula");
  const [publico, setPublico] = useState("Todos");
  const [data, setData] = useState("2026-09-14");
  const [situacao, setSituacao] = useState("Publicado");

  if (!aberto) return null;

  const categorias = ["Matrícula", "Edital", "Evento", "Cancelamento", "Calendário"];
  const publicos = ["Todos", "Aluno", "Professor", "Servidor"];
  const situacoes = ["Rascunho", "Publicado", "Arquivado"];

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSalvar) {
      onSalvar({ titulo, resumo, categoria, publico, data, situacao });
    }
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-[24px] border-[2px] border-[#2e3646] bg-[#121620] p-7 shadow-2xl text-left text-white">
        {/* Cabeçalho */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
            {tipoRegistro.toUpperCase()}S
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-4 py-1 text-xs font-bold text-white hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <h3 className="mb-6 text-2xl font-extrabold text-white">
          Novo {tipoRegistro.toLowerCase()}
        </h3>

        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          {/* Título */}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af]">
              TÍTULO DO {tipoRegistro.toUpperCase()}
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-4 py-2 text-sm text-white outline-none focus:border-[#1070e5] focus:ring-1 focus:ring-[#1070e5]"
            />
          </div>

          {/* Resumo */}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af]">
              RESUMO / DESCRIÇÃO
            </label>
            <input
              type="text"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              className="w-full rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-4 py-2 text-sm text-white outline-none focus:border-[#1070e5] focus:ring-1 focus:ring-[#1070e5]"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af]">
              CATEGORIA
            </label>
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(cat)}
                  className={cn(
                    "rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition",
                    categoria === cat
                      ? "border-black bg-[#8ae4f9] text-[#10141A]"
                      : "border-[#2e3646] bg-[#181e2b] text-zinc-300 hover:border-zinc-500 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Público */}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af]">
              PÚBLICO ALVO
            </label>
            <div className="flex flex-wrap gap-2">
              {publicos.map((pub) => (
                <button
                  key={pub}
                  type="button"
                  onClick={() => setPublico(pub)}
                  className={cn(
                    "rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition",
                    publico === pub
                      ? "border-black bg-[#bef264] text-[#10141A]"
                      : "border-[#2e3646] bg-[#181e2b] text-zinc-300 hover:border-zinc-500 hover:text-white"
                  )}
                >
                  {pub}
                </button>
              ))}
            </div>
          </div>

          {/* Data de Referência */}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af]">
              DATA DE REFERÊNCIA
            </label>
            <input
              type="text"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="AAAA-MM-DD ou DD/MM"
              className="w-full rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-4 py-2 text-sm text-white outline-none focus:border-[#1070e5] focus:ring-1 focus:ring-[#1070e5]"
            />
          </div>

          {/* Situação */}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9ca3af]">
              SITUAÇÃO
            </label>
            <div className="flex flex-wrap gap-2">
              {situacoes.map((sit) => (
                <button
                  key={sit}
                  type="button"
                  onClick={() => setSituacao(sit)}
                  className={cn(
                    "rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition",
                    situacao === sit
                      ? "border-transparent bg-[#16a34a] text-white"
                      : "border-[#2e3646] bg-[#181e2b] text-zinc-300 hover:border-zinc-500 hover:text-white"
                  )}
                >
                  {sit}
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="mt-4 flex items-center justify-between border-t border-[#2e3646] pt-4">
            <button
              type="submit"
              className="rounded-full bg-[#1070e5] px-6 py-2 text-xs font-bold text-white transition hover:bg-[#085bbd]"
            >
              Criar registro &rarr;
            </button>

            <button
              type="button"
              onClick={onFechar}
              className="rounded-full border-[1.5px] border-[#2e3646] bg-[#181e2b] px-5 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
