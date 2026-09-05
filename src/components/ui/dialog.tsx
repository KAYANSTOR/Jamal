import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 w-full max-w-lg mx-4 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-neumorphic)] border border-[var(--color-border)] flex flex-col max-h-[90vh]">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 px-6 py-5 border-b border-[var(--color-border)]", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-bold leading-none tracking-tight text-[var(--color-foreground)]", className)}>
      {children}
    </h3>
  );
}

export function DialogContent({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)}>
      {children}
    </div>
  );
}

export function DialogFooter({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-end space-x-2 space-x-reverse px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-muted)]/30 rounded-b-[var(--radius-lg)]", className)}>
      {children}
    </div>
  );
}

export function DialogClose({ onClick }: { onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="absolute top-4 end-4 p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
    >
      <X size={18} />
    </button>
  );
}
