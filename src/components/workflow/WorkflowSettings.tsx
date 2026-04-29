import { useState } from "react"
import { Globe, KeyRound, Lock, Plus, Trash2 } from "lucide-react"
import { LukoutSpinner } from "../ui/lukout-loader"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
} from "../ui/dialog"

interface SecretEntry {
  key: string
  created_at: string
}

interface TriggerConfig {
  type: "cron" | "webhook" | "api" | "manual"
  schedule?: string
  webhookUrl?: string
}

interface WorkflowSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  description: string
  triggerConfig: TriggerConfig
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onTriggerChange: (trigger: TriggerConfig) => void
  secrets: SecretEntry[]
  onAddSecret: (key: string, value: string) => void
  onDeleteSecret: (key: string) => void
  savingSecret: boolean
  currentAppId: string | null
  webhookUrl: string | null
}

export function WorkflowSettings({
  open,
  onOpenChange,
  name,
  description,
  triggerConfig,
  onNameChange,
  onDescriptionChange,
  onTriggerChange,
  secrets,
  onAddSecret,
  onDeleteSecret,
  savingSecret,
  currentAppId,
  webhookUrl,
}: WorkflowSettingsProps) {
  const [secretKey, setSecretKey] = useState("")
  const [secretVal, setSecretVal] = useState("")

  const handleAdd = () => {
    if (!secretKey || !secretVal || !currentAppId) return
    onAddSecret(secretKey, secretVal)
    setSecretKey("")
    setSecretVal("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
          <DialogDescription>Configure workflow metadata, trigger settings, and required secrets.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* ── General ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">General</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="My Workflow"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Describe what this workflow does"
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* ── Trigger ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Trigger</h3>
            <select
              value={triggerConfig.type}
              onChange={(e) =>
                onTriggerChange({
                  ...triggerConfig,
                  type: e.target.value as TriggerConfig["type"],
                })
              }
              className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="webhook">🔗 Webhook</option>
              <option value="api">🌐 API Trigger</option>
              <option value="cron">⏰ Cron Schedule</option>
              <option value="manual">▶️ Manual</option>
            </select>

            {triggerConfig.type === "cron" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cron Expression</label>
                <Input
                  value={triggerConfig.schedule || ""}
                  onChange={(e) =>
                    onTriggerChange({
                      ...triggerConfig,
                      schedule: e.target.value,
                    })
                  }
                  placeholder="0 * * * *"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  e.g. <code className="font-mono">0 9 * * 1-5</code> = weekdays 9 AM
                </p>
              </div>
            )}

            {triggerConfig.type === "webhook" && webhookUrl && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
                  <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                  <code className="text-xs text-foreground break-all font-mono">{webhookUrl}</code>
                </div>
              </div>
            )}
          </div>

          {/* ── Secrets ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-amber-600" />
              Secrets
              <span className="ml-auto text-xs font-normal text-green-600 flex items-center gap-0.5">
                <Lock className="h-3 w-3" /> Encrypted at rest
              </span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {secrets.map((s) => (
                <span
                  key={s.key}
                  className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full inline-flex items-center"
                >
                  {s.key}
                  <button
                    onClick={() => onDeleteSecret(s.key)}
                    className="ml-1.5 -mr-0.5 hover:text-green-950"
                    title="Remove secret"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {secrets.length === 0 && (
                <p className="text-xs text-muted-foreground">No secrets configured yet.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  value={secretKey}
                  onChange={(e) =>
                    setSecretKey(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")
                    )
                  }
                  placeholder="SECRET_KEY"
                  className="font-mono text-xs"
                  aria-label="Secret key name"
                />
                <Input
                  type="password"
                  value={secretVal}
                  onChange={(e) => setSecretVal(e.target.value)}
                  placeholder="secret value"
                  className="font-mono text-xs"
                  aria-label="Secret value"
                />
              </div>
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={handleAdd}
                disabled={savingSecret || !secretKey || !secretVal || !currentAppId}
              >
                {savingSecret ? (
                  <LukoutSpinner size={12} className="mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Add Secret
              </Button>
              {!currentAppId && (
                <p className="text-xs text-amber-600">
                  Save the workflow first to manage secrets.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-medium mb-1">Usage in steps:</p>
              <code className="block text-xs bg-muted text-primary px-2 py-1 rounded font-mono break-all">
                {"{{SECRET_NAME}}"}
              </code>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
