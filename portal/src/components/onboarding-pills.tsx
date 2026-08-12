import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSOS_ONBOARDING } from "@/mock-data";
import { useAnunciar } from "@/state/announce";

const CHAVE = "arcadia.portal.onboarding.v1";

interface EstadoOnboarding {
  feitos: string[];
  oculto: boolean;
}

function carregar(): EstadoOnboarding {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return JSON.parse(bruto) as EstadoOnboarding;
  } catch {
    /* estado corrompido volta ao padrão */
  }
  return { feitos: ["curso", "categorias"], oculto: false };
}

/* Onboarding em fileira única de pills roláveis.
   Concluída = fundo verde pálido + check + strikethrough.
   Ao completar as três, a fileira desaparece permanentemente. */
export function OnboardingPills({ onPendentes }: { onPendentes?: (n: number) => void }) {
  const [estado, setEstado] = useState<EstadoOnboarding>(carregar);
  const anunciar = useAnunciar();

  const pendentes = PASSOS_ONBOARDING.filter((p) => !estado.feitos.includes(p.id)).length;

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    onPendentes?.(estado.oculto ? 0 : pendentes);
  }, [estado, pendentes, onPendentes]);

  if (estado.oculto) return null;

  const concluir = (id: string, rotulo: string) => {
    if (estado.feitos.includes(id)) return;
    const feitos = [...estado.feitos, id];
    const acabou = feitos.length === PASSOS_ONBOARDING.length;
    setEstado({ feitos, oculto: acabou });
    anunciar(
      acabou
        ? "Onboarding concluído. A lista de passos não vai mais aparecer."
        : `${rotulo}: passo concluído.`,
    );
  };

  return (
    <section aria-label="Primeiros passos" className="mb-8">
      <div className="flex items-center gap-4">
        <ul className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {PASSOS_ONBOARDING.map((passo) => {
            const feito = estado.feitos.includes(passo.id);
            return (
              <li key={passo.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => concluir(passo.id, passo.rotulo)}
                  disabled={feito}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
                    feito
                      ? "bg-concluido-bg text-concluido line-through"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  {feito && <Check aria-hidden className="size-3.5" strokeWidth={2.4} />}
                  {passo.rotulo}
                  {feito && <span className="sr-only">(concluído)</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="micro-label shrink-0 text-muted-foreground">
          {PASSOS_ONBOARDING.length - pendentes} de {PASSOS_ONBOARDING.length}
        </p>
      </div>
    </section>
  );
}
