import * as React from "react"
import { cn } from "../../lib/utils"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  side?: "right" | "left" | "bottom"
}

export function Drawer({ open, onOpenChange, children, className, side = "right" }: DrawerProps) {
  const sideClasses = {
    right: "right-0 top-0 bottom-0 h-full border-l",
    left: "left-0 top-0 bottom-0 h-full border-r",
    bottom: "bottom-0 left-0 right-0 w-full border-t rounded-t-xl",
  }

  const transformClasses = {
    right: open ? "translate-x-0" : "translate-x-full",
    left: open ? "translate-x-0" : "-translate-x-full",
    bottom: open ? "translate-y-0" : "translate-y-full",
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 bg-background shadow-2xl transition-transform duration-300 ease-out",
          sideClasses[side],
          transformClasses[side],
          className
        )}
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        {children}
      </div>
    </>
  )
}

export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between border-b px-4 py-3", className)} {...props} />
)

export const DrawerTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-base font-semibold tracking-tight", className)} {...props} />
)

export const DrawerContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("overflow-y-auto flex-1", className)} {...props} />
)

export const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-end gap-2 border-t px-4 py-3", className)} {...props} />
)
