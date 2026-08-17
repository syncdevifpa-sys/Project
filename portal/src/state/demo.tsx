/* Controles de demonstração: estado do vínculo e estado dos dados.
   Sem back-end ainda, esses dois eixos são trocados pelo menu de
   identidade da sidebar para exercitar todos os estados da UI. */

import { createContext, useContext, useState, type ReactNode } from "react";
import type { EstadoVinculo } from "@/mock-data";

export type EstadoDados = "normal" | "carregando" | "vazio" | "erro";

interface DemoContexto {
  vinculo: EstadoVinculo;
  setVinculo: (v: EstadoVinculo) => void;
  dados: EstadoDados;
  setDados: (d: EstadoDados) => void;
}

const Ctx = createContext<DemoContexto | null>(null);

function paramInicial<T extends string>(chave: string, validos: readonly T[], padrao: T): T {
  const bruto = new URLSearchParams(window.location.search).get(chave);
  return validos.includes(bruto as T) ? (bruto as T) : padrao;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [vinculo, setVinculo] = useState<EstadoVinculo>(() =>
    paramInicial("vinculo", ["verificacao", "verificado", "recusado"] as const, "verificacao"),
  );
  const [dados, setDados] = useState<EstadoDados>(() =>
    paramInicial("dados", ["normal", "carregando", "vazio", "erro"] as const, "normal"),
  );
  return (
    <Ctx.Provider value={{ vinculo, setVinculo, dados, setDados }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo precisa do DemoProvider");
  return ctx;
}

export const ROTULO_ESTADO_VINCULO: Record<EstadoVinculo, string> = {
  verificacao: "Vínculo em verificação",
  verificado: "Vínculo verificado",
  recusado: "Vínculo recusado",
};
