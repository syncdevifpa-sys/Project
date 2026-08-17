import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* Vocabulário de lista do portal: container claro com linhas coladas,
   separadas por divisor hairline. Linha que navega ganha chevron; linha
   estática, não. A linha inteira é a área clicável. */

export function ListPanel({
  label,
  rodape,
  className,
  children,
}: {
  /** Label de seção acima do container: caps, tracking largo, fora do card. */
  label?: string;
  /** Slot abaixo do container (ex.: link "Ver todos"). */
  rodape?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <section aria-labelledby={label ? labelId : undefined} className={className}>
      {label && (
        <p id={labelId} className="micro-label mb-3 px-1 text-muted-foreground">
          {label}
        </p>
      )}
      <div className="rounded-[16px] bg-marfim">
        <ul
          className={cn(
            "flex flex-col divide-y divide-foreground/8",
            // arredonda a área de hover da primeira e da última linha
            "[&>li:first-child>*]:rounded-t-[16px] [&>li:last-child>*]:rounded-b-[16px]",
          )}
        >
          {children}
        </ul>
      </div>
      {rodape}
    </section>
  );
}

export function ListRow({
  titulo,
  para,
  aoClicar,
  badges,
  meta,
  metaAbaixo,
  className,
}: {
  titulo: ReactNode;
  /** Rota de destino — presença define a variante "com chevron". */
  para?: string;
  /** Ação de clique para linha interativa que não navega por rota. */
  aoClicar?: () => void;
  /** Até dois StatusBadge, imediatamente após o título. */
  badges?: ReactNode;
  /** Metadado cinza alinhado à direita (ex.: público-alvo, data). */
  meta?: ReactNode;
  /** Metadado em segunda linha, sob o título. */
  metaAbaixo?: ReactNode;
  className?: string;
}) {
  const conteudo = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15.5px] leading-snug font-medium">{titulo}</span>
          {badges}
        </span>
        {metaAbaixo && (
          <span className="mt-1 block text-[13px] text-muted-foreground">
            {metaAbaixo}
          </span>
        )}
      </span>
      {meta && (
        <span className="shrink-0 text-[13px] text-muted-foreground">{meta}</span>
      )}
      {(para || aoClicar) && (
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.8}
        />
      )}
    </>
  );

  const base = "flex min-h-16 w-full items-center gap-4 px-5 py-3.5 text-left";
  const interativa =
    "transition-colors duration-150 hover:bg-foreground/5";

  return (
    <li className={className}>
      {para ? (
        <Link to={para} className={cn(base, interativa)}>
          {conteudo}
        </Link>
      ) : aoClicar ? (
        <button type="button" onClick={aoClicar} className={cn(base, interativa)}>
          {conteudo}
        </button>
      ) : (
        <div className={base}>{conteudo}</div>
      )}
    </li>
  );
}
