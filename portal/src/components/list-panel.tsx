import { forwardRef, ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

export type ListPanelModalidade = "lista" | "cards";

interface ListPanelProps {
  label?: string;
  rodape?: ReactNode;
  className?: string;
  modalidade?: ListPanelModalidade;
  children: ReactNode;
}

export const ListPanel = forwardRef<HTMLDivElement, ListPanelProps>(
  (
    {
      label,
      rodape,
      className,
      modalidade = "lista",
      children,
    },
    ref
  ) => {
    const id = useId();

    if (modalidade === "cards") {
      return (
        <div
          ref={ref}
          className={cn(
            "grid grid-cols-1 gap-4 p-4 rounded-[2rem] bg-marfim",
            className
          )}
        >
          {children}
          {rodape && (
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              {rodape}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "divide-y divide-border bg-card rounded-2xl p-4 text-left",
          className
        )}
      >
        {label && (
          <p
            id={id}
            className="micro-label mb-3 px-1 text-muted-foreground"
          >
            {label}
          </p>
        )}
        <ul className="flex flex-col">
          {children}
        </ul>
        {rodape && (
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            {rodape}
          </div>
        )}
      </div>
    );
  }
);

ListPanel.displayName = "ListPanel";

interface ListRowProps {
  titulo: ReactNode;
  para?: string;
  aoClicar?: () => void;
  badges?: ReactNode;
  meta?: ReactNode;
  metaAbaixo?: ReactNode;
  className?: string;
  comoCard?: boolean;
}

export function ListRow({
  titulo,
  para,
  aoClicar,
  badges,
  meta,
  metaAbaixo,
  className,
  comoCard,
}: ListRowProps) {
  const id = useId();
  const interativo = para || aoClicar;

  const conteudo = (
    <>
      {badges && (
        <div className="flex flex-wrap items-center gap-2">
          {badges}
        </div>
      )}

      <div className="flex min-h-[2.5rem] w-full flex-col gap-1">
        <div className="flex items-start justify-start">
          <h4 className="text-sm font-semibold text-foreground">{titulo}</h4>
        </div>

        {meta && (
          <div className="text-xs text-muted-foreground">{meta}</div>
        )}
      </div>

      {metaAbaixo && (
        <div className="text-xs text-muted-foreground">{metaAbaixo}</div>
      )}
    </>
  );

  if (comoCard) {
    return (
      <article
        className={cn(
          "flex min-h-0 w-full flex-col gap-3 rounded-[1.5rem] bg-card p-6 text-left shadow-none transition-colors duration-150 hover:bg-card-subtle",
          className
        )}
      >
        {conteudo}
      </article>
    );
  }

  const elemento = () => {
    if (para) {
      return (
        <Link
          href={para}
          className={cn(
            "flex min-h-[2.5rem] w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
            className
          )}
        >
          {conteudo}
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      );
    }

    if (aoClicar) {
      return (
        <button
          onClick={aoClicar}
          className={cn(
            "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
            className
          )}
        >
          {conteudo}
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      );
    }

    return (
      <li
        className={cn(
          "flex w-full items-center gap-4 px-4 py-3 text-left",
          className
        )}
      >
        {conteudo}
      </li>
    );
  };

  return (
    <li className="flex w-full">
      {elemento()}
    </li>
  );
}
