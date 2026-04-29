import * as React from "react"
import { cn } from "../../lib/utils"

const Dialog = ({ open, onOpenChange, children, className }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode; className?: string }) => {
  // Clone children to pass onOpenChange to DialogTrigger
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === DialogTrigger) {
      return React.cloneElement(child, { onOpenChange } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

  if (!open) {
    // When closed, only render the DialogTrigger (if it exists)
    const trigger = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === DialogTrigger
    );
    if (trigger) {
      return React.cloneElement(trigger as React.ReactElement, { onOpenChange } as React.HTMLAttributes<HTMLElement>);
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className={cn("relative z-50 bg-card border border-border shadow-2xl rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 max-h-[90dvh] overflow-y-auto fade-in", className)}>
        {childrenWithProps}
      </div>
    </div>
  )
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)

const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)

const DialogContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("pt-4", className)} {...props} />
)

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4", className)} {...props} />
)

const DialogTrigger = ({ asChild, children, onOpenChange }: { asChild?: boolean; children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => onOpenChange?.(true)
    } as React.HTMLAttributes<HTMLElement>);
  }
  return <button onClick={() => onOpenChange?.(true)}>{children}</button>
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogTrigger }
