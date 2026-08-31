import { cn } from "@/lib/utils";

export function Metrica({
  valor,
  rotulo,
  className,
}: {
  valor: string;
  rotulo: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col gap-2 rounded-[2rem] bg-card p-6 text-left shadow-none transition-colors duration-150 hover:bg-card-subtle",
        className
      )}
    >
      <span className="text-[52px] font-bold text-foreground leading-none">
        {valor}
      </span>
      <span className="text-sm text-muted-foreground">{rotulo}</span>
    </div>
  );
}
