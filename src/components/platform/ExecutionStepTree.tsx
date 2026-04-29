/**
 * ExecutionStepTree (Slice 6.2.E.1).
 *
 * Renders the step tree for a single AppExecution. On mount:
 *   1. GET /api/v1/apps/:appId/executions/:executionId/steps — initial rows.
 *   2. Open EventSource for /events — patches rows live.
 *
 * Parent/child relationships come from `parentStepExecutionId`. Phase D
 * added parallel branches but the portal tree renders linearly by
 * `createdAt` for now; parent-child nesting is used when set.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { LukoutSpinner } from '../ui/lukout-loader';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import {
  getExecutionSteps,
  openExecutionEvents,
  type AppStepExecution,
  type StepUpdate,
} from '../../lib/api/execution-steps';

interface Props {
  tenantId: string;
  appId: string;
  executionId: string;
  /**
   * If true, show the platform-admin retry button on failed native/n8n rows.
   * Tenant-facing retry is a Slice 6.3 feature.
   */
  adminRetry?: boolean;
  /**
   * Service secret for the platform-admin retry call. Only used when
   * adminRetry=true. (In real platform admin UI this would be a
   * session-scoped capability; in Phase E we accept the secret directly
   * to avoid plumbing a new portal-side auth layer.)
   */
  serviceSecret?: string;
  /** API base URL for the retry call (defaults to VITE_API_URL). */
  apiBaseUrl?: string;
  onToast?: (msg: string, kind?: 'success' | 'error' | 'info') => void;
  /**
   * Optional override for the initial step fetch. Platform admin pages route
   * through `/v1/platform/...` on the control plane instead of hitting the
   * tenant-scoped API directly (the platform tenant has no API key/auth
   * surface for direct calls).
   */
  stepsLoader?: () => Promise<AppStepExecution[]>;
  /** When true, skip the SSE subscription. SSE is not yet proxied through control plane. */
  disableSse?: boolean;
}

export function ExecutionStepTree({
  tenantId,
  appId,
  executionId,
  adminRetry = false,
  serviceSecret,
  apiBaseUrl = import.meta.env.VITE_API_URL,
  onToast,
  stepsLoader,
  disableSse = false,
}: Props) {
  const [rows, setRows] = useState<AppStepExecution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initial = stepsLoader
          ? await stepsLoader()
          : await getExecutionSteps(tenantId, appId, executionId);
        if (!cancelled) setRows(initial);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load steps');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, appId, executionId, stepsLoader]);

  // SSE subscription. Skipped when no API key auth path is available
  // (platform admin context — control plane proxy doesn't yet stream SSE).
  useEffect(() => {
    if (disableSse) return;
    const es = openExecutionEvents(appId, executionId);
    esRef.current = es;

    es.addEventListener('snapshot', (ev: MessageEvent) => {
      try {
        const { steps } = JSON.parse(ev.data) as { steps: AppStepExecution[] };
        setRows(steps);
      } catch {
        // ignore malformed snapshot
      }
    });

    es.addEventListener('step-update', (ev: MessageEvent) => {
      try {
        const upd = JSON.parse(ev.data) as StepUpdate;
        setRows((prev) => {
          if (!prev) return prev;
          return prev.map((row) =>
            row.id === upd.stepExecutionId
              ? { ...row, status: upd.status, error: upd.error ?? row.error }
              : row,
          );
        });
      } catch {
        // ignore malformed update
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do. SSR/WS transitions are
      // smoothed by the snapshot event on reconnect.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [appId, executionId, disableSse]);

  const tree = useMemo(() => buildTree(rows ?? []), [rows]);

  const doRetry = async (stepExecutionId: string) => {
    if (!apiBaseUrl) {
      onToast?.('Missing API base URL', 'error');
      return;
    }
    if (!serviceSecret) {
      onToast?.('Missing service secret — retry not available', 'error');
      return;
    }
    setRetrying(stepExecutionId);
    try {
      const res = await fetch(
        `${apiBaseUrl}/internal/steps/${stepExecutionId}/retry`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Secret': serviceSecret,
          },
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Retry failed: ${res.status} ${body}`);
      }
      onToast?.('Retry dispatched — new step will appear below', 'success');
    } catch (err) {
      onToast?.((err as Error).message || 'Retry failed', 'error');
    } finally {
      setRetrying(null);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-destructive flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> {error}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <LukoutSpinner size={16} /> Loading steps…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">No steps yet.</div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((node) => (
        <StepNode
          key={node.row.id}
          node={node}
          depth={0}
          adminRetry={adminRetry}
          retrying={retrying}
          onRetry={doRetry}
        />
      ))}
    </div>
  );
}

// ── Internal: build flat list into parent-child tree ─────────────────────
interface TreeNode {
  row: AppStepExecution;
  children: TreeNode[];
}

function buildTree(rows: AppStepExecution[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const row of rows) byId.set(row.id, { row, children: [] });
  const roots: TreeNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentStepExecutionId && byId.has(row.parentStepExecutionId)) {
      byId.get(row.parentStepExecutionId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ── Sub-components ──────────────────────────────────────────────────────
interface StepNodeProps {
  node: TreeNode;
  depth: number;
  adminRetry: boolean;
  retrying: string | null;
  onRetry: (stepExecutionId: string) => void;
}

function StepNode({ node, depth, adminRetry, retrying, onRetry }: StepNodeProps) {
  const { row } = node;
  const canRetry = adminRetry && row.status === 'failed' && row.runtime !== 'inprocess';

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <Card className="border">
        <CardHeader className="p-3 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon status={row.status} />
            <code className="text-sm font-mono truncate">{row.stepInstanceId}</code>
            <span className="text-xs text-muted-foreground">—</span>
            <span className="text-xs text-muted-foreground truncate">{row.stepId}</span>
            <RuntimeBadge runtime={row.runtime} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DurationLabel row={row} />
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(row.id)}
                disabled={retrying === row.id}
              >
                {retrying === row.id ? (
                  <LukoutSpinner size={12} />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                {retrying === row.id ? 'Retrying…' : 'Retry'}
              </Button>
            )}
          </div>
        </CardHeader>
        {(row.error || row.output || row.machineId) && (
          <CardContent className="p-3 pt-0 space-y-1 text-xs text-muted-foreground">
            {row.machineId && <div>machine: <code className="text-[10px]">{row.machineId}</code></div>}
            {row.error && (
              <pre className="bg-destructive/10 text-destructive text-xs p-2 rounded whitespace-pre-wrap">
                {row.error}
              </pre>
            )}
            {row.output != null && (
              <details>
                <summary className="cursor-pointer text-xs">output</summary>
                <pre className="bg-muted p-2 rounded mt-1 max-h-48 overflow-auto text-[10px]">
                  {JSON.stringify(row.output, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        )}
      </Card>
      {node.children.map((child) => (
        <StepNode
          key={child.row.id}
          node={child}
          depth={depth + 1}
          adminRetry={adminRetry}
          retrying={retrying}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: AppStepExecution['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'running':
      return <LukoutSpinner size={16} />;
    case 'pending':
    case 'skipped':
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function RuntimeBadge({ runtime }: { runtime: AppStepExecution['runtime'] }) {
  const color =
    runtime === 'n8n'
      ? 'bg-purple-100 text-purple-700'
      : runtime === 'inprocess'
        ? 'bg-gray-100 text-gray-700'
        : 'bg-blue-100 text-blue-700';
  return <Badge className={`${color} text-[10px]`}>{runtime}</Badge>;
}

function DurationLabel({ row }: { row: AppStepExecution }) {
  if (row.durationSeconds != null) {
    return <span className="text-xs text-muted-foreground">{row.durationSeconds}s</span>;
  }
  if (row.startedAt && !row.completedAt) {
    return <span className="text-xs text-muted-foreground italic">running…</span>;
  }
  return null;
}
