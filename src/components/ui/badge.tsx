import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "teal" | "amber" | "green" | "slate" | "rose";
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
        tone === "teal" && "bg-teal-50 text-teal-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "rose" && "bg-rose-50 text-rose-700",
        className,
      )}
      {...props}
    />
  );
}
