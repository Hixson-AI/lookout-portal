/**
 * Platform Admin Jobs tab (Slice 6.x).
 *
 * Shows AppExecution rows for the reserved platform tenant's admin apps
 * (Sync n8n Catalog, Reindex Embeddings). Polls every 3s while any execution
 * is in `running` or `queued` state. Displays a progress bar sourced from
 * currentStepIndex / totalSteps.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Play, RefreshCw, Ban, Eye } from 'lucide-react';
import { getTenants } from '../../lib/api/tenants';
import { apiRequest } from '../../lib/api/index';
import {
  listPlatformExecutions,
  getPlatformExecutionSteps,
  type PlatformExecution,
} from '../../lib/api/platform-jobs';
import { triggerN8nSync, triggerReindex, isReindexCounts } from '../../lib/api/platform';
import { ExecutionDetailDrawer } from './ExecutionDetailDrawer';
import { cancelExecution } from '../../lib/api/execution-steps';
import type { Tenant } from '../../lib/types';

interface PlatformApp {
  id: string;
  name: string;
  description: string;
  status: string;
  concurrencyPolicy?: string;
}

interface Props {
  toast: (msg: string, kind?: 'success' | 'error' | 'info') => void;
}

export function PlatformJobsTab({ toast }: Props) {
  const [platformTenantId, setPlatformTenantId] = useState<string | null>(null);
  const [apps, setApps] = useState<PlatformApp[]>([]);
  const [executionsByApp, setExecutionsByApp] = useState<Record<string, PlatformExecution[]>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<PlatformExecution | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  const pollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const tenants = await getTenants();
        const platform = (tenants as Tenant[]).find(
          (t: any) => (t.slug === 'platform' && t.isSystem) || t.slug === 'platform',
        );
        if (!platform) {
          toast('Platform tenant not found — run `pnpm seed:platform`', 'error');
          setLoading(false);
          return;
        }
        setPlatformTenantId(platform.id);

        const appList = await apiRequest<PlatformApp[]>(`/v1/tenants/${platform.id}/apps`);
        setApps(appList);
      } catch (err) {
        toast((err as Error).message || 'Failed to load platform tenant', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // ── Load executions for all platform apps ─────────────────────────
  const refreshExecutions = useCallback(async () => {
    if (apps.length === 0) return;
    const next: Record<string, PlatformExecution[]> = {};
    await Promise.all(
      apps.map(async (app) => {
        try {
          const rows = await listPlatformExecutions(app.id, 20);
          next[app.id] = rows;
        } catch {
          next[app.id] = [];
        }
      }),
    );
    setExecutionsByApp(next);
  }, [apps]);

  useEffect(() => {
    if (apps.length > 0) void refreshExecutions();
  }, [apps, refreshExecutions]);

  // ── Polling while any execution is running ─────────────────────────
  useEffect(() => {
    const anyActive = Object.values(executionsByApp).some((rows) =>
      rows.some((r) => r.status === 'running' || r.status === 'queued' || r.status === 'cancelling'),
    );

    if (anyActive) {
      if (!pollHandleRef.current) {
        pollHandleRef.current = setInterval(() => {
          void refreshExecutions();
        }, 3000);
      }
    } else if (pollHandleRef.current) {
      clearInterval(pollHandleRef.current);
      pollHandleRef.current = null;
    }

    return () => {
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    };
  }, [executionsByApp, refreshExecutions]);

  // ── Run an admin app ────────────────────────────────────────────────
  const runApp = async (app: PlatformApp) => {
    setRunning((r) => ({ ...r, [app.id]: true }));
    try {
      // We reuse the existing catalog sync/reindex endpoints which now dispatch
      // via the execute route in Phase 4. Matched by app name.
      if (app.name === 'Sync n8n Catalog') {
        const result = await triggerN8nSync(undefined, false);
        toast(result.message || 'Sync started', 'success');
      } else if (app.name === 'Reindex Embeddings') {
        const result = await triggerReindex();
        if (isReindexCounts(result)) {
          toast(
            `Reindexed: ${result.indexed} ok, ${result.failed} failed`,
            result.failed > 0 ? 'error' : 'success',
          );
        } else {
          toast('Reindex started — watch this tab for progress', 'info');
        }
      } else {
        toast(`No trigger wired for "${app.name}" yet`, 'info');
      }
      // Immediately refresh executions so the new row appears
      setTimeout(() => void refreshExecutions(), 500);
    } catch (err) {
      toast((err as Error).message || 'Run failed', 'error');
    } finally {
      setRunning((r) => ({ ...r, [app.id]: false }));
    }
  };

  // ── Open detail drawer ──────────────────────────────────────────────
  const openDetail = (appId: string, execution: PlatformExecution) => {
    setDetail(execution);
    setSelectedAppId(appId);
  };

  // ── Cancel execution ─────────────────────────────────────────────────
  const handleCancel = async (appId: string, executionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!platformTenantId) return;
    setCancelling((c) => ({ ...c, [executionId]: true }));
    try {
      await cancelExecution(platformTenantId, appId, executionId);
      toast('Execution cancelled', 'success');
      setTimeout(() => void refreshExecutions(), 500);
    } catch (err) {
      toast((err as Error).message || 'Failed to cancel execution', 'error');
    } finally {
      setCancelling((c) => ({ ...c, [executionId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading platform jobs…
      </div>
    );
  }

  if (!platformTenantId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Platform tenant not found. Run <code className="bg-gray-100 px-1 rounded">pnpm seed:platform</code> in lookout-control.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Platform admin operations (catalog sync, embeddings reindex). Each run is an{' '}
          <code>AppExecution</code> dispatched through the Machine Runner.
        </p>
        <Button variant="outline" size="sm" onClick={refreshExecutions}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {apps.map((app) => {
        const rows = executionsByApp[app.id] ?? [];
        const activeRun = rows.find(
          (r) => r.status === 'running' || r.status === 'queued' || r.status === 'cancelling',
        );
        return (
          <Card key={app.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{app.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{app.description}</p>
              </div>
              <Button
                onClick={() => runApp(app)}
                disabled={running[app.id] || !!activeRun}
                size="sm"
              >
                {running[app.id] ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                {activeRun ? 'Running…' : 'Run'}
              </Button>
            </CardHeader>
            <CardContent>
              {activeRun && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">
                    Step {activeRun.currentStepIndex + 1} of {Math.max(activeRun.totalSteps, 1)}
                    {activeRun.currentStepName ? ` — ${activeRun.currentStepName}` : ''}
                  </div>
                  <ProgressBar
                    current={activeRun.currentStepIndex}
                    total={Math.max(activeRun.totalSteps, 1)}
                  />
                </div>
              )}

              {rows.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No executions yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {rows.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => openDetail(app.id, r)}
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-gray-500">
                          {new Date(r.startedAt).toLocaleString()}
                        </span>
                        {r.triggerType && (
                          <span className="text-xs text-gray-400">via {r.triggerType}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {r.durationSeconds != null ? `${r.durationSeconds}s` : '—'}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(app.id, r);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" /> View Run
                        </Button>
                        {(r.status === 'running' || r.status === 'queued') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => handleCancel(app.id, r.id, e)}
                            disabled={cancelling[r.id]}
                          >
                            {cancelling[r.id] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      {detail && selectedAppId && platformTenantId && (
        <ExecutionDetailDrawer
          execution={detail}
          tenantId={platformTenantId}
          appId={selectedAppId}
          onClose={() => {
            setDetail(null);
            setSelectedAppId(null);
          }}
          onToast={toast}
          stepsLoader={() => getPlatformExecutionSteps(selectedAppId, detail.id)}
          disableSse
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PlatformExecution['status'] }) {
  const colors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    cancelling: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-700',
  };
  return (
    <Badge className={`${colors[status] ?? 'bg-gray-100'} text-xs`}>{status}</Badge>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(((current + 1) / total) * 100)));
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className="bg-blue-500 h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
