import { Construction } from "lucide-react";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { CampoBuscaDelegado, type EscopoBusca } from "@/components/command-palette";

/* Marcador das telas da Fase 2 — mantém rota, trilha e busca vivas. */
export default function EmConstrucao({
  titulo,
  escopoBusca,
}: {
  titulo: string;
  escopoBusca?: EscopoBusca;
}) {
  return (
    <>
      <BreadcrumbBar trilha={[{ rotulo: "Portal", href: "/" }, { rotulo: titulo }]} />
      <h1 className="mb-8 text-[40px] leading-tight font-bold tracking-tight md:text-[48px]">
        {titulo}
      </h1>

      {escopoBusca && (
        <div className="mb-8">
          <CampoBuscaDelegado
            escopo={escopoBusca}
            placeholder={`Buscar em ${titulo.toLowerCase()}…`}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card py-20 text-center">
        <Construction aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.4} />
        <p className="max-w-[42ch] text-[14px] text-muted-foreground">
          Esta tela será reconstruída na Fase 2 do redesign, depois da aprovação
          do shell e da tela Início.
        </p>
      </div>
    </>
  );
}
