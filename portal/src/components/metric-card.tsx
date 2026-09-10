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
    lime: "bg-[#bef264] text-[#10141A] border-[1.5px] border-black",
    yellow: "bg-[#facc15] text-[#10141A] border-[1.5px] border-black",
    cyan: "bg-[#8ae4f9] text-[#10141A] border-[1.5px] border-black",
    lavender: "bg-[#d8d1ff] text-[#10141A] border-[1.5px] border-black",
    outline: "bg-transparent text-zinc-300 border-[1.5px] border-zinc-600",
  }[badgeVariant];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2e3646] bg-[#181e2b] p-4 sm:p-5 text-left shadow-md min-h-[162px]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[13.5px] font-bold text-white truncate" title={title}>
          {title}
        </h4>
        <svg className="w-10 h-2.5 text-[#8ae4f9] shrink-0 mt-1" viewBox="0 0 45 10" fill="none" aria-hidden="true">
          <path d="M2 7 C 14 1, 28 9, 43 3" stroke="#8ae4f9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="my-2">
        <div className="text-4xl sm:text-[42px] font-extrabold tracking-tight text-white leading-none">
          {value}
        </div>
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
          {sublabel}
        </p>
      </div>

      <div className="mt-1">
        <span
          className={cn(
            "block w-full rounded-full py-1 px-2 text-center text-[10px] font-extrabold uppercase tracking-wider truncate",
            badgeClasses
          )}
        >
          {badgeText}
        </span>
      </div>
    </div>
  );
}
