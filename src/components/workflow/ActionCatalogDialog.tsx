/**
 * ActionCatalogDialog — full-catalog browse experience.
 *
 * Shown when the user clicks "Browse All" in the Action Library panel.
 * Left sidebar groups by capability (hierarchical) or provider.
 * Right panel supports text filter + AI semantic search.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { searchCatalog } from '../../lib/api/actions';
import type { AgentAction } from '../../lib/api/actions';
import { CatalogGroupBrowser } from './CatalogGroupBrowser';
import { type GroupSelection, filterBySelection } from '../../lib/catalog-taxonomy';

interface ActionCatalogDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (actionId: string, name: string) => void;
  catalog: AgentAction[];
}

export function ActionCatalogDialog({ open, onClose, onAdd, catalog }: ActionCatalogDialogProps) {
  const [search, setSearch] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState<AgentAction[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [groupSelection, setGroupSelection] = useState<GroupSelection>({ mode: 'all' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) { setSearch(''); setGroupSelection({ mode: 'all' }); setAiMode(false); }
  }, [open]);

  // Client-side filter: apply group selection then text search
  const localResults = useMemo(() => {
    let items = filterBySelection(catalog, groupSelection);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.tags ?? []).some(t => t.includes(q))
      );
    }
    return items;
  }, [catalog, search, groupSelection]);

  // AI semantic search with debounce
  useEffect(() => {
    if (!aiMode || !search.trim()) { setAiResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try { setAiResults(await searchCatalog(search, 20)); }
      catch { setAiResults([]); }
      finally { setAiLoading(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [aiMode, search]);

  const displayed = aiMode && search.trim() ? aiResults : localResults;

  const secretCount = (a: AgentAction) =>
    Array.isArray(a.secretSchema) ? a.secretSchema.length : 0;

  function handleAdd(action: AgentAction) {
    onAdd(action.actionType ?? action.id, action.name);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0 border-b border-gray-100">
          <DialogTitle>Action Catalog</DialogTitle>
          <DialogDescription>Browse and search for available actions to add to your workflow.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left sidebar: group browser ─────────────────────────── */}
          <div className="w-52 shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50/50">
            <CatalogGroupBrowser
              actions={catalog}
              selection={groupSelection}
              onSelect={s => { setGroupSelection(s); setSearch(''); }}
            />
          </div>

          {/* ── Right: search + grid ─────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + AI toggle */}
            <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-gray-100">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter actions…"
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant={aiMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAiMode(m => !m)}
                className="shrink-0 gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI
              </Button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 pt-3">
              {aiMode && aiLoading && (
                <p className="text-xs text-indigo-500 py-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Finding best matches…
                </p>
              )}
              {displayed.length === 0 && !aiLoading && (
                <p className="text-sm text-gray-400 text-center py-10">No actions found.</p>
              )}
              <div className="grid grid-cols-2 gap-2 pb-4">
                {displayed.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleAdd(action)}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-medium text-sm text-gray-900 line-clamp-1">{action.name}</span>
                      {action.executionMode === 'n8n' && (
                        <span className="shrink-0 px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">n8n</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{action.description}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{action.category}</span>
                      {(action.tags ?? []).slice(0, 2).map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded font-mono">{t}</span>
                      ))}
                      {secretCount(action) > 0 && (
                        <span className="text-xs text-gray-400 ml-auto">{secretCount(action)} cred{secretCount(action) !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-gray-100 px-3 py-2 text-xs text-gray-400 text-right">
              {displayed.length} action{displayed.length !== 1 ? 's' : ''}
              {aiMode && search.trim() ? ' (AI results)' : ''}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
