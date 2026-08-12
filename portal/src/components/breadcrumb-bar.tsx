import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useDemo, ROTULO_ESTADO_VINCULO } from "@/state/demo";

/* Linha do topo: trilha à esquerda, metadado de status à direita. */
export function BreadcrumbBar({
  trilha,
}: {
  trilha: { rotulo: string; href?: string }[];
}) {
  const { vinculo } = useDemo();
  return (
    <div className="mb-2 flex items-center justify-between gap-4">
      <nav aria-label="Trilha de navegação">
        <ol className="micro-label flex items-center gap-2 text-muted-foreground">
          {trilha.map((item, i) => {
            const ultimo = i === trilha.length - 1;
            return (
              <Fragment key={item.rotulo}>
                {i > 0 && <li aria-hidden>›</li>}
                <li>
                  {ultimo ? (
                    <span aria-current="page" className="font-bold text-foreground">
                      {item.rotulo}
                    </span>
                  ) : item.href ? (
                    <Link to={item.href} className="transition-colors hover:text-foreground">
                      {item.rotulo}
                    </Link>
                  ) : (
                    <span>{item.rotulo}</span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      <p className="text-[12.5px] text-muted-foreground">
        {ROTULO_ESTADO_VINCULO[vinculo]}
      </p>
    </div>
  );
}
