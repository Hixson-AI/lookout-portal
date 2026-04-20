/**
 * ActionCatalogDialog — full-catalog browse experience.
 *
 * Shown when the user clicks "Browse All" in the Action Library panel.
 * Supports client-side text filter + AI semantic search toggle.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { searchCatalog } from '../../lib/api/actions';
import type { AgentAction } from '../../lib/api/actions';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive unique categories from catalog
  const categories = useMemo(() => {
    const cats = Array.from(new Set(catalog.map(a => a.category))).sort();
    return ['all', ...cats];
  }, [catalog]);

  // Client-side filter when not in AI mode
  const localResults = useMemo(() => {
    let items = catalog;
    if (selectedCategory !== 'all') items = items.filter(a => a.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return items;
  }, [catalog, search, selectedCategory]);

  // AI semantic search with debounce
  useEffect(() => {
    if (!aiMode || !search.trim()) {
      setAiResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const results = await searchCatalog(search, 20);
        setAiResults(results);
      } catch {
        setAiResults([]);
      } finally {
        setAiLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [aiMode, search]);

  const displayed = aiMode && search.trim() ? aiResults : localResults;

  const secretCount = (action: AgentAction): number =>
    Array.isArray(action.secretSchema) ? action.secretSchema.length : 0;

  function handleAdd(action: AgentAction) {
    onAdd(action.actionType ?? action.id, action.name);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Action Catalog</span>
          </DialogTitle>
        </DialogHeader>

        {/* Search bar + AI toggle */}
        <div className="flex items-center gap-2 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actions…"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
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
            AI Search
          </Button>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 px-1 overflow-x-auto pb-1 shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto px-1">
          {aiMode && aiLoading && (
            <p className="text-xs text-indigo-500 py-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Finding best matches…
            </p>
          )}
          {aiMode && search.trim() && !aiLoading && aiResults.length > 0 && (
            <p className="text-xs text-indigo-400 pb-2">
              <Sparkles className="w-3 h-3 inline mr-1" />AI results
            </p>
          )}

          {displayed.length === 0 && !aiLoading && (
            <p className="text-sm text-gray-400 text-center py-10">No actions found.</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
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
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{action.category}</span>
                  {secretCount(action) > 0 && (
                    <span className="text-xs text-gray-400">{secretCount(action)} secret{secretCount(action) !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer count */}
        <div className="pt-1 border-t text-xs text-gray-400 text-right px-1">
          {displayed.length} action{displayed.length !== 1 ? 's' : ''} {aiMode && search.trim() ? '(AI results)' : 'available'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
