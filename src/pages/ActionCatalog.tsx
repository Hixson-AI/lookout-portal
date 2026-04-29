/**
 * Action Library Page
 * Browse and discover available workflow actions
 */

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { getCatalog, searchCatalog } from '../lib/api/actions';
import type { AgentAction } from '../lib/api/actions';
import { PageState } from '../components/ui/page-state';

export default function ActionCatalog() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState<AgentAction[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    getCatalog()
      .then(setActions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(actions.map(a => a.category))).sort();
    return ['all', ...cats];
  }, [actions]);

  useEffect(() => {
    if (!aiMode || !searchQuery.trim()) { setAiResults([]); return; }
    const t = setTimeout(async () => {
      setAiLoading(true);
      try { setAiResults(await searchCatalog(searchQuery, 30)); }
      catch { setAiResults([]); }
      finally { setAiLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [aiMode, searchQuery]);

  const filteredSteps = useMemo<AgentAction[]>(() => {
    if (aiMode && searchQuery.trim()) return aiResults;
    return actions.filter((step) => {
      const matchesCategory = selectedCategory === 'all' || step.category === selectedCategory;
      const matchesSearch = step.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           step.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [actions, aiMode, aiResults, searchQuery, selectedCategory]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      integration: 'bg-blue-100 text-blue-800',
      ai: 'bg-purple-100 text-purple-800',
      data: 'bg-green-100 text-green-800',
      logic: 'bg-yellow-100 text-yellow-800',
      communication: 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Action Library</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
                placeholder="Search actions…"
              />
            </div>
            <button
              onClick={() => setAiMode(m => !m)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                aiMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Search
            </button>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {aiMode && (
            <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {aiLoading ? 'Searching…' : 'AI semantic search active'}
            </p>
          )}
        </div>

        {/* Step Cards */}
        {loading ? (
          <PageState variant="loading" title="Loading actions…" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSteps.map((step) => (
                <div key={step.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold">{step.name}</h3>
                    <div className="flex items-center gap-1.5">
                      {step.executionMode === 'n8n' && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">n8n</span>
                      )}
                      {step.isSystem && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">System</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{step.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(step.category)}`}>
                      {step.category}
                    </span>
                    {Array.isArray(step.secretSchema) && step.secretSchema.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {step.secretSchema.length} secret{step.secretSchema.length > 1 ? 's' : ''} required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filteredSteps.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No actions match your search criteria
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4 text-right">{filteredSteps.length} action{filteredSteps.length !== 1 ? 's' : ''}</p>
          </>
        )}
      </div>
    </div>
  );
}
