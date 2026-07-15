import React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-[#E8F5E9] text-[#2E7D32]",
    warning: "bg-[#FFF8E1] text-[#F57F17]",
    danger: "bg-rose-50 text-rose-700",
    info: "bg-blue-50 text-blue-700",
    outline: "border border-slate-200 text-slate-600"
  };

  return (
    <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-medium", variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
