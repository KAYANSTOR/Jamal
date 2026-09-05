import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger" | "icon"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50",
          {
            // Primary Gold: Standard solid button with hover lift & active neumorphic press
            "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-primary-dark)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[var(--shadow-neu-inner)]": variant === "default",
            
            // Secondary (Surface/Neumorphic): Matches the UI surface but stands out with soft shadows
            "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] shadow-[var(--shadow-neu-outer)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] active:shadow-[var(--shadow-neu-inner)]": variant === "secondary",
            
            // Outline: Clean borders
            "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] active:shadow-[var(--shadow-neu-inner)]": variant === "outline",
            
            // Ghost: Flat, no shadow until hover
            "hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] active:shadow-[var(--shadow-neu-inner)]": variant === "ghost",
            
            // Danger: Semantic action
            "bg-[var(--color-danger)] text-[var(--color-danger-foreground)] shadow-[var(--shadow-soft)] hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0 active:shadow-[var(--shadow-neu-inner)]": variant === "danger",
            
            // Icon specific subtle neu effect
            "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] shadow-[var(--shadow-neu-outer)] hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] active:shadow-[var(--shadow-neu-inner)]": variant === "icon",

            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-[var(--radius-sm)] px-3 text-xs": size === "sm",
            "h-11 rounded-[var(--radius-lg)] px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
