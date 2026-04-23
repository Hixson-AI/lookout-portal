import { useRef, useEffect } from "react"
import { Terminal, X, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "../ui/button"

interface BottomPanelProps {
  open: boolean
  onToggle: () => void
  log: string[]
  validateResult: "pass" | "fail" | null
  errorCount: number
}

export function BottomPanel({ open, onToggle, log, validateResult, errorCount }: BottomPanelProps) {
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (ref.current && log.length > 0) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [log])

  if (!open && log.length === 0) return null

  return (
    <div className="shrink-0 border-t border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Output</span>
          {validateResult && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                validateResult === "pass"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {validateResult === "pass"
                ? "✓ All checks passed"
                : `✗ ${errorCount} error${errorCount !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Body */}
      {open && (
        <pre
          ref={ref}
          className="text-xs font-mono bg-gray-950 text-green-400 p-3 overflow-auto h-40 leading-relaxed"
        >
          {log.length > 0 ? log.join("\n") : "No output yet. Validate or test a step to see results."}
        </pre>
      )}
    </div>
  )
}
