import * as React from "react"
import { cn } from "../../lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          "shadow-[var(--shadow-neu-inner)] appearance-none",
          error 
            ? "border-[var(--color-danger)] focus-visible:ring-1 focus-visible:ring-[var(--color-danger)] focus-visible:border-[var(--color-danger)]" 
            : "border-[var(--color-border)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] focus-visible:border-[var(--color-primary)] hover:border-[var(--color-primary-dark)]/50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Select.displayName = "Select"
export { Select }
