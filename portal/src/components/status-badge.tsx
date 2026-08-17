import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* Vocabulário fixo de status em linha de lista. Máximo de dois por linha;
   público-alvo (Aluno/Professor/Servidor) não é status — vai no metadado. */

export type Status = "fixado" | "novo" | "urgente" | "encerrado";

const ROTULO: Record<Status, string> = {
  fixado: "Fixado",
  novo: "Novo",
  urgente: "Urgente",
  encerrado: "Encerrado",
};

const ESTILO: Record<Status, string> = {
  fixado: "bg-evento-bg text-evento",
  novo: "bg-concluido-bg text-concluido",
  urgente: "bg-cancelamento-bg text-cancelamento",
  encerrado: "bg-documento-bg text-documento",
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-full px-2 text-[11px] font-medium", ESTILO[status], className)}
    >
      {ROTULO[status]}
    </Badge>
  );
}
