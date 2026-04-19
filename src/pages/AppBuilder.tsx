/**
 * App Builder Page — visual workflow composer.
 *
 * Panels: Settings (left) · Flow Canvas (center) · Step Catalog (right)
 * Sub-panels: StepConfigPanel · DataMappingPanel · Secrets
 * Features: autosave badge, undo stack, test-step, validation error dots
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Save, Undo2, Zap, Globe, HelpCircle, Lock, Plus, Trash2,
  CheckCircle, Loader2, ShieldCheck, Sparkles, KeyRound, Terminal,
} from 'lucide-react';
import { FlowCanvas } from '../components/workflow/FlowCanvas';
import { StepConfigPanel } from '../components/workflow/StepConfigPanel';
import { DataMappingPanel } from '../components/workflow/DataMappingPanel';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import type { WorkflowStep } from '../lib/types';

// ── Types ─────────────────────────────────────────────────────────────

interface Workflow {
  name: string;
  description: string;
  triggerConfig: {
    type: 'cron' | 'webhook' | 'api' | 'manual';
    schedule?: string;
    webhookUrl?: string;
  };
  steps: WorkflowStep[];
}

interface SecretEntry {
  key: string;
  created_at: string;
}

// ── Catalog definition ────────────────────────────────────────────────

const CATALOG = [
  { id: 'step:http-request',  name: 'HTTP Request',    category: 'integration', icon: '🌐', desc: 'Call any REST API' },
  { id: 'step:ai-processing', name: 'AI Processing',   category: 'ai',          icon: '🤖', desc: 'Run an LLM prompt' },
  { id: 'step:data-transform',name: 'Data Transform',  category: 'data',        icon: '🔄', desc: 'Reshape or filter data' },
  { id: 'step:condition',     name: 'Condition/Branch',category: 'logic',       icon: '🔀', desc: 'True/false branching' },
  { id: 'step:delay',         name: 'Delay',           category: 'logic',       icon: '⏱️', desc: 'Wait N milliseconds' },
  { id: 'step:email-send',    name: 'Email Send',      category: 'communication',icon: '📧', desc: 'Send transactional email' },
  { id: 'step:twilio-sms',    name: 'Twilio SMS',      category: 'communication',icon: '💬', desc: 'Send SMS via Twilio' },
];

const CATALOG_CATEGORIES: Record<string, string> = Object.fromEntries(
  CATALOG.map(c => [c.id, c.category])
);

const MAPPABLE_FIELDS: Record<string, Array<{ key: string; label: string; placeholder?: string }>> = {
  'step:http-request':  [{ key: 'url', label: 'URL' }, { key: 'body', label: 'Body' }],
  'step:ai-processing': [{ key: 'prompt', label: 'Prompt' }, { key: 'systemPrompt', label: 'System Prompt' }],
  'step:data-transform':[{ key: 'template', label: 'Template' }, { key: 'jq', label: 'jq Expression' }],
  'step:condition':     [{ key: 'condition', label: 'Condition' }],
  'step:email-send':    [{ key: 'to', label: 'To' }, { key: 'subject', label: 'Subject' }, { key: 'body', label: 'Body' }],
  'step:twilio-sms':    [{ key: 'to', label: 'To Number' }, { key: 'body', label: 'Message' }],
};

// ── AppBuilder ─────────────────────────────────────────────────────────

export default function AppBuilder() {
  const { id: tenantId } = useParams<{ id: string }>();
  const tid = tenantId ?? (localStorage.getItem('currentTenantId') || '');

  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    description: '',
    triggerConfig: { type: 'webhook' },
    steps: [],
  });
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [testingStep, setTestingStep] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [secretKey, setSecretKey] = useState('');
  const [secretVal, setSecretVal] = useState('');
  const [savingSecret, setSavingSecret] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [configTab, setConfigTab] = useState<'config' | 'mapping'>('config');
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<'pass' | 'fail' | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);

  // ── Validate ────────────────────────────────────────────────────────

  const handleValidate = useCallback(async () => {
    setValidating(true);
    setValidateResult(null);
    const log: string[] = [];
    log.push(`[${new Date().toLocaleTimeString()}] ▶ Starting validation…`);
    await new Promise(r => setTimeout(r, 600));
    const errors: Record<string, string> = {};
    for (const step of workflow.steps) {
      log.push(`[${new Date().toLocaleTimeString()}] Checking: ${step.name}`);
      if (step.stepId === 'step:http-request' && !step.config?.url) {
        errors[step.id] = 'URL is required';
        log.push(`  ✗ ${step.name}: URL is required`);
      } else if (step.stepId === 'step:ai-processing' && !step.config?.prompt) {
        errors[step.id] = 'Prompt is required';
        log.push(`  ✗ ${step.name}: Prompt is required`);
      } else if (step.stepId === 'step:email-send' && !step.config?.to) {
        errors[step.id] = 'To address is required';
        log.push(`  ✗ ${step.name}: To address is required`);
      } else {
        log.push(`  ✓ ${step.name}: OK`);
      }
    }
    const passed = Object.keys(errors).length === 0;
    log.push(`[${new Date().toLocaleTimeString()}] ${passed ? '✅ All checks passed' : `❌ ${Object.keys(errors).length} error(s) found`}`);
    setValidationErrors(errors);
    setValidateResult(passed ? 'pass' : 'fail');
    setExecutionLog(log);
    setShowLog(true);
    setValidating(false);
  }, [workflow.steps]);

  // ── AI Assist ────────────────────────────────────────────────────────
  const handleAiAssist = useCallback(() => {
    if (workflow.steps.length === 0) {
      const suggestedSteps: WorkflowStep[] = [
        { id: 'step-ai-1', stepId: 'step:http-request', name: 'Fetch Data', config: { method: 'GET', url: 'https://api.example.com/data' } },
        { id: 'step-ai-2', stepId: 'step:ai-processing', name: 'AI Analysis', config: { model: 'gpt-4o-mini', prompt: 'Analyze the following data: {{step-ai-1.body}}' } },
        { id: 'step-ai-3', stepId: 'step:condition', name: 'Check Result', config: { condition: '{{step-ai-2.output}} contains "positive"' } },
      ];
      setWorkflow(w => ({ ...w, name: w.name || 'AI-Generated Workflow', steps: suggestedSteps }));
    }
  }, [workflow.steps.length]);

  // ── Undo stack ──────────────────────────────────────────────────────
  const undoStack = useRef<Workflow[]>([]);

  const pushUndo = useCallback((prev: Workflow) => {
    undoStack.current = [...undoStack.current.slice(-9), prev];
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop()!;
    setWorkflow(prev);
  }, []);

  // ── Workflow mutators ───────────────────────────────────────────────

  const updateWorkflow = useCallback((next: Workflow) => {
    setWorkflow(cur => { pushUndo(cur); return next; });
  }, [pushUndo]);

  // ── Autosave ────────────────────────────────────────────────────────

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentAppId || !workflow.name) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await api.updateApp(tid, currentAppId, {
          name: workflow.name,
          description: workflow.description,
          workflowJson: {
            version: '1',
            name: workflow.name,
            description: workflow.description,
            trigger: { type: workflow.triggerConfig.type as any, config: workflow.triggerConfig },
            steps: workflow.steps,
          },
          triggerConfig: { type: workflow.triggerConfig.type, config: workflow.triggerConfig },
        });
        setSavedAt(new Date());
      } catch { /* silent */ }
    }, 1500);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [workflow, currentAppId, tid]);

  // ── Secrets ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentAppId) return;
    api.getAppSecrets(tid, currentAppId).then(d => setSecrets(d.map(s => ({ key: s.key, created_at: s.created_at })))).catch(() => {});
  }, [currentAppId, tid]);

  const handleAddSecret = async () => {
    if (!currentAppId || !secretKey || !secretVal) return;
    setSavingSecret(true);
    try {
      await api.setAppSecret(tid, currentAppId, secretKey, secretVal);
      setSecrets(s => [...s, { key: secretKey, created_at: new Date().toISOString() }]);
      setSecretKey(''); setSecretVal('');
    } catch { /* silent */ } finally { setSavingSecret(false); }
  };

  const handleDeleteSecret = async (key: string) => {
    if (!currentAppId) return;
    await api.deleteAppSecret(tid, currentAppId, key);
    setSecrets(s => s.filter(x => x.key !== key));
  };

  // ── Canvas handlers ─────────────────────────────────────────────────

  const handleDropStep = useCallback((stepId: string, stepName: string) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      stepId,
      name: stepName,
      config: {},
    };
    updateWorkflow({ ...workflow, steps: [...workflow.steps, newStep] });
  }, [workflow, updateWorkflow]);

  const handleDeleteStep = useCallback((id: string) => {
    updateWorkflow({ ...workflow, steps: workflow.steps.filter(s => s.id !== id) });
    if (selectedStepId === id) setSelectedStepId(null);
  }, [workflow, updateWorkflow, selectedStepId]);

  const handleSelectStep = useCallback((id: string | null) => {
    setSelectedStepId(id);
    setConfigTab('config');
  }, []);

  const handleReorderSteps = useCallback((steps: WorkflowStep[]) => {
    updateWorkflow({ ...workflow, steps });
  }, [workflow, updateWorkflow]);

  const handleStepChange = useCallback((updated: WorkflowStep) => {
    updateWorkflow({ ...workflow, steps: workflow.steps.map(s => s.id === updated.id ? updated : s) });
  }, [workflow, updateWorkflow]);

  // ── Test step ───────────────────────────────────────────────────────

  const handleTestStep = useCallback(async (step: WorkflowStep) => {
    if (!currentAppId) return;
    setTestingStep(step.id);
    try {
      const result = await api.testStep(tid, currentAppId, step);
      setTestResults(r => ({ ...r, [step.id]: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }));
      setValidationErrors(e => { const next = { ...e }; delete next[step.id]; return next; });
    } catch (err) {
      setValidationErrors(e => ({ ...e, [step.id]: err instanceof Error ? err.message : 'Test failed' }));
    } finally { setTestingStep(null); }
  }, [currentAppId, tid]);

  // ── Save ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!workflow.name) return;
    setSaving(true);
    try {
      if (currentAppId) {
        await api.updateApp(tid, currentAppId, {
          name: workflow.name,
          description: workflow.description,
          workflowJson: {
            version: '1',
            name: workflow.name,
            description: workflow.description,
            trigger: { type: workflow.triggerConfig.type as any, config: workflow.triggerConfig },
            steps: workflow.steps,
          },
          triggerConfig: { type: workflow.triggerConfig.type, config: workflow.triggerConfig },
        });
      } else {
        const app = await api.createApp({
          tenantId: tid,
          name: workflow.name,
          description: workflow.description,
          workflowJson: {
            version: '1',
            name: workflow.name,
            description: workflow.description,
            trigger: { type: workflow.triggerConfig.type as any, config: workflow.triggerConfig },
            steps: workflow.steps,
          },
          triggerConfig: { type: workflow.triggerConfig.type, config: workflow.triggerConfig },
        });
        setCurrentAppId(app.id);
      }
      setSavedAt(new Date());
    } catch { /* silent */ } finally { setSaving(false); }
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleUndo]);

  // ── Derived ──────────────────────────────────────────────────────────

  const selectedStep = useMemo(
    () => workflow.steps.find(s => s.id === selectedStepId) ?? null,
    [workflow.steps, selectedStepId]
  );

  const errorStepIds = useMemo(
    () => new Set(Object.keys(validationErrors)),
    [validationErrors]
  );

  const webhookUrl = workflow.triggerConfig.type === 'webhook'
    ? (workflow.triggerConfig.webhookUrl || (currentAppId ? `/webhooks/${currentAppId}` : '/webhooks/{id} — save to activate'))
    : null;

  const filteredCatalog = useMemo(
    () => CATALOG.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase()) || c.desc.toLowerCase().includes(catalogSearch.toLowerCase())),
    [catalogSearch]
  );

  const undoDisabled = undoStack.current.length === 0;

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">App Builder</h1>
          {currentAppId && savedAt && (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Autosave on · saved {savedAt.toLocaleTimeString()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoDisabled} title="Undo (Ctrl+Z)" aria-label="Undo (Ctrl+Z)" aria-keyshortcuts="Control+z">
            <Undo2 className="h-4 w-4" />
            <span className="hidden md:inline text-xs ml-1 text-gray-400">⌘Z</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleValidate} disabled={validating} title="Validate workflow" aria-label="Validate workflow">
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          </Button>
          {validateResult && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${validateResult === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {validateResult === 'pass' ? '✓ Valid' : `✗ ${Object.keys(validationErrors).length} error${Object.keys(validationErrors).length !== 1 ? 's' : ''}`}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(h => !h)} title="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button onClick={handleSave} disabled={saving || !workflow.name} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" title="Save (Ctrl+S)" aria-label="Save workflow (Ctrl+S)" aria-keyshortcuts="Control+s">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
            <span className="hidden md:inline text-xs ml-1 opacity-70">⌘S</span>
          </Button>
        </div>
      </div>

      {/* ── Keyboard shortcuts bar (compact, right-aligned) ─────────────── */}
      <div className="px-4 py-0.5 bg-white border-b border-gray-100 flex items-center justify-end gap-3 text-xs text-gray-300 flex-shrink-0" role="toolbar" aria-label="Keyboard shortcuts">
        <span><kbd className="px-1 bg-gray-50 border border-gray-200 rounded text-gray-400 font-mono">⌘S</kbd> save</span>
        <span><kbd className="px-1 bg-gray-50 border border-gray-200 rounded text-gray-400 font-mono">⌘Z</kbd> undo</span>
        <span><kbd className="px-1 bg-gray-50 border border-gray-200 rounded text-gray-400 font-mono">Del</kbd> remove</span>
      </div>

      {/* ── Help overlay ─────────────────────────────────────────────── */}
      {showHelp && (
        <div className="mx-4 mt-2 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-sm text-indigo-800 flex-shrink-0">
          <strong>Panels:</strong> Settings (left) · Canvas (center) · Catalog (right, click or drag to canvas). Select a node to configure it. <strong>Keyboard:</strong> Delete = remove selected node · Ctrl+Z = undo · Ctrl+S = save.
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col gap-3 p-3">

      {/* ── 3-column grid ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">

        {/* ── Left: Settings + Secrets ─────────────────────────────── */}
        <div className="md:col-span-3 flex flex-col gap-3 overflow-y-auto">

          {/* Settings card */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">Workflow Settings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={workflow.name}
                  onChange={e => setWorkflow(w => ({ ...w, name: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  placeholder="My Workflow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={workflow.description}
                  onChange={e => setWorkflow(w => ({ ...w, description: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  rows={2}
                  placeholder="Describe what this workflow does"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trigger</label>
                <select
                  value={workflow.triggerConfig.type}
                  onChange={e => setWorkflow(w => ({ ...w, triggerConfig: { ...w.triggerConfig, type: e.target.value as any } }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="webhook">🔗 Webhook</option>
                  <option value="api">🌐 API Trigger</option>
                  <option value="cron">⏰ Cron Schedule</option>
                  <option value="manual">▶️ Manual</option>
                </select>
              </div>
              {workflow.triggerConfig.type === 'cron' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cron Expression</label>
                  <input
                    type="text"
                    value={workflow.triggerConfig.schedule || ''}
                    onChange={e => setWorkflow(w => ({ ...w, triggerConfig: { ...w.triggerConfig, schedule: e.target.value } }))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono"
                    placeholder="0 * * * *"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g. <code>0 9 * * 1-5</code> = weekdays 9 AM</p>
                </div>
              )}
              {workflow.triggerConfig.type === 'webhook' && webhookUrl && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Globe className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                    <code className="text-xs text-indigo-700 break-all">{webhookUrl}</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secrets card */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-600" /> Secrets
                <span className="ml-auto text-xs font-normal text-green-600 flex items-center gap-0.5"><Lock className="h-3 w-3" /> Encrypted at rest</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {secrets.length > 0 ? (
                <div className="space-y-1">
                  {secrets.map(s => (
                    <div key={s.key} className="flex items-center justify-between px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-amber-600" />
                        <span className="text-xs font-mono font-medium text-amber-900">{s.key}</span>
                        <span className="text-xs text-gray-400">••••••</span>
                      </div>
                      <button onClick={() => handleDeleteSecret(s.key)} className="text-gray-400 hover:text-red-500 ml-1" title="Remove secret">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No secrets yet. Add API keys, tokens, or credentials below.</p>
              )}
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                  placeholder="SECRET_KEY"
                  aria-label="Secret key name"
                />
                <input
                  type="password"
                  value={secretVal}
                  onChange={e => setSecretVal(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                  placeholder="secret value"
                  aria-label="Secret value"
                />
                <Button
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  onClick={handleAddSecret}
                  disabled={savingSecret || !secretKey || !secretVal || !currentAppId}
                  title={!currentAppId ? 'Save the workflow first to add secrets' : 'Add encrypted secret'}
                >
                  {savingSecret ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Add Secret
                </Button>
              </div>
              {!currentAppId && (
                <p className="text-xs text-amber-600">⚠️ Save the workflow first to manage secrets.</p>
              )}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Usage in steps:</p>
                <code className="block text-xs bg-gray-100 text-indigo-700 px-2 py-1 rounded font-mono break-all">
                  {'{{SECRET_NAME}}'}
                </code>
                <p className="text-xs text-gray-400 mt-1">Reference any secret in step config fields using the <span className="font-mono text-indigo-600">{'{{KEY}}'}</span> syntax.</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Center: Canvas ───────────────────────────────────────── */}
        <div className="md:col-span-5 flex flex-col gap-3 min-h-0">
          <Card className="shadow-sm flex-1 flex flex-col min-h-0">
            <CardHeader className="py-3 px-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Workflow Canvas
                  {workflow.steps.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">{workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}</span>
                  )}
                </CardTitle>
                {Object.keys(validationErrors).length > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                    {Object.keys(validationErrors).length} error{Object.keys(validationErrors).length !== 1 ? 's' : ''}
                  </Badge>
                )}
                <button
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                  onClick={() => setShowHelp(h => !h)}
                  title="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 relative">
              {showHelp && workflow.steps.length === 0 && (
                <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center p-4 text-center">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">3 Panels</h3>
                  <div className="space-y-2 text-xs text-gray-600 max-w-[240px]">
                    <p><strong className="text-indigo-600">Settings (left)</strong><br />Workflow name, trigger, secrets</p>
                    <p><strong className="text-indigo-600">Canvas (center)</strong><br />Drag steps here to build your workflow</p>
                    <p><strong className="text-indigo-600">Catalog (right)</strong><br />Click or drag steps to add</p>
                  </div>
                </div>
              )}
              {workflow.steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 p-6">
                  <div className="text-center pointer-events-none select-none">
                    <Zap className="h-10 w-10 mb-3 opacity-20 mx-auto text-indigo-400" />
                    <p className="text-sm font-medium text-gray-500">Drop steps here to build your workflow</p>
                    <p className="text-xs mt-1 text-gray-400">Click a step in the catalog or drag it onto the canvas</p>
                  </div>
                  <div className="flex gap-2 pointer-events-auto">
                    <button
                      onClick={handleAiAssist}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> AI Assist
                    </button>
                    <button
                      onClick={() => {
                        ['step:http-request', 'step:ai-processing', 'step:condition'].forEach((id) => {
                          const item = CATALOG.find(c => c.id === id)!;
                          handleDropStep(item.id, item.name);
                        });
                        setWorkflow(w => ({ ...w, name: w.name || 'HTTP → AI → Branch' }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      🌐 API + AI template
                    </button>
                    <button
                      onClick={() => {
                        ['step:http-request', 'step:email-send'].forEach((id) => {
                          const item = CATALOG.find(c => c.id === id)!;
                          handleDropStep(item.id, item.name);
                        });
                        setWorkflow(w => ({ ...w, name: w.name || 'Fetch + Email Notify' }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      📧 Notify template
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', minHeight: 320 }}>
                  <FlowCanvas
                    steps={workflow.steps}
                    triggerType={workflow.triggerConfig.type}
                    selectedStepId={selectedStepId}
                    catalogCategories={CATALOG_CATEGORIES}
                    webhookUrl={webhookUrl}
                    errorStepIds={errorStepIds}
                    onSelectStep={handleSelectStep}
                    onDeleteStep={handleDeleteStep}
                    onDropStep={handleDropStep}
                    onReorderSteps={handleReorderSteps}
                  />
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── Right: Step Catalog ──────────────────────────────────── */}
        <div className="md:col-span-4 overflow-y-auto">
          <Card className="shadow-sm h-full">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">Step Catalog</CardTitle>
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs mt-2"
                placeholder="Search steps…"
              />
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1.5">
              {filteredCatalog.map(item => (
                <button
                  key={item.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('application/workflow-step-id', item.id);
                    e.dataTransfer.setData('application/workflow-step-name', item.name);
                    e.dataTransfer.setData('application/workflow-step-category', item.category);
                  }}
                  onClick={() => handleDropStep(item.id, item.name)}
                  className="w-full text-left p-2.5 border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No steps match "{catalogSearch}"</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── Step config panel (outside grid to avoid ReactFlow z-index) ── */}
      {selectedStep && (
        <Card className="shadow-sm flex-shrink-0 mx-0">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Configure: {selectedStep.name}</CardTitle>
              <div className="flex items-center gap-1">
                <button
                  className={`px-2 py-0.5 text-xs rounded ${configTab === 'config' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setConfigTab('config')}
                >Config</button>
                <button
                  className={`px-2 py-0.5 text-xs rounded ${configTab === 'mapping' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setConfigTab('mapping')}
                >Data Mapping</button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {configTab === 'config' ? (
              <div className="space-y-3">
                <StepConfigPanel
                  step={selectedStep}
                  allSteps={workflow.steps}
                  onChange={handleStepChange}
                  tenantId={tid}
                  appId={currentAppId ?? undefined}
                />
                <div className="pt-2 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestStep(selectedStep)}
                    disabled={testingStep === selectedStep.id}
                    className="w-full text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    {testingStep === selectedStep.id
                      ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Testing…</>
                      : <><Zap className="h-3 w-3 mr-1" />Test Step</>}
                  </Button>
                  {validationErrors[selectedStep.id] && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors[selectedStep.id]}</p>
                  )}
                  {testResults[selectedStep.id] && (
                    <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-32 font-mono">
                      {testResults[selectedStep.id]}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <DataMappingPanel
                currentStep={selectedStep}
                allSteps={workflow.steps}
                mappableFields={MAPPABLE_FIELDS[selectedStep.stepId] ?? []}
                onChange={updates => handleStepChange({ ...selectedStep, config: { ...selectedStep.config, ...updates } })}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Execution Log (D5) ────────────────────────────────────────── */}
      {showLog && executionLog.length > 0 && (
        <Card className="shadow-sm flex-shrink-0 mx-0 border-gray-200">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-gray-500" />
                Execution Log
                {validateResult && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-1 ${validateResult === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {validateResult === 'pass' ? '✓ All checks passed' : `✗ ${Object.keys(validationErrors).length} error(s)`}
                  </span>
                )}
              </CardTitle>
              <button onClick={() => setShowLog(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <pre className="text-xs font-mono bg-gray-950 text-green-400 rounded-lg p-3 overflow-auto max-h-28 leading-relaxed">
              {executionLog.join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}

      </div>
    </div>
  );
}
