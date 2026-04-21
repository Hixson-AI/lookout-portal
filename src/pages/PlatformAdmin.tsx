import { useEffect, useState } from 'react';
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
} from 'lucide-react';

type Tab = 'actions' | 'settings';

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

  // ── Settings tab state ─────────────────────────────────────────────
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [openAiKeyInput, setOpenAiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // ── Load actions ───────────────────────────────────────────────────
  useEffect(() => {
    setActionsLoading(true);
    getCatalog()
      .then(data => setActions(data as CatalogActionWithEmbedding[]))
      .catch(() => toast('Failed to load action catalog', 'error'))
      .finally(() => setActionsLoading(false));
  }, [toast]);

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
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerN8nSync();
      toast(result.message || 'n8n catalog synced', 'success');
      // Reload actions
      const updated = await getCatalog();
      setActions(updated as CatalogActionWithEmbedding[]);
    } catch (err) {
      toast((err as Error).message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Reindex embeddings ─────────────────────────────────────────────
  const handleReindex = async () => {
    setReindexing(true);
    try {
      const result = await triggerReindex();
      toast(`Reindexed ${result.indexed} actions (${result.failed} failed)`, result.failed > 0 ? 'error' : 'success');
      const updated = await getCatalog();
      setActions(updated as CatalogActionWithEmbedding[]);
    } catch (err) {
      toast((err as Error).message || 'Reindex failed', 'error');
    } finally {
      setReindexing(false);
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
  const filteredActions = actions.filter(a => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase());
    const matchesMode = modeFilter === 'all' || (a.executionMode ?? 'native') === modeFilter;
    return matchesSearch && matchesMode;
  });

  const embeddedCount = actions.filter(a => (a as CatalogActionWithEmbedding).hasEmbedding).length;
  const n8nCount = actions.filter(a => a.executionMode === 'n8n').length;
  const nativeCount = actions.filter(a => !a.executionMode || a.executionMode === 'native').length;

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
      </div>

      {/* ── Actions tab ─────────────────────────────────────────── */}
      {tab === 'actions' && (
        <div className="space-y-4">
          {/* Stats + controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{actions.length} total</Badge>
              <Badge variant="outline">{nativeCount} native</Badge>
              <Badge variant="outline">{n8nCount} n8n</Badge>
              <Badge variant={embeddedCount === actions.length ? 'default' : 'secondary'}>
                {embeddedCount}/{actions.length} embedded
              </Badge>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReindex}
                disabled={reindexing || syncing}
              >
                {reindexing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Reindex Embeddings
              </Button>
              <Button
                size="sm"
                className="btn-gradient"
                onClick={handleSync}
                disabled={syncing || reindexing}
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Sync n8n Catalog
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs text-sm"
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
                        <th className="text-left px-4 py-3 font-medium">Name</th>
                        <th className="text-left px-4 py-3 font-medium">Category</th>
                        <th className="text-left px-4 py-3 font-medium">Mode</th>
                        <th className="text-left px-4 py-3 font-medium">Embedded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredActions.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{a.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{a.category}</td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant={a.executionMode === 'n8n' ? 'outline' : 'secondary'}
                              className="text-xs"
                            >
                              {a.executionMode ?? 'native'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            {(a as CatalogActionWithEmbedding).hasEmbedding
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-gray-300" />
                            }
                          </td>
                        </tr>
                      ))}
                      {!actionsLoading && filteredActions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-xs">No actions match</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
