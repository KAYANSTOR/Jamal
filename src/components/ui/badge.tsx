import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.ComponentProps<"div"> {
  variant?: "default" | "primary" | "secondary" | "outline" | "success" | "warning" | "danger" | "info"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
        {
          "bg-[var(--color-foreground)] text-[var(--color-background)]": variant === "default",
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-soft)]": variant === "primary",
          "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]": variant === "secondary",
          "text-[var(--color-foreground)] border border-[var(--color-border)]": variant === "outline",
          "bg-[var(--color-success)] text-[var(--color-success-foreground)] shadow-[var(--shadow-soft)]": variant === "success",
          "bg-[var(--color-warning)] text-[var(--color-warning-foreground)] shadow-[var(--shadow-soft)]": variant === "warning",
          "bg-[var(--color-danger)] text-[var(--color-danger-foreground)] shadow-[var(--shadow-soft)]": variant === "danger",
          "bg-[var(--color-info)] text-[var(--color-info-foreground)] shadow-[var(--shadow-soft)]": variant === "info",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
