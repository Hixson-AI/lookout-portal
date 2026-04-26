/**
 * ExecutionTimeline - Gantt-style timeline visualization for execution steps.
 *
 * Shows steps in chronological order with duration bars, color-coded status,
 * and support for overlapping steps in parallel rows.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { getExecutionSteps, type AppStepExecution } from '../../lib/api/execution-steps';

interface Props {
  tenantId: string;
  appId: string;
  executionId: string;
}

export function ExecutionTimeline({ tenantId, appId, executionId }: Props) {
  const [steps, setSteps] = useState<AppStepExecution[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getExecutionSteps(tenantId, appId, executionId);
        if (!cancelled) setSteps(data);
      } catch (err) {
        console.error('Failed to load steps for timeline:', err);
        if (!cancelled) setSteps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, appId, executionId]);

  const { timeline, minTime, totalDuration } = useMemo(
    () => (steps && steps.length > 0 ? buildTimeline(steps) : { timeline: [], minTime: 0, totalDuration: 1 }),
    [steps],
  );

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading timeline…
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic">
        No steps to display in timeline.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time scale header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span className="w-32 shrink-0">0s</span>
        <div className="flex-1 relative h-4">
          <div className="absolute inset-0 flex justify-between">
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>{totalDuration}s</span>
          </div>
        </div>
      </div>

      {/* Timeline rows */}
      <div className="space-y-2">
        {timeline.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-2">
            {/* Step label */}
            <div className="w-32 shrink-0 text-xs font-mono truncate" title={row.stepInstanceId}>
              {row.stepInstanceId}
            </div>

            {/* Timeline bar */}
            <div className="flex-1 relative h-8 bg-muted rounded overflow-hidden">
              {row.steps.map((step) => {
                const leftPct = ((step.startTime - minTime) / totalDuration) * 100;
                const widthPct = (step.duration / totalDuration) * 100;

                return (
                  <div
                    key={step.id}
                    className={`absolute h-6 rounded flex items-center px-2 text-xs text-white transition-all ${
                      getStatusColor(step.status)
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 2)}%`,
                      top: `${step.rowIndex * 8}px`,
                    }}
                    title={`${step.stepId} - ${step.status} (${step.duration}s)`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <StatusIcon status={step.status} className="h-3 w-3" />
                      <span className="truncate">{step.stepId}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Running</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Failed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-300" />
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  );
}

// ── Internal helpers ─────────────────────────────────────────────────────

interface TimelineStep extends AppStepExecution {
  startTime: number;
  duration: number;
  rowIndex: number;
}

interface TimelineRow {
  stepInstanceId: string;
  steps: TimelineStep[];
}

function buildTimeline(steps: AppStepExecution[]): {
  timeline: TimelineRow[];
  minTime: number;
  maxTime: number;
  totalDuration: number;
} {
  // Calculate start times and durations
  const now = Date.now();
  const timelineSteps: TimelineStep[] = steps.map((step) => {
    const startedAt = step.startedAt ? new Date(step.startedAt).getTime() : now;
    const completedAt = step.completedAt ? new Date(step.completedAt).getTime() : now;
    const duration = step.durationSeconds ?? (completedAt - startedAt) / 1000;
    return {
      ...step,
      startTime: startedAt,
      duration: Math.max(duration, 1), // Minimum 1s for visibility
      rowIndex: 0,
    };
  });

  // Find min/max times
  const minTime = Math.min(...timelineSteps.map((s) => s.startTime));
  const maxTime = Math.max(...timelineSteps.map((s) => s.startTime + s.duration * 1000));
  const totalDuration = Math.max((maxTime - minTime) / 1000, 1);

  // Assign rows to avoid overlaps
  const rows: TimelineStep[][] = [];
  for (const step of timelineSteps) {
    let assigned = false;
    for (const row of rows) {
      const lastStep = row[row.length - 1];
      if (step.startTime >= lastStep.startTime + lastStep.duration * 1000) {
        step.rowIndex = row.length;
        row.push(step);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      step.rowIndex = 0;
      rows.push([step]);
    }
  }

  // Group by step instance ID for display
  const byInstanceId = new Map<string, TimelineStep[]>();
  for (const step of timelineSteps) {
    const existing = byInstanceId.get(step.stepInstanceId) || [];
    existing.push(step);
    byInstanceId.set(step.stepInstanceId, existing);
  }

  const timeline: TimelineRow[] = Array.from(byInstanceId.entries()).map(([stepInstanceId, steps]) => ({
    stepInstanceId,
    steps,
  }));

  return { timeline, minTime, maxTime, totalDuration };
}

function getStatusColor(status: AppStepExecution['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-400';
    case 'running':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'cancelled':
    case 'skipped':
      return 'bg-gray-300';
    default:
      return 'bg-gray-400';
  }
}

function StatusIcon({ status, className }: { status: AppStepExecution['status']; className?: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={className} />;
    case 'failed':
    case 'cancelled':
      return <XCircle className={className} />;
    case 'running':
      return <Loader2 className={`animate-spin ${className}`} />;
    case 'pending':
    case 'skipped':
    default:
      return <Clock className={className} />;
  }
}
