/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ToastStack } from '../components/ui/ToastStack';
import { useToast } from '../hooks/useToast';
import { getCatalog } from '../lib/api/actions';
import type { AgentAction } from '../lib/api/actions';
import {
  getPlatformSettings,
  setPlatformSetting,
  clearPlatformSetting,
  triggerN8nSync,
  triggerReindex,
  type PlatformSetting,
} from '../lib/api/platform';
import {
  RefreshCw,
  Cpu,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { CatalogGroupBrowser } from '../components/workflow/CatalogGroupBrowser';
import { type GroupSelection, filterBySelection } from '../lib/catalog-taxonomy';
import { PlatformJobsTab } from '../components/platform/PlatformJobsTab';
import { getTenants } from '../lib/api/tenants';
import { apiRequest } from '../lib/api/index';
import { getPlatformExecution } from '../lib/api/platform-jobs';
import type { Tenant } from '../lib/types';
import { Zap } from 'lucide-react';

type Tab = 'actions' | 'settings' | 'jobs';

type CatalogActionWithEmbedding = AgentAction & { hasEmbedding?: boolean };

export function PlatformAdmin() {
  const { toasts, toast, dismiss } = useToast();
  const [tab, setTab] = useState<Tab>('actions');

  // ── Actions tab state ──────────────────────────────────────────────
  const [actions, setActions] = useState<CatalogActionWithEmbedding[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'native' | 'n8n'>('all');
  const [syncing, setSyncing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailAction, setDetailAction] = useState<CatalogActionWithEmbedding | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [syncAppId, setSyncAppId] = useState<{ tenantId: string; appId: string } | null>(null);
  const [groupSelection, setGroupSelection] = useState<GroupSelection>({ mode: 'all' });

  // ── Settings tab state ─────────────────────────────────────────────
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [openAiKeyInput, setOpenAiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // ── Load actions ───────────────────────────────────────────────────
  const loadActions = useCallback(() => {
    setActionsLoading(true);
    getCatalog()
      .then(data => setActions(data as CatalogActionWithEmbedding[]))
      .catch(() => toast('Failed to load action catalog', 'error'))
      .finally(() => setActionsLoading(false));
  }, [toast]);

  useEffect(() => { loadActions(); }, [loadActions]);

  // ── Resolve platform "Sync n8n Catalog" app for execution polling ──
  useEffect(() => {
    (async () => {
      try {
        const tenants = await getTenants();
        const platform = (tenants as Tenant[]).find(
          (t: any) => (t.slug === 'platform' && t.isSystem) || t.slug === 'platform',
        );
        if (!platform) return;
        const apps = await apiRequest<Array<{ id: string; name: string }>>(
          `/v1/tenants/${platform.id}/apps`,
        );
        const app = apps.find(a => a.name === 'Sync n8n Catalog');
        if (app) setSyncAppId({ tenantId: platform.id, appId: app.id });
      } catch {
        // non-fatal — enrich will fall back to a time-based refresh
      }
    })();
  }, []);

  // ── Poll a platform execution until it leaves running/queued ───────
  const pollExecution = useCallback(
    async (appId: string, executionId: string, timeoutMs = 120_000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const exec = await getPlatformExecution(appId, executionId);
          if (exec.status !== 'running' && exec.status !== 'queued' && exec.status !== 'cancelling') {
            return exec;
          }
        } catch {
          // transient — keep polling
        }
        await new Promise(r => setTimeout(r, 2_000));
      }
      return null;
    },
    [],
  );

  // ── Load settings ──────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'settings') return;
    setSettingsLoading(true);
    getPlatformSettings()
      .then(setSettings)
      .catch(() => toast('Failed to load platform settings', 'error'))
      .finally(() => setSettingsLoading(false));
  }, [tab, toast]);

  // ── Sync n8n ───────────────────────────────────────────────────────
  const handleSync = async (force = false) => {
    setSyncing(true);
    try {
      const result = await triggerN8nSync(undefined, force);
      toast((result.message || 'Sync started') + ' — catalog will refresh in ~30s', 'success');
      // Sync runs in a detached background process; poll after a delay
      setTimeout(() => {
        getCatalog()
          .then(data => setActions(data as CatalogActionWithEmbedding[]))
          .catch(() => {});
      }, 30_000);
    } catch (err) {
      toast((err as Error).message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Reindex embeddings ─────────────────────────────────────────────
  const handleReindex = async (ids?: string[]) => {
    setReindexing(true);
    try {
      const result = await triggerReindex(ids);
      const label = ids ? `${ids.length} action${ids.length !== 1 ? 's' : ''}` : 'all actions';
      toast(`Reindexed ${label}: ${result.indexed} ok, ${result.failed} failed`, result.failed > 0 ? 'error' : 'success');
      const updated = await getCatalog();
      setActions(updated as CatalogActionWithEmbedding[]);
      if (detailAction) {
        const fresh = (updated as CatalogActionWithEmbedding[]).find(a => a.id === detailAction.id);
        if (fresh) setDetailAction(fresh);
      }
    } catch (err) {
      toast((err as Error).message || 'Reindex failed', 'error');
    } finally {
      setReindexing(false);
    }
  };

  const handleReindexSelected = () => handleReindex([...selected]);

  // ── Enrich single n8n action ───────────────────────────────────────
  //
  // Dispatches the Sync n8n Catalog app for the target node, then polls the
  // resulting AppExecution via /v1/platform/apps/:appId/executions/:id and
  // refreshes the catalog + detail drawer the moment it leaves the running
  // state. Falls back to a timed refresh if we can't resolve the appId or the
  // API didn't return an executionId (e.g. older control-plane).
  const handleEnrichOne = async (action: CatalogActionWithEmbedding) => {
    const nodeName = action.actionType?.startsWith('n8n:') ? action.actionType.slice(4) : null;
    if (!nodeName) return;
    setEnrichingId(action.id);

    const refreshDetail = async () => {
      const updated = await getCatalog();
      setActions(updated as CatalogActionWithEmbedding[]);
      const fresh = (updated as CatalogActionWithEmbedding[]).find(a => a.id === action.id);
      if (fresh) setDetailAction(fresh);
    };

    try {
      const result = await triggerN8nSync(nodeName);

      if (syncAppId && result.executionId) {
        toast(`Enriching ${action.name}…`, 'info');
        const exec = await pollExecution(syncAppId.appId, result.executionId);
        if (exec?.status === 'completed') {
          await refreshDetail();
          toast(`Enriched ${action.name}`, 'success');
        } else if (exec?.status === 'failed' || exec?.status === 'cancelled') {
          toast(`Enrich ${exec.status}: ${exec.error ?? 'see Jobs tab'}`, 'error');
          await refreshDetail();
        } else {
          toast('Enrich still running — check Jobs tab', 'info');
        }
      } else {
        // Fallback: no execution id available — do a timed refresh.
        toast(`Enriching ${action.name} in background — refreshing in ~15s`, 'success');
        setTimeout(() => { refreshDetail().catch(() => {}); }, 15_000);
      }
    } catch (err) {
      toast((err as Error).message || 'Enrich failed', 'error');
    } finally {
      setEnrichingId(null);
    }
  };

  // ── Reindex single action ──────────────────────────────────────────
  const handleReindexOne = async (action: CatalogActionWithEmbedding) => {
    setReindexingId(action.id);
    try {
      await triggerReindex([action.id]);
      toast(`Reindexed ${action.name}`, 'success');
      const updated = await getCatalog();
      setActions(updated as CatalogActionWithEmbedding[]);
      const fresh = (updated as CatalogActionWithEmbedding[]).find(a => a.id === action.id);
      if (fresh) setDetailAction(fresh);
    } catch (err) {
      toast((err as Error).message || 'Reindex failed', 'error');
    } finally {
      setReindexingId(null);
    }
  };

  // ── Save OpenAI key ────────────────────────────────────────────────
  const handleSaveKey = async () => {
    if (!openAiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      await setPlatformSetting('openai_api_key', openAiKeyInput.trim());
      toast('OpenAI API key saved', 'success');
      setOpenAiKeyInput('');
      const updated = await getPlatformSettings();
      setSettings(updated);
    } catch (err) {
      toast((err as Error).message || 'Failed to save key', 'error');
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearKey = async () => {
    try {
      await clearPlatformSetting('openai_api_key');
      toast('OpenAI API key cleared', 'info');
      const updated = await getPlatformSettings();
      setSettings(updated);
    } catch (err) {
      toast((err as Error).message || 'Failed to clear key', 'error');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────
  const allFilteredIds = (list: CatalogActionWithEmbedding[]) => list.map(a => a.id);
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (ids: string[]) => setSelected(prev => ids.every(id => prev.has(id)) ? new Set() : new Set(ids));

  const filteredActions = filterBySelection(actions as any, groupSelection).filter((a: CatalogActionWithEmbedding) => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase());
    const matchesMode = modeFilter === 'all' || (a.executionMode ?? 'native') === modeFilter;
    return matchesSearch && matchesMode;
  }) as CatalogActionWithEmbedding[];

  const embeddedCount = actions.filter(a => (a as CatalogActionWithEmbedding).hasEmbedding).length;
  const n8nCount = actions.filter(a => a.executionMode === 'n8n').length;
  const nativeCount = actions.filter(a => !a.executionMode || a.executionMode === 'native').length;
  const unenrichedN8n = actions.filter(a =>
    a.executionMode === 'n8n' &&
    (Object.keys((a.inputSchema as any)?.properties ?? {}).length === 0 || !a.tags?.length)
  ).length;
  const needsDiscovery = !actionsLoading && (n8nCount === 0 || unenrichedN8n > 0);

  const openAiSetting = settings.find(s => s.key === 'openai_api_key');

  return (
    <Layout>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient mb-1">Platform Admin</h1>
        <p className="text-sm text-gray-500">Manage platform-level settings and the action catalog</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('actions')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === 'actions' ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><Cpu className="w-4 h-4" />Action Catalog</span>
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === 'settings' ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><Settings className="w-4 h-4" />AI Settings</span>
        </button>
        <button
          onClick={() => setTab('jobs')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === 'jobs' ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><Zap className="w-4 h-4" />Jobs</span>
        </button>
      </div>

      {/* ── Jobs tab (Slice 6.x Execution Engine) ─────────────────── */}
      {tab === 'jobs' && <PlatformJobsTab toast={toast} />}

      {/* ── Actions tab ─────────────────────────────────────────── */}
      {tab === 'actions' && (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* ── Group sidebar ─────────────────────────────────────── */}
          <div className="hidden sm:block w-52 shrink-0">
            <CatalogGroupBrowser
              actions={actions}
              selection={groupSelection}
              onSelect={s => { setGroupSelection(s); setSelected(new Set()); }}
            />
          </div>

          {/* ── Main content ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
          {/* ── JIT Discovery banner ──────────────────────────── */}
          {needsDiscovery && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900">
                  {n8nCount === 0
                    ? 'Action catalog is empty'
                    : `${unenrichedN8n} n8n action${unenrichedN8n !== 1 ? 's' : ''} need enrichment`}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {n8nCount === 0
                    ? 'Discover and enrich n8n nodes from the installed package with AI-generated schemas and tags.'
                    : 'Run discovery to fill in schemas, tags, and credentials for unenriched nodes.'}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleSync()}
                disabled={syncing}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {syncing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Discovering…</> : <><Sparkles className="w-3.5 h-3.5 mr-1" />Run Discovery</>}
              </Button>
            </div>
          )}

          {/* Stats + controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{actions.length} total</Badge>
              <Badge variant="outline">{nativeCount} native</Badge>
              <Badge variant="outline">{n8nCount} n8n</Badge>
              <Badge variant={embeddedCount === actions.length ? 'default' : 'secondary'}>
                {embeddedCount}/{actions.length} embedded
              </Badge>
            </div>
            <div className="flex gap-2 sm:ml-auto flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReindex()}
                disabled={reindexing || syncing}
              >
                {reindexing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">Reindex Embeddings</span>
                <span className="sm:hidden">Reindex</span>
              </Button>
              <Button
                size="sm"
                className="btn-gradient"
                onClick={() => handleSync(true)}
                disabled={syncing || reindexing}
                title="Force re-enrich all n8n nodes (ignores already-enriched)"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">Sync n8n Catalog</span>
                <span className="sm:hidden">Sync n8n</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search by name or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:max-w-xs text-sm"
            />
            <div className="flex gap-1">
              {(['all', 'native', 'n8n'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setModeFilter(m)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${modeFilter === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Selection toolbar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
              <span className="text-indigo-700 font-medium">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={handleReindexSelected} disabled={reindexing} className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
                {reindexing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Reindex Selected
              </Button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-indigo-400 hover:text-indigo-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {actionsLoading ? (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading catalog…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-3 py-3 w-8">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={filteredActions.length > 0 && filteredActions.every((a: CatalogActionWithEmbedding) => selected.has(a.id))}
                            onChange={() => toggleSelectAll(allFilteredIds(filteredActions))}
                          />
                        </th>
                        <th className="text-left px-4 py-3 font-medium">Name</th>
                        <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                        <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Mode</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredActions.map((a: CatalogActionWithEmbedding) => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={e => { if ((e.target as HTMLElement).tagName !== 'INPUT') setDetailAction(a); }}
                        >
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selected.has(a.id)}
                              onChange={() => toggleSelect(a.id)}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-800">{a.name}</p>
                            <p className="text-xs text-gray-400 sm:hidden mt-0.5">
                              {a.category}
                              <Badge variant={a.executionMode === 'n8n' ? 'outline' : 'secondary'} className="text-xs ml-2">
                                {a.executionMode ?? 'native'}
                              </Badge>
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{a.category}</td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            <Badge variant={a.executionMode === 'n8n' ? 'outline' : 'secondary'} className="text-xs">
                              {a.executionMode ?? 'native'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            {(a as CatalogActionWithEmbedding).hasEmbedding
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-gray-300" />
                            }
                          </td>
                          <td className="px-2 py-2.5 text-gray-300">
                            <ChevronRight className="w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                      {filteredActions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs">No actions match</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action detail drawer */}
          {detailAction && (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end"
              onClick={() => setDetailAction(null)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/40 sm:bg-black/20" />
              <div
                className="relative w-full sm:max-w-lg max-h-[90vh] sm:max-h-none sm:h-full bg-white shadow-2xl overflow-y-auto flex flex-col rounded-t-2xl sm:rounded-none"
                onClick={e => e.stopPropagation()}
              >
                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{detailAction.name}</h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{detailAction.actionType ?? detailAction.id}</p>
                  </div>
                  <button onClick={() => setDetailAction(null)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 px-5 py-4 space-y-5 text-sm">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={detailAction.executionMode === 'n8n' ? 'outline' : 'secondary'}>{detailAction.executionMode ?? 'native'}</Badge>
                    <Badge variant="outline">{detailAction.category}</Badge>
                    <Badge variant={detailAction.hasEmbedding ? 'default' : 'secondary'}>
                      {detailAction.hasEmbedding ? '✓ embedded' : 'not embedded'}
                    </Badge>
                  </div>

                  {/* Tags */}
                  {detailAction.tags && detailAction.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {detailAction.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {detailAction.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                      <p className="text-gray-700 leading-relaxed">{detailAction.description}</p>
                    </div>
                  )}

                  {/* Secrets */}
                  {detailAction.secretSchema && (detailAction.secretSchema as any[]).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Required Credentials</p>
                      <div className="space-y-1">
                        {(detailAction.secretSchema as any[]).map((s: any) => (
                          <div key={s.key} className="flex items-start gap-2">
                            <code className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-xs font-mono text-amber-800 shrink-0">{s.key}</code>
                            <span className="text-xs text-gray-500">{s.description}{!s.required && <em> (optional)</em>}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Schema */}
                  {(() => {
                    const props = (detailAction.inputSchema as any)?.properties;
                    const required: string[] = (detailAction.inputSchema as any)?.required ?? [];
                    if (!props || Object.keys(props).length === 0) return null;
                    return (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Input Parameters</p>
                        <div className="space-y-2">
                          {Object.entries(props).map(([key, def]: [string, any]) => (
                            <div key={key} className="flex items-start gap-2">
                              <div className="flex items-center gap-1 shrink-0">
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">{key}</code>
                                {required.includes(key) && <span className="text-red-400 text-xs">*</span>}
                              </div>
                              <span className="text-xs text-gray-500">
                                <span className="text-indigo-500">{def.type ?? 'any'}</span>
                                {def.description && ` — ${def.description}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Output Schema */}
                  {(() => {
                    const props = (detailAction.outputSchema as any)?.properties;
                    if (!props || Object.keys(props).length === 0) return null;
                    return (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Output Fields</p>
                        <div className="space-y-2">
                          {Object.entries(props).map(([key, def]: [string, any]) => (
                            <div key={key} className="flex items-start gap-2">
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 shrink-0">{key}</code>
                              <span className="text-xs text-gray-500">
                                <span className="text-green-600">{def.type ?? 'any'}</span>
                                {def.description && ` — ${def.description}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Raw schemas if no properties */}
                  {!(detailAction.inputSchema as any)?.properties && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Input Schema</p>
                      <pre className="text-xs bg-gray-50 rounded border border-gray-100 p-2 overflow-auto max-h-40">{JSON.stringify(detailAction.inputSchema, null, 2)}</pre>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
                  {detailAction.executionMode === 'n8n' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnrichOne(detailAction)}
                      disabled={enrichingId === detailAction.id}
                      className="flex-1"
                    >
                      {enrichingId === detailAction.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Enriching…</>
                        : <><Sparkles className="w-3.5 h-3.5 mr-1" />Re-enrich</>}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReindexOne(detailAction)}
                    disabled={reindexingId === detailAction.id}
                    className="flex-1"
                  >
                    {reindexingId === detailAction.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Reindexing…</>
                      : <><RefreshCw className="w-3.5 h-3.5 mr-1" />Reindex</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── Settings tab ────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-4 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OpenAI API Key</CardTitle>
              <CardDescription>
                Used for action catalog enrichment and RAG embeddings. Stored encrypted in the database.
                Falls back to the <code className="text-xs bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> environment variable if not set here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {settingsLoading ? (
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Current:</span>
                    {openAiSetting?.isSet ? (
                      <>
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{openAiSetting.preview}</code>
                        <button
                          onClick={handleClearKey}
                          className="text-red-400 hover:text-red-600 ml-1"
                          title="Clear key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">not set</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={openAiKeyInput}
                        onChange={e => setOpenAiKeyInput(e.target.value)}
                        className="pr-9 text-sm font-mono"
                        onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      className="btn-gradient"
                      onClick={handleSaveKey}
                      disabled={savingKey || !openAiKeyInput.trim()}
                    >
                      {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
