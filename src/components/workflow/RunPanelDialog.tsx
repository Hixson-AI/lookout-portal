import { useEffect, useRef } from "react"
import { Terminal, CheckCircle, XCircle } from "lucide-react"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
} from "../ui/dialog"

interface RunPanelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: string[]
  validateResult: "pass" | "fail" | null
  errorCount: number
  testResults: Record<string, string>
  stepName?: string
}

export function RunPanelDialog({
  open,
  onOpenChange,
  log,
  validateResult,
  errorCount,
  testResults,
  stepName,
}: RunPanelDialogProps) {
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (ref.current && log.length > 0) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [log])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            {stepName ? `Run Status: ${stepName}` : "Run Status"}
          </DialogTitle>
          <DialogDescription>View the execution logs and results for this step.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Validation Status */}
          {validateResult && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border">
              {validateResult === "pass" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {validateResult === "pass"
                  ? "All checks passed"
                  : `${errorCount} error${errorCount !== 1 ? "s" : ""} found`}
              </span>
            </div>
          )}

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Test Results</h4>
              {Object.entries(testResults).map(([stepId, result]) => (
                <div key={stepId} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium text-muted-foreground">{stepId}</span>
                  </div>
                  <pre className="text-xs bg-muted border border-border rounded p-2 overflow-auto max-h-32 font-mono">
                    {result}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Execution Log */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              Execution Log
            </h4>
            <pre
              ref={ref}
              className="text-xs font-mono bg-gray-950 text-green-400 p-3 rounded-lg border border-border overflow-auto max-h-64 leading-relaxed"
            >
              {log.length > 0 ? log.join("\n") : "No execution logs yet. Run or test the workflow to see results."}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
