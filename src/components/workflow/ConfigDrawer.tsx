import { useEffect, useState } from "react"
import { Zap, Activity, X } from "lucide-react"
import { LukoutSpinner } from "../ui/lukout-loader"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"
import { ActionConfigPanel } from "./ActionConfigPanel"
import { DataMappingPanel } from "./DataMappingPanel"
import type { WorkflowStep } from "../../lib/types"
import type { AgentAction } from "../../lib/api/actions"

/**
 * Locate a catalog entry for a given workflow step.
 *
 * Steps may carry a stepId that doesn't exactly match the catalog's
 * `actionType` (e.g. AI-generated steps drop the `n8n:` / `action:` prefix,
 * older imports may use the raw id). We try, in order:
 *   1. exact match on actionType or id
 *   2. match on the prefix-stripped tail (after `:`)
 *   3. match where catalog tail equals the (un-prefixed) step.stepId
 * This keeps platform-enricher schemas visible in the config dialog even when
 * prefixes drift.
 */
function findCatalogItem<T extends { id: string; actionType: string | null }>(
  catalog: T[],
  stepId: string,
): T | undefined {
  const exact = catalog.find((c) => (c.actionType ?? c.id) === stepId)
  if (exact) return exact
  const stepTail = stepId.includes(":") ? stepId.split(":").slice(1).join(":") : stepId
  return catalog.find((c) => {
    const key = c.actionType ?? c.id
    const tail = key.includes(":") ? key.split(":").slice(1).join(":") : key
    return tail === stepTail
  })
}

interface ConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: WorkflowStep | null
  allSteps: WorkflowStep[]
  catalog: AgentAction[]
  mappableFields: Array<{ key: string; label: string; placeholder?: string }>
  onChange: (step: WorkflowStep) => void
  onTest: (step: WorkflowStep) => void
  testingStep: string | null
  testResults: Record<string, string>
  validationErrors: Record<string, string>
  tenantId?: string
  appId?: string
  onEnriched?: () => void
  onViewStatus?: () => void
  hasRunData?: boolean
}

export function ConfigDrawer({
  open,
  onOpenChange,
  step,
  allSteps,
  catalog,
  mappableFields,
  onChange,
  onTest,
  testingStep,
  testResults,
  validationErrors,
  tenantId,
  onViewStatus,
  hasRunData,
  appId,
  onEnriched,
}: ConfigDrawerProps) {
  const [tab, setTab] = useState<"config" | "mapping">("config")

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  // Not rendered if no step selected or closed
  if (!step || !open) return null

  const catalogItem = findCatalogItem(catalog, step.stepId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog panel */}
      <div
        className={cn(
          "relative z-50 bg-card border border-border shadow-2xl rounded-xl",
          "w-full max-w-2xl max-h-[90vh] flex flex-col fade-in"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide shrink-0">
              {step.stepId.split(":")[1] ?? step.stepId}
            </span>
            <h2 className="text-sm font-semibold tracking-tight truncate">{step.name}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs ${
                tab === "config" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              }`}
              onClick={() => setTab("config")}
            >
              Config
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs ${
                tab === "mapping" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              }`}
              onClick={() => setTab("mapping")}
            >
              Mapping
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 ml-1"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "config" ? (
          <div className="space-y-4">
            <ActionConfigPanel
              step={step}
              allSteps={allSteps}
              onChange={onChange}
              tenantId={tenantId}
              appId={appId}
              inputSchema={catalogItem?.inputSchema as Record<string, unknown> | null}
              secretSchema={catalogItem?.secretSchema}
              onEnriched={onEnriched}
            />
            <div className="pt-4 border-t border-border">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTest(step)}
                  disabled={testingStep === step.id}
                  className="flex-1 text-xs"
                >
                  {testingStep === step.id ? (
                    <>
                      <LukoutSpinner size={12} className="mr-1" />
                      Testing…
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Test Step
                    </>
                  )}
                </Button>
                {hasRunData && onViewStatus && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onViewStatus}
                    className="text-xs"
                    title="View run status"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    View Status
                  </Button>
                )}
              </div>
              {validationErrors[step.id] && (
                <p className="text-xs text-destructive mt-2">{validationErrors[step.id]}</p>
              )}
              {testResults[step.id] && (
                <pre className="mt-2 text-xs bg-muted border border-border rounded p-2 overflow-auto max-h-40 font-mono">
                  {testResults[step.id]}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <DataMappingPanel
            currentStep={step}
            allSteps={allSteps}
            mappableFields={mappableFields}
            onChange={(updates) =>
              onChange({
                ...step,
                config: { ...step.config, ...updates },
              })
            }
          />
        )}
        </div>
      </div>
    </div>
  )
}
