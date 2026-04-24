import { useState } from "react"
import { Zap, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import { Drawer, DrawerHeader, DrawerTitle, DrawerContent } from "../ui/drawer"
import { ActionConfigPanel } from "./ActionConfigPanel"
import { DataMappingPanel } from "./DataMappingPanel"
import type { WorkflowStep } from "../../lib/types"
import type { AgentAction } from "../../lib/api/actions"

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
  appId,
  onEnriched,
}: ConfigDrawerProps) {
  const [tab, setTab] = useState<"config" | "mapping">("config")

  // Not rendered if no step selected
  if (!step) return null

  const catalogItem = catalog.find((c) => (c.actionType ?? c.id) === step.stepId)

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="right" className="w-[380px] md:w-[420px] lg:w-[480px]">
      <DrawerHeader className="border-b">
        <div className="flex items-center justify-between w-full">
          <DrawerTitle className="text-sm flex items-center gap-2">
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide">
              {step.stepId.split(":")[1] ?? step.stepId}
            </span>
            <span className="truncate max-w-[200px]">{step.name}</span>
          </DrawerTitle>
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
          </div>
        </div>
      </DrawerHeader>
      <DrawerContent className="px-4 py-4">
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTest(step)}
                disabled={testingStep === step.id}
                className="w-full text-xs"
              >
                {testingStep === step.id ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Testing…
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 mr-1" />
                    Test Step
                  </>
                )}
              </Button>
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
      </DrawerContent>
    </Drawer>
  )
}
