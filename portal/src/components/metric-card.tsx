import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string | number;
  sublabel: string;
  badgeText: string;
  badgeVariant?: "lime" | "yellow" | "cyan" | "lavender" | "outline";
  className?: string;
}

export function MetricCard({
  title,
  value,
  sublabel,
  badgeText,
  badgeVariant = "lime",
  className,
}: MetricCardProps) {
  const badgeClasses = {
    lime: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
    yellow: "bg-amber-50 text-amber-800 border border-amber-200/60",
    cyan: "bg-sky-50 text-sky-800 border border-sky-200/60",
    lavender: "bg-purple-50 text-purple-800 border border-purple-200/60",
    outline: "bg-slate-50 text-slate-600 border border-slate-200",
  }[badgeVariant];

  const waveColors = {
    lime: "#10b981",
    yellow: "#f59e0b",
    cyan: "#0284c7",
    lavender: "#8b5cf6",
    outline: "#94a3b8",
  }[badgeVariant];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_35px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 min-h-[180px]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-500 tracking-wide truncate" title={title}>
          {title}
        </h4>
        <svg className="w-10 h-3 shrink-0 mt-0.5 opacity-80" viewBox="0 0 45 10" fill="none" aria-hidden="true">
          <path d="M2 7 C 14 1, 28 9, 43 3" stroke={waveColors} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="my-4">
        <div className="text-5xl font-extrabold tracking-tight text-slate-900 leading-none">
          {value}
        </div>
        <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {sublabel}
        </p>
      </div>

      <div className="mt-1">
        <span
          className={cn(
            "block w-full rounded-full py-2 px-3 text-center text-[10px] font-extrabold uppercase tracking-wider truncate transition-colors",
            badgeClasses
          )}
        >
          {badgeText}
        </span>
      </div>
    </div>
  );
}
