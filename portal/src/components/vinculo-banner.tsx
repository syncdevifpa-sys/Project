import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { useDemo } from "@/state/demo";

const TEXTO: Record<string, string | null> = {
  verificacao:
    "Enquanto a secretaria verifica o vínculo, você já vê os avisos públicos.",
  verificado: null,
  recusado:
    "Seu vínculo foi recusado pela secretaria. Confira seus dados em Perfil ou fale com a secretaria acadêmica.",
};

/* Banner informativo do estado do vínculo.
   A dispensa vale pela sessão, mas é por estado: se o estado do
   vínculo mudar, o banner volta a aparecer. */
export function VinculoBanner() {
  const { vinculo } = useDemo();
  const chave = `arcadia.banner.${vinculo}`;
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    setDispensado(sessionStorage.getItem(chave) === "1");
  }, [chave]);

  const texto = TEXTO[vinculo];
  if (!texto || dispensado) return null;

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-2xl bg-lilas px-5 py-4 text-[14px] text-foreground"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-violeta" strokeWidth={2} />
      <p className="flex-1">{texto}</p>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(chave, "1");
          setDispensado(true);
        }}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold text-violeta transition-colors hover:bg-violeta/10"
      >
        <X aria-hidden className="size-3.5" /> Dispensar
      </button>
    </div>
  );
}
