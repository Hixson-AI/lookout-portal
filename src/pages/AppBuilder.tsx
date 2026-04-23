/**
 * App Builder Page — visual workflow composer.
 *
 * Layout: Action Library (left rail) · Flow Canvas (center) · Config Drawer (right)
 * Bottom: Output panel · Floating: AI Builder
 * Modal: Workflow Settings (metadata, trigger, secrets)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useParams } from "react-router-dom"
import {
  Save,
  Undo2,
  Loader2,
  ShieldCheck,
  Upload,
  Download,
  Settings,
  Sparkles,
  CheckCircle,
  HelpCircle,
  X,
} from "lucide-react"
import { FlowCanvas } from "../components/workflow/FlowCanvas"
import { BuilderChat } from "../components/workflow/BuilderChat"
import { ActionCatalogDialog } from "../components/workflow/ActionCatalogDialog"
import { ActionLibraryPanel } from "../components/workflow/ActionLibraryPanel"
import { ConfigDrawer } from "../components/workflow/ConfigDrawer"
import { WorkflowSettings } from "../components/workflow/WorkflowSettings"
import { BottomPanel } from "../components/workflow/BottomPanel"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "../components/ui/dialog"
import { api } from "../lib/api"
import { getCatalog } from "../lib/api/actions"
import { importN8nWorkflow, exportN8nWorkflow } from "../lib/api/n8n"
import type { WorkflowStep } from "../lib/types"
import type { AgentAction } from "../lib/api/actions"

// ── Types ─────────────────────────────────────────────────────────────

interface Workflow {
  name: string
  description: string
  triggerConfig: {
    type: "cron" | "webhook" | "api" | "manual"
    schedule?: string
    webhookUrl?: string
  }
  steps: WorkflowStep[]
}

interface SecretEntry {
  key: string
  created_at: string
}

// ── Schema helpers ────────────────────────────────────────────────────

function schemaToMappableFields(
  inputSchema: Record<string, unknown> | null | undefined
): Array<{ key: string; label: string; placeholder?: string }> {
  const props = (inputSchema as any)?.properties ?? {}
  return Object.entries(props).map(([key]: [string, any]) => ({
    key,
    label: key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (s) => s.toUpperCase())
      .trim(),
    placeholder: `{{trigger.${key}}}`,
  }))
}

const MAPPABLE_FIELDS: Record<
  string,
  Array<{ key: string; label: string; placeholder?: string }>
> = {
  "step:http-request": [{ key: "url", label: "URL" }, { key: "body", label: "Body" }],
  "step:ai-processing": [
    { key: "prompt", label: "Prompt" },
    { key: "systemPrompt", label: "System Prompt" },
  ],
  "step:data-transform": [
    { key: "template", label: "Template" },
    { key: "jq", label: "jq Expression" },
  ],
  "step:condition": [{ key: "condition", label: "Condition" }],
  "step:email-send": [
    { key: "to", label: "To" },
    { key: "subject", label: "Subject" },
    { key: "body", label: "Body" },
  ],
  "step:twilio-sms": [
    { key: "to", label: "To Number" },
    { key: "body", label: "Message" },
  ],
}

// ── AppBuilder ─────────────────────────────────────────────────────────

export default function AppBuilder() {
  const { id: tenantId } = useParams<{ id: string }>()
  const tid = tenantId ?? (localStorage.getItem("currentTenantId") || "")

  const [workflow, setWorkflow] = useState<Workflow>({
    name: "",
    description: "",
    triggerConfig: { type: "webhook" },
    steps: [],
  })
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [currentAppId, setCurrentAppId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, string>>({})
  const [testingStep, setTestingStep] = useState<string | null>(null)
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [savingSecret, setSavingSecret] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rawCatalog, setRawCatalog] = useState<AgentAction[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [n8nImportOpen, setN8nImportOpen] = useState(false)
  const [n8nImportText, setN8nImportText] = useState("")
  const [n8nImporting, setN8nImporting] = useState(false)
  const [n8nImportError, setN8nImportError] = useState<string | null>(null)
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(true)
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<"pass" | "fail" | null>(null)
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)

  // Load action library from API
  const loadCatalog = useCallback(() => {
    setCatalogLoading(true)
    setCatalogError(null)
    getCatalog()
      .then((steps: AgentAction[]) => {
        setRawCatalog(steps)
      })
      .catch((err: unknown) => {
        setCatalogError((err as Error).message ?? "Failed to load actions")
      })
      .finally(() => setCatalogLoading(false))
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  // ── Validate ────────────────────────────────────────────────────────

  const handleValidate = useCallback(async () => {
    setValidating(true)
    setValidateResult(null)
    const log: string[] = []
    log.push(`[${new Date().toLocaleTimeString()}] ▶ Starting validation…`)
    await new Promise((r) => setTimeout(r, 600))
    const errors: Record<string, string> = {}
    for (const step of workflow.steps) {
      log.push(`[${new Date().toLocaleTimeString()}] Checking: ${step.name}`)
      if (step.stepId === "step:http-request" && !step.config?.url) {
        errors[step.id] = "URL is required"
        log.push(`  ✗ ${step.name}: URL is required`)
      } else if (step.stepId === "step:ai-processing" && !step.config?.prompt) {
        errors[step.id] = "Prompt is required"
        log.push(`  ✗ ${step.name}: Prompt is required`)
      } else if (step.stepId === "step:email-send" && !step.config?.to) {
        errors[step.id] = "To address is required"
        log.push(`  ✗ ${step.name}: To address is required`)
      } else {
        log.push(`  ✓ ${step.name}: OK`)
      }
    }
    const passed = Object.keys(errors).length === 0
    log.push(
      `[${new Date().toLocaleTimeString()}] ${passed ? "✅ All checks passed" : `❌ ${Object.keys(errors).length} error(s) found`}`
    )
    setValidationErrors(errors)
    setValidateResult(passed ? "pass" : "fail")
    setExecutionLog(log)
    setShowLog(true)
    setValidating(false)
  }, [workflow.steps])

  // ── Undo stack ──────────────────────────────────────────────────────

  const undoStack = useRef<Workflow[]>([])
  const prevWorkflowRef = useRef<Workflow>(workflow)
  const [undoCount, setUndoCount] = useState(0)

  useEffect(() => {
    const prev = prevWorkflowRef.current
    if (prev !== workflow) {
      undoStack.current = [...undoStack.current.slice(-9), prev]
      prevWorkflowRef.current = workflow
    }
  }, [workflow])

  const handleUndo = useCallback(() => {
    if (!undoStack.current.length) return
    const prev = undoStack.current[undoStack.current.length - 1]
    undoStack.current = undoStack.current.slice(0, -1)
    prevWorkflowRef.current = prev
    setWorkflow(prev)
    setUndoCount((c) => c + 1)
  }, [])

  // ── Workflow mutators ───────────────────────────────────────────────

  const updateWorkflow = useCallback((next: Workflow) => {
    setWorkflow(next)
  }, [])

  const handleApplySteps = useCallback(
    (
      steps: Array<{
        stepId: string
        name: string
        config?: Record<string, unknown>
      }>,
      trigger: { type: string; schedule?: string },
      workflowName: string
    ) => {
      const newSteps: WorkflowStep[] = steps.map((s, i) => ({
        id: `step_ai_${Date.now()}_${i}`,
        stepId: s.stepId,
        name: s.name,
        config: s.config ?? {},
      }))
      updateWorkflow({
        ...workflow,
        name: workflow.name || workflowName,
        triggerConfig: {
          ...workflow.triggerConfig,
          type: trigger.type as any,
          ...(trigger.schedule ? { schedule: trigger.schedule } : {}),
        },
        steps: [...workflow.steps, ...newSteps],
      })
      setChatCollapsed(true)
    },
    [workflow, updateWorkflow]
  )

  // ── Autosave ────────────────────────────────────────────────────────

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!currentAppId || !workflow.name) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      try {
        await api.updateApp(tid, currentAppId, {
          name: workflow.name,
          description: workflow.description,
          workflowJson: {
            version: "1",
            name: workflow.name,
            description: workflow.description,
            trigger: {
              type: workflow.triggerConfig.type as any,
              config: workflow.triggerConfig,
            },
            steps: workflow.steps,
          },
          triggerConfig: {
            type: workflow.triggerConfig.type,
            config: workflow.triggerConfig,
          },
        })
        setSavedAt(new Date())
      } catch {
        /* silent */
      }
    }, 1500)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [workflow, currentAppId, tid])

  // ── Secrets ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentAppId) return
    api
      .getAppSecrets(tid, currentAppId)
      .then((d) =>
        setSecrets(d.map((s) => ({ key: s.key, created_at: s.created_at })))
      )
      .catch(() => {})
  }, [currentAppId, tid])

  const handleDeleteSecret = async (key: string) => {
    if (!currentAppId) return
    await api.deleteAppSecret(tid, currentAppId, key)
    setSecrets((s) => s.filter((x) => x.key !== key))
  }

  const handleAddSecret = async (key: string, value: string) => {
    if (!currentAppId || !key || !value) return
    setSavingSecret(true)
    try {
      await api.setAppSecret(tid, currentAppId, key, value)
      setSecrets((s) => [
        ...s,
        { key, created_at: new Date().toISOString() },
      ])
    } catch {
      /* silent */
    } finally {
      setSavingSecret(false)
    }
  }

  // ── Canvas handlers ─────────────────────────────────────────────────

  const handleDropStep = useCallback(
    (stepId: string, stepName: string) => {
      const newStep: WorkflowStep = {
        id: `step_${Date.now()}`,
        stepId,
        name: stepName,
        config: {},
      }
      updateWorkflow({ ...workflow, steps: [...workflow.steps, newStep] })
    },
    [workflow, updateWorkflow]
  )

  const handleAddFromLibrary = useCallback(
    (stepId: string, stepName: string) => {
      const newStep: WorkflowStep = {
        id: `step_${Date.now()}`,
        stepId,
        name: stepName,
        config: {},
      }
      updateWorkflow({ ...workflow, steps: [...workflow.steps, newStep] })
      setSelectedStepId(newStep.id)
    },
    [workflow, updateWorkflow]
  )

  const handleDeleteStep = useCallback(
    (id: string) => {
      updateWorkflow({
        ...workflow,
        steps: workflow.steps.filter((s) => s.id !== id),
      })
      if (selectedStepId === id) setSelectedStepId(null)
    },
    [workflow, updateWorkflow, selectedStepId]
  )

  const handleSelectStep = useCallback((id: string | null) => {
    setSelectedStepId(id)
  }, [])

  const handleReorderSteps = useCallback(
    (steps: WorkflowStep[]) => {
      updateWorkflow({ ...workflow, steps })
    },
    [workflow, updateWorkflow]
  )

  const handleStepChange = useCallback(
    (updated: WorkflowStep) => {
      updateWorkflow({
        ...workflow,
        steps: workflow.steps.map((s) =>
          s.id === updated.id || s.id === selectedStepId ? updated : s
        ),
      })
      if (selectedStepId !== null && updated.id !== selectedStepId) {
        setSelectedStepId(updated.id)
      }
    },
    [workflow, updateWorkflow, selectedStepId]
  )

  // ── Test step ───────────────────────────────────────────────────────

  const handleTestStep = useCallback(
    async (step: WorkflowStep) => {
      if (!currentAppId) return
      setTestingStep(step.id)
      setExecutionLog((log) => [
        ...log,
        `[${new Date().toLocaleTimeString()}] ▶ Testing: ${step.name}`,
      ])
      setShowLog(true)
      try {
        const result = await api.testStep(tid, currentAppId, step)
        setTestResults((r) => ({
          ...r,
          [step.id]:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        }))
        setValidationErrors((e) => {
          const next = { ...e }
          delete next[step.id]
          return next
        })
        setExecutionLog((log) => [
          ...log,
          `[${new Date().toLocaleTimeString()}] ✓ ${step.name}: OK`,
        ])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Test failed"
        setValidationErrors((e) => ({ ...e, [step.id]: errorMsg }))
        setExecutionLog((log) => [
          ...log,
          `[${new Date().toLocaleTimeString()}] ✗ ${step.name}: ${errorMsg}`,
        ])
      } finally {
        setTestingStep(null)
      }
    },
    [currentAppId, tid]
  )

  // ── Save ────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!workflow.name) return
    setSaving(true)
    try {
      if (currentAppId) {
        await api.updateApp(tid, currentAppId, {
          name: workflow.name,
          description: workflow.description,
          workflowJson: {
            version: "1",
            name: workflow.name,
            description: workflow.description,
            trigger: {
              type: workflow.triggerConfig.type as any,
              config: workflow.triggerConfig,
            },
            steps: workflow.steps,
          },
          triggerConfig: {
            type: workflow.triggerConfig.type,
            config: workflow.triggerConfig,
          },
        })
      } else {
        const app = await api.createApp({
          tenantId: tid,
          name: workflow.name,
          description: workflow.description,
          workflowJson: {
            version: "1",
            name: workflow.name,
            description: workflow.description,
            trigger: {
              type: workflow.triggerConfig.type as any,
              config: workflow.triggerConfig,
            },
            steps: workflow.steps,
          },
          triggerConfig: {
            type: workflow.triggerConfig.type,
            config: workflow.triggerConfig,
          },
        })
        setCurrentAppId(app.id)
      }
      setSavedAt(new Date())
    } catch {
      /* silent */
    } finally {
      setSaving(false)
    }
  }, [
    workflow.name,
    workflow.description,
    workflow.triggerConfig,
    workflow.steps,
    currentAppId,
    tid,
  ])

  // ── Keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        handleUndo()
      }
      if (e.key === "Escape") {
        setSelectedStepId(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave, handleUndo])

  // ── Derived ──────────────────────────────────────────────────────────

  const selectedStep = useMemo(
    () => workflow.steps.find((s) => s.id === selectedStepId) ?? null,
    [workflow.steps, selectedStepId]
  )

  const mappableFields = useMemo(() => {
    if (!selectedStep) return []
    if (MAPPABLE_FIELDS[selectedStep.stepId]) return MAPPABLE_FIELDS[selectedStep.stepId]
    const item = rawCatalog.find(
      (a) => (a.actionType ?? a.id) === selectedStep.stepId
    )
    return item?.inputSchema
      ? schemaToMappableFields(item.inputSchema as Record<string, unknown>)
      : []
  }, [selectedStep, rawCatalog])

  const errorStepIds = useMemo(
    () => new Set(Object.keys(validationErrors)),
    [validationErrors]
  )

  const webhookUrl =
    workflow.triggerConfig.type === "webhook"
      ? workflow.triggerConfig.webhookUrl ||
        (currentAppId
          ? `/webhooks/${currentAppId}`
          : "/webhooks/{id} — save to activate")
      : null

  const catalogCategories = useMemo(
    () =>
      Object.fromEntries(
        rawCatalog.map((a) => [a.actionType ?? a.id, a.category])
      ),
    [rawCatalog]
  )

  const undoDisabled = undoStack.current.length === 0 && undoCount >= 0

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setSettingsOpen(true)}
            title="Workflow settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Input
            value={workflow.name}
            onChange={(e) =>
              setWorkflow((w) => ({ ...w, name: e.target.value }))
            }
            placeholder="Untitled Workflow"
            className="h-7 text-sm font-semibold bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring px-1 -ml-1 min-w-0 w-auto max-w-[240px]"
          />
          {currentAppId && savedAt && (
            <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
              <CheckCircle className="h-3 w-3 mr-1" />
              Saved {savedAt.toLocaleTimeString()}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setChatCollapsed((c) => !c)}
            title="AI Builder"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCatalogDialogOpen(true)}
            title="Browse all actions"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleUndo}
            disabled={undoDisabled}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleValidate}
            disabled={validating}
            title="Validate workflow"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </Button>
          {validateResult && (
            <Badge
              variant={validateResult === "pass" ? "default" : "destructive"}
              className="text-xs"
            >
              {validateResult === "pass"
                ? "Valid"
                : `${Object.keys(validationErrors).length} error${
                    Object.keys(validationErrors).length !== 1 ? "s" : ""
                  }`}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setN8nImportOpen(true)}
            title="Import n8n workflow"
          >
            <Upload className="h-4 w-4" />
          </Button>
          {currentAppId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={async () => {
                try {
                  const { n8nJson } = await exportN8nWorkflow(currentAppId)
                  const blob = new Blob(
                    [JSON.stringify(n8nJson, null, 2)],
                    { type: "application/json" }
                  )
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `${workflow.name || "workflow"}.n8n.json`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  /* silent */
                }
              }}
              title="Export as n8n workflow"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            onClick={handleSave}
            disabled={saving || !workflow.name}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* ── Main Layout ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Rail — Action Library */}
        <aside className="w-72 shrink-0 border-r border-border bg-card overflow-hidden hidden md:flex flex-col">
          <ActionLibraryPanel
            actions={rawCatalog}
            onAdd={handleAddFromLibrary}
            loading={catalogLoading}
            error={catalogError}
          />
        </aside>

        {/* Center — Canvas + Bottom Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden relative">
            <FlowCanvas
              steps={workflow.steps}
              triggerType={workflow.triggerConfig.type}
              selectedStepId={selectedStepId}
              catalogCategories={catalogCategories}
              webhookUrl={webhookUrl}
              errorStepIds={errorStepIds}
              onSelectStep={handleSelectStep}
              onDeleteStep={handleDeleteStep}
              onDropStep={handleDropStep}
              onReorderSteps={handleReorderSteps}
            />

            {/* Empty state overlay */}
            {workflow.steps.length === 0 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-center text-muted-foreground bg-card/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-border shadow-sm">
                  <p className="text-sm font-medium mb-1">
                    Start building your workflow
                  </p>
                  <p className="text-xs max-w-[280px]">
                    Drag an action from the library or describe your workflow to
                    the AI assistant
                  </p>
                </div>
              </div>
            )}
          </div>

          <BottomPanel
            open={showLog}
            onToggle={() => setShowLog((s) => !s)}
            log={executionLog}
            validateResult={validateResult}
            errorCount={Object.keys(validationErrors).length}
          />
        </div>
      </div>

      {/* ── Right Drawer — Step Config ────────────────────────────── */}
      <ConfigDrawer
        open={selectedStepId !== null}
        onOpenChange={(open) => !open && setSelectedStepId(null)}
        step={selectedStep}
        allSteps={workflow.steps}
        catalog={rawCatalog}
        mappableFields={mappableFields}
        onChange={handleStepChange}
        onTest={handleTestStep}
        testingStep={testingStep}
        testResults={testResults}
        validationErrors={validationErrors}
        tenantId={tid}
        appId={currentAppId ?? undefined}
        onEnriched={loadCatalog}
      />

      {/* ── Floating AI Builder ───────────────────────────────────── */}
      {!chatCollapsed && (
        <div className="fixed right-4 bottom-4 top-20 w-96 z-40 bg-card border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Builder
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setChatCollapsed(true)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <BuilderChat
              tenantId={tid}
              workflow={workflow}
              collapsed={false}
              onApplySteps={handleApplySteps}
              onToggle={() => setChatCollapsed(true)}
            />
          </div>
        </div>
      )}

      {/* ── Workflow Settings Modal ──────────────────────────────── */}
      <WorkflowSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        name={workflow.name}
        description={workflow.description}
        triggerConfig={workflow.triggerConfig}
        onNameChange={(name) => setWorkflow((w) => ({ ...w, name }))}
        onDescriptionChange={(description) =>
          setWorkflow((w) => ({ ...w, description }))
        }
        onTriggerChange={(triggerConfig) =>
          setWorkflow((w) => ({ ...w, triggerConfig }))
        }
        secrets={secrets}
        onAddSecret={handleAddSecret}
        onDeleteSecret={handleDeleteSecret}
        savingSecret={savingSecret}
        currentAppId={currentAppId}
        webhookUrl={webhookUrl}
      />

      {/* ── n8n Import Dialog ─────────────────────────────────────── */}
      <Dialog
        open={n8nImportOpen}
        onOpenChange={(v) => {
          if (!v) {
            setN8nImportOpen(false)
            setN8nImportError(null)
            setN8nImportText("")
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import n8n Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste your n8n workflow JSON below. Steps will be mapped to the
              Lookout action catalog (AI-assisted for unrecognized nodes).
            </p>
            <textarea
              className="w-full h-48 px-3 py-2 border border-input rounded-lg text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
              placeholder='{ "name": "My Workflow", "nodes": [...], "connections": {...} }'
              value={n8nImportText}
              onChange={(e) => setN8nImportText(e.target.value)}
            />
            {n8nImportError && (
              <p className="text-xs text-destructive">{n8nImportError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setN8nImportOpen(false)
                  setN8nImportError(null)
                  setN8nImportText("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={n8nImporting || !n8nImportText.trim()}
                onClick={async () => {
                  setN8nImporting(true)
                  setN8nImportError(null)
                  try {
                    const json = JSON.parse(n8nImportText)
                    const { workflow: imported, unresolved } =
                      await importN8nWorkflow(json)
                    const imp = imported as any
                    updateWorkflow({
                      name: (imp.name as string) || workflow.name,
                      description:
                        (imp.description as string) || workflow.description,
                      triggerConfig: {
                        type: (imp.trigger?.type ?? "webhook") as
                          | "webhook"
                          | "cron"
                          | "api"
                          | "manual",
                      } as typeof workflow.triggerConfig,
                      steps: ((imp.steps ?? []) as any[]).map((s: any) => ({
                        id: s.id,
                        stepId: s.stepId,
                        name: s.name,
                        config: s.config ?? {},
                        dataMapping: {},
                      })),
                    })
                    if (unresolved.length > 0)
                      setN8nImportError(
                        `Imported with ${unresolved.length} unresolved node(s): ${unresolved.join(", ")}`
                      )
                    else {
                      setN8nImportOpen(false)
                      setN8nImportText("")
                    }
                  } catch (err) {
                    setN8nImportError(
                      (err as Error).message || "Import failed"
                    )
                  } finally {
                    setN8nImporting(false)
                  }
                }}
              >
                {n8nImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Action Catalog Dialog ──────────────────────────────────── */}
      <ActionCatalogDialog
        open={catalogDialogOpen}
        onClose={() => setCatalogDialogOpen(false)}
        onAdd={(actionId, name) => {
          handleAddFromLibrary(actionId, name)
          setCatalogDialogOpen(false)
        }}
        catalog={rawCatalog}
      />
    </div>
  )
}
