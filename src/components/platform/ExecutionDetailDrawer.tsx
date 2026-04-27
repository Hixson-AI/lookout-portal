/**
 * ExecutionDetailDrawer - Reusable drawer for execution details with tabs.
 *
 * Features:
 * - Tab 1: Overview - High-level execution metadata
 * - Tab 2: Timeline - Visual Gantt-style timeline of steps
 * - Tab 3: Step Tree - Integrated ExecutionStepTree with SSE live updates
 * - Human-friendly status descriptions
 * - Copy-to-clipboard for IDs and errors
 * - Better organization with collapsible sections
 */

import { useState } from 'react';
import { X, Copy, ChevronDown, ChevronRight, Share2, Ban } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ExecutionTimeline } from './ExecutionTimeline';
import { ExecutionStepTree } from './ExecutionStepTree';
import { cancelExecution, type AppStepExecution } from '../../lib/api/execution-steps';

interface ExecutionDetail {
  id: string;
  appId: string;
  tenantId: string;
  triggerType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds?: number | null;
  currentStepIndex?: number;
  totalSteps?: number;
  currentStepName?: string | null;
  machineId?: string | null;
  machineType?: string | null;
  imageRef?: string | null;
  error: string | null;
  output?: unknown;
  input?: unknown;
  logs?: unknown;
  computeCostUsd?: number | null;
  llmCostUsd?: number;
}

interface Props {
  execution: ExecutionDetail;
  tenantId: string;
  appId: string;
  onClose: () => void;
  /** Service secret for admin retry (platform jobs only) */
  serviceSecret?: string;
  /** API base URL for retry calls */
  apiBaseUrl?: string;
  onToast?: (msg: string, kind?: 'success' | 'error' | 'info') => void;
  /**
   * Optional override for step fetching. Platform admin pages should pass
   * `() => getPlatformExecutionSteps(appId, executionId)` to route through
   * the control-plane proxy instead of the tenant-scoped API.
   */
  stepsLoader?: () => Promise<AppStepExecution[]>;
  /** Disable SSE step-update stream (control plane proxy doesn't yet stream). */
  disableSse?: boolean;
}

export function ExecutionDetailDrawer({
  execution,
  tenantId,
  appId,
  onClose,
  serviceSecret,
  apiBaseUrl,
  onToast,
  stepsLoader,
  disableSse,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['timing', 'machine']));
  const [cancelling, setCancelling] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onToast?.(`Copied ${label}`, 'success');
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelExecution(tenantId, appId, execution.id);
      onToast?.('Execution cancelled', 'success');
    } catch (err) {
      onToast?.((err as Error).message || 'Failed to cancel execution', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = execution.status === 'running' || execution.status === 'queued';

  const statusDescription = getStatusDescription(execution.status);
  const calculatedDuration = calculateDuration(execution.startedAt, execution.completedAt);
  const displayDuration = execution.durationSeconds ?? calculatedDuration;
  const computeCost = execution.computeCostUsd ?? 0;
  const llmCost = execution.llmCostUsd ?? 0;
  const totalCost = computeCost + llmCost;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="w-full max-w-3xl bg-white h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Execution Detail</h3>
            <Badge className={getStatusBadgeColor(execution.status)}>{statusDescription}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                <Ban className="w-4 h-4 mr-2" />
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(window.location.href, 'URL')}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="steps">Step Tree</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-semibold text-sm">{statusDescription}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="font-semibold text-sm">{displayDuration != null ? `${displayDuration}s` : '—'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Trigger</div>
                  <div className="font-semibold text-sm">{execution.triggerType}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Cost</div>
                  <div className="font-semibold text-sm">${totalCost.toFixed(4)}</div>
                  {llmCost > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ${computeCost.toFixed(4)} compute + ${llmCost.toFixed(4)} LLM
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Timing Section */}
            <CollapsibleSection
              title="Timing"
              expanded={expandedSections.has('timing')}
              onToggle={() => toggleSection('timing')}
            >
              <Field label="ID" value={execution.id} mono onCopy={() => copyToClipboard(execution.id, 'ID')} />
              <Field label="Started" value={formatDateTime(execution.startedAt)} />
              {execution.completedAt && (
                <Field label="Completed" value={formatDateTime(execution.completedAt)} />
              )}
              {execution.durationSeconds != null && (
                <Field label="Duration" value={`${execution.durationSeconds}s`} />
              )}
            </CollapsibleSection>

            {/* Machine Section */}
            <CollapsibleSection
              title="Machine"
              expanded={expandedSections.has('machine')}
              onToggle={() => toggleSection('machine')}
            >
              {execution.machineId && (
                <Field
                  label="Machine ID"
                  value={execution.machineId}
                  mono
                  onCopy={() => copyToClipboard(execution.machineId!, 'Machine ID')}
                />
              )}
              {execution.machineType && <Field label="Type" value={execution.machineType} />}
              {execution.imageRef && (
                <Field
                  label="Image"
                  value={execution.imageRef}
                  mono
                  onCopy={() => copyToClipboard(execution.imageRef!, 'Image')}
                />
              )}
              {execution.computeCostUsd != null && (
                <Field label="Compute Cost" value={`$${execution.computeCostUsd.toFixed(4)}`} />
              )}
            </CollapsibleSection>

            {/* Progress Section */}
            {execution.totalSteps && execution.totalSteps > 0 && (
              <CollapsibleSection
                title="Progress"
                expanded={expandedSections.has('progress')}
                onToggle={() => toggleSection('progress')}
              >
                <Field
                  label="Step"
                  value={`${execution.currentStepIndex != null ? execution.currentStepIndex + 1 : 0} of ${execution.totalSteps}`}
                />
                {execution.currentStepName && (
                  <Field label="Current" value={execution.currentStepName} />
                )}
              </CollapsibleSection>
            )}

            {/* Error Section */}
            {execution.error && (
              <Card className="border-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <ExpandableText text={execution.error} onCopy={() => copyToClipboard(execution.error!, 'Error')} />
                </CardContent>
              </Card>
            )}

            {/* Input Section */}
            {execution.input != null && (
              <CollapsibleSection
                title="Input"
                expanded={expandedSections.has('input')}
                onToggle={() => toggleSection('input')}
              >
                <ExpandableJson data={execution.input} />
              </CollapsibleSection>
            )}

            {/* Output Section */}
            {execution.output != null && (
              <CollapsibleSection
                title="Output"
                expanded={expandedSections.has('output')}
                onToggle={() => toggleSection('output')}
              >
                <ExpandableJson data={execution.output} />
              </CollapsibleSection>
            )}

            {/* Logs Section */}
            {execution.logs != null && (
              <CollapsibleSection
                title="Logs"
                expanded={expandedSections.has('logs')}
                onToggle={() => toggleSection('logs')}
              >
                <ExpandableJson data={execution.logs} />
              </CollapsibleSection>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <ExecutionTimeline
              tenantId={tenantId}
              appId={appId}
              executionId={execution.id}
              stepsLoader={stepsLoader}
              disableSse={disableSse}
            />
          </TabsContent>

          {/* Step Tree Tab */}
          <TabsContent value="steps" className="mt-4">
            <ExecutionStepTree
              tenantId={tenantId}
              appId={appId}
              executionId={execution.id}
              adminRetry={!!serviceSecret}
              serviceSecret={serviceSecret}
              apiBaseUrl={apiBaseUrl}
              onToast={onToast}
              stepsLoader={stepsLoader}
              disableSse={disableSse}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, expanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <Card>
      <CardHeader
        className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </CardHeader>
      {expanded && <CardContent className="pt-0 space-y-2">{children}</CardContent>}
    </Card>
  );
}

interface FieldProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  onCopy?: () => void;
}

function Field({ label, value, mono, onCopy }: FieldProps) {
  return (
    <div className="flex gap-2 items-start">
      <div className="text-xs text-muted-foreground w-24 shrink-0">{label}</div>
      <div className="flex-1 flex items-start gap-2">
        <div className={`text-sm ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
        {onCopy && (
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onCopy}>
            <Copy className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface ExpandableTextProps {
  text: string;
  onCopy?: () => void;
}

function ExpandableText({ text, onCopy }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  return (
    <div className="relative">
      <pre
        className={`bg-destructive/10 text-destructive text-xs p-3 rounded whitespace-pre-wrap ${
          !expanded && isLong ? 'max-h-24 overflow-hidden' : ''
        }`}
      >
        {text}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-destructive mt-2 hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      {onCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 bg-destructive/10 hover:bg-destructive/20"
          onClick={onCopy}
        >
          <Copy className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

interface ExpandableJsonProps {
  data: unknown;
}

function ExpandableJson({ data }: ExpandableJsonProps) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const isLong = json.length > 500;

  return (
    <div className="relative">
      <pre
        className={`bg-muted text-xs p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap ${
          !expanded && isLong ? 'max-h-32' : ''
        }`}
      >
        {json}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground mt-2 hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    queued: 'Waiting to start',
    running: 'In progress',
    cancelling: 'Stopping…',
    completed: 'Finished successfully',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return descriptions[status] || status;
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    cancelling: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-700',
  };
  return colors[status] || 'bg-gray-100';
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function calculateDuration(startedAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  return Math.round((end - start) / 1000);
}
