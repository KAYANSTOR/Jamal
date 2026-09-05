import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          // Neumorphic Inset default state
          "shadow-[var(--shadow-neu-inner)]",
          // Border and Focus states
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
Input.displayName = "Input"

export { Input }
