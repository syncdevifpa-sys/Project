import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export type CategoriaVariant =
  | "matricula"
  | "edital"
  | "evento"
  | "cancelamento"
  | "documento"
  | "calendario";

export const ROTULO_CATEGORIA: Record<CategoriaVariant, string> = {
  matricula: "Matrícula",
  edital: "Edital",
  evento: "Evento",
  cancelamento: "Cancelamento",
  documento: "Documento",
  calendario: "Calendário",
};

const ESTILO_CATEGORIA: Record<CategoriaVariant, string> = {
  matricula: "bg-matricula-bg text-matricula",
  edital: "bg-edital-bg text-edital",
  evento: "bg-evento-bg text-evento",
  cancelamento: "bg-cancelamento-bg text-cancelamento",
  documento: "bg-documento-bg text-documento",
  calendario: "bg-calendario-bg text-calendario",
};

interface CategoriaBadgeProps {
  variante: CategoriaVariant;
  className?: string;
}

export function CategoriaBadge({ variante, className }: CategoriaBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        ESTILO_CATEGORIA[variante],
        className
      )}
    >
      {ROTULO_CATEGORIA[variante]}
    </Badge>
  );
}

export type TipoDocumentoVariant = "PDF" | "E-mail" | "Link";

export const ROTULO_TIPO_DOCUMENTO: Record<TipoDocumentoVariant, string> = {
  PDF: "PDF",
  "E-mail": "E-mail",
  Link: "Link",
};

const ESTILO_TIPO_DOCUMENTO: Record<TipoDocumentoVariant, string> = {
  PDF: "bg-matricula-bg text-matricula",
  "E-mail": "bg-calendario-bg text-calendario",
  Link: "bg-evento-bg text-evento",
};

interface TipoDocumentoBadgeProps {
  tipo: TipoDocumentoVariant;
  className?: string;
}

export function TipoDocumentoBadge({
  tipo,
  className,
}: TipoDocumentoBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        ESTILO_TIPO_DOCUMENTO[tipo],
        className
      )}
    >
      {ROTULO_TIPO_DOCUMENTO[tipo]}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    fixado: { label: "Fixado", cls: "bg-blue-100 text-blue-800" },
    novo: { label: "Novo", cls: "bg-green-100 text-green-800" },
    urgente: { label: "Urgente", cls: "bg-red-100 text-red-800" },
    encerrado: { label: "Encerrado", cls: "bg-gray-100 text-gray-700" },
    rascunho: { label: "Rascunho", cls: "bg-amber-100 text-amber-800" },
  };
  const item = map[status] || { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", item.cls, className)}>
      {item.label}
    </span>
  );
}

