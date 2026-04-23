import { useState, useMemo } from "react"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
  Sparkles,
} from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import type { AgentAction } from "../../lib/api/actions"
import { groupActionsByProvider } from "../../lib/catalog-taxonomy"
import { getIconComponent } from "../../lib/action-icons"

interface ActionLibraryPanelProps {
  actions: AgentAction[]
  onAdd: (stepId: string, stepName: string) => void
  loading: boolean
  error: string | null
}

export function ActionLibraryPanel({
  actions,
  onAdd,
  loading,
  error,
}: ActionLibraryPanelProps) {
  const [search, setSearch] = useState("")
  const [grouped, setGrouped] = useState(true)
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set())

  const groupedCatalog = useMemo(() => groupActionsByProvider(actions), [actions])

  const filtered = useMemo(() => {
    if (!search.trim()) return actions
    const q = search.toLowerCase()
    return actions.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.includes(q))
    )
  }, [actions, search])

  const toggleProvider = (p: string) =>
    setExpandedProviders((prev) => {
      const n = new Set(prev)
      n.has(p) ? n.delete(p) : n.add(p)
      return n
    })

  const ActionCard = ({ action }: { action: AgentAction }) => {
    const id = action.actionType ?? action.id
    return (
      <button
        key={id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/workflow-step-id", id)
          e.dataTransfer.setData("application/workflow-step-name", action.name)
          e.dataTransfer.setData("application/workflow-step-category", action.category)
        }}
        onClick={() => onAdd(id, action.name)}
        className="w-full text-left p-2.5 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
            {(() => {
              const Icon = getIconComponent(action.icon, action.category)
              return <Icon className="h-4 w-4" />
            })()}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {action.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {action.description}
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Action Library
          </h2>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setGrouped((g) => !g)}
              title={grouped ? "Show flat list" : "Group by provider"}
            >
              {grouped ? (
                <Layers className="h-3.5 w-3.5" />
              ) : (
                <LayoutGrid className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions…"
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Loading actions…
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive text-center py-4" title={error}>
            Failed to load — check connection
          </p>
        )}
        {!loading && !error && actions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No actions in catalog yet
          </p>
        )}

        {search.trim() ? (
          /* Search results */
          filtered.map((action) => <ActionCard key={action.id} action={action} />)
        ) : grouped ? (
          /* Grouped by provider */
          groupedCatalog.map(({ provider, actions: provActions }) => {
            const expanded = expandedProviders.has(provider)
            return (
              <div key={provider}>
                <button
                  onClick={() => toggleProvider(provider)}
                  className="w-full flex items-center gap-1.5 px-1 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="capitalize">{provider}</span>
                  <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                    {provActions.length}
                  </span>
                </button>
                {expanded &&
                  provActions.map((action) => (
                    <ActionCard key={action.id} action={action} />
                  ))}
              </div>
            )
          })
        ) : (
          /* Flat list */
          actions.map((action) => <ActionCard key={action.id} action={action} />)
        )}

        {search.trim() && filtered.length === 0 && actions.length > 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No actions match "{search}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border shrink-0 text-xs text-muted-foreground text-right">
        {actions.length} action{actions.length !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
