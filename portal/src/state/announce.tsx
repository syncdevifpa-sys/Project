/* Região aria-live global: toda ação assíncrona anuncia o
   resultado por aqui, sem depender de foco. */

import { createContext, useContext, useRef, type ReactNode } from "react";

const Ctx = createContext<((mensagem: string) => void) | null>(null);

export function AnnounceProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const anunciar = (mensagem: string) => {
    if (!ref.current) return;
    ref.current.textContent = "";
    // pequeno atraso para leitores de tela detectarem a mudança
    window.setTimeout(() => {
      if (ref.current) ref.current.textContent = mensagem;
    }, 60);
  };

  return (
    <Ctx.Provider value={anunciar}>
      {children}
      <div ref={ref} aria-live="polite" role="status" className="sr-only" />
    </Ctx.Provider>
  );
}

export function useAnunciar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnunciar precisa do AnnounceProvider");
  return ctx;
}
