/**
 * Inline chat widgets — React components rendered inside the builder chat
 * when the AI returns a tool_call instead of plain text.
 *
 * Each widget calls onSubmit(result: string) when the user completes it.
 * The result string is sent back to the AI as a tool message.
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { CheckCircle, Plus, ChevronRight, PlayCircle, Loader2, AlertCircle } from 'lucide-react';
import type { ToolCallProps } from '../../lib/api/agents';
import { VALIDATORS, HTML_TYPE, TEXTAREA_TYPES } from '../../lib/field-validators';
import type { FieldType } from '../../lib/field-validators';
import { RequiredSecretsPanel } from '../secrets/RequiredSecretsPanel';
import { getAppRequiredSecrets } from '../../lib/api/app-secrets';

const CATEGORY_COLORS: Record<string, string> = {
  integration:      'bg-blue-100 text-blue-800',
  ai:               'bg-purple-100 text-purple-800',
  data:             'bg-green-100 text-green-800',
  logic:            'bg-yellow-100 text-yellow-800',
  communication:    'bg-pink-100 text-pink-800',
  // Google integrations → blue
  'google-calendar': 'bg-blue-100 text-blue-800',
  'google-gmail':    'bg-blue-100 text-blue-800',
  'google-chat':     'bg-blue-100 text-blue-800',
  'google-drive':    'bg-blue-100 text-blue-800',
  // QuickBooks → amber
  quickbooks:        'bg-amber-100 text-amber-800',
  // Twilio → pink
  twilio:            'bg-pink-100 text-pink-800',
  // Email providers → green
  resend:            'bg-green-100 text-green-800',
  sendgrid:          'bg-green-100 text-green-800',
  mailgun:           'bg-green-100 text-green-800',
  postmark:          'bg-green-100 text-green-800',
};

// ── StepPickerWidget ───────────────────────────────────────────────────────

interface StepPickerWidgetProps {
  props: ToolCallProps;
  onSubmit: (result: string) => void;
  disabled: boolean;
}

export function StepPickerWidget({ props, onSubmit, disabled }: StepPickerWidgetProps) {
  const { title = 'Choose steps', steps = [], multi = true } = props;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (disabled) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (multi) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        return new Set([id]);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const chosen = steps.filter(s => selected.has(s.id));
    onSubmit(
      chosen.length > 0
        ? `Selected: ${chosen.map(s => `${s.name} (${s.id})`).join(', ')}`
        : 'No steps selected',
    );
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">{title}</p>
      <div className="grid grid-cols-1 gap-1.5">
        {steps.map(step => {
          const isSelected = selected.has(step.id);
          return (
            <button
              key={step.id}
              onClick={() => toggle(step.id)}
              disabled={disabled}
              className={`text-left w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                isSelected
                  ? 'border-indigo-400 bg-white shadow-sm'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{step.name}</span>
                  {step.description && (
                    <span className="ml-1.5 text-gray-400 text-xs">{step.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[step.category] ?? 'bg-gray-100 text-gray-700'}`}>
                    {step.category}
                  </span>
                  {isSelected && <CheckCircle className="h-4 w-4 text-indigo-500" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <Button
        size="sm"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        onClick={handleSubmit}
        disabled={disabled || selected.size === 0}
      >
        <ChevronRight className="h-3.5 w-3.5 mr-1" />
        {selected.size > 0 ? `Use ${selected.size} step${selected.size > 1 ? 's' : ''}` : 'Select steps'}
      </Button>
    </div>
  );
}

// ── FieldInputWidget ───────────────────────────────────────────────────────

interface FieldInputWidgetProps {
  props: ToolCallProps;
  onSubmit: (result: string) => void;
  disabled: boolean;
}


export function FieldInputWidget({ props, onSubmit, disabled }: FieldInputWidgetProps) {
  const {
    label = 'Enter value',
    placeholder = '',
    hint,
    default_value = '',
    field_type = 'text',
    required = true,
    allow_skip,
    min,
    max,
    min_length,
    max_length,
    pattern,
  } = props;
  const hasDefault = default_value.trim().length > 0;
  const [editing, setEditing] = useState(!hasDefault);
  const [value, setValue] = useState(default_value);
  const [touched, setTouched] = useState(false);

  // Skip button surfaces when caller explicitly enables it, or by default for
  // optional fields. Required fields never show Skip.
  const skipEnabled = required ? false : (allow_skip ?? true);

  const typeValidate = VALIDATORS[field_type as FieldType] ?? VALIDATORS.text;

  /**
   * Compose the type validator with JSON Schema-style constraints supplied by
   * the LLM (mirrors inputSchema min/max/length/pattern). Empty values short-
   * circuit when the field is optional so the user can submit nothing.
   */
  const validate = (v: string): string | null => {
    const trimmed = v.trim();
    if (!trimmed) {
      return required ? 'Required' : null;
    }
    const typeErr = typeValidate(v);
    if (typeErr) return typeErr;

    // Numeric range — only meaningful for numeric field types.
    const numericTypes: FieldType[] = ['number', 'integer', 'percentage', 'port', 'currency'];
    if (numericTypes.includes(field_type as FieldType)) {
      const n = Number(trimmed);
      if (typeof min === 'number' && n < min) return `Must be ≥ ${min}`;
      if (typeof max === 'number' && n > max) return `Must be ≤ ${max}`;
    }

    if (typeof min_length === 'number' && trimmed.length < min_length) {
      return `Must be at least ${min_length} characters`;
    }
    if (typeof max_length === 'number' && trimmed.length > max_length) {
      return `Must be at most ${max_length} characters`;
    }

    if (typeof pattern === 'string' && pattern.length > 0) {
      try {
        if (!new RegExp(pattern).test(trimmed)) return 'Does not match required format';
      } catch {
        // Invalid regex from the model — silently ignore rather than block the user.
      }
    }

    return null;
  };

  const error = touched ? validate(value) : null;
  const isValid = !validate(value);

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    const trimmed = value.trim();
    if (!trimmed && !required) {
      onSubmit('<not provided>');
      return;
    }
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleSkip = () => {
    onSubmit('<not provided>');
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <label className="block text-xs font-semibold text-indigo-700">{label}</label>

      {!editing ? (
        /* ── Suggested value: one-click confirm ── */
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg">
          <span className="text-sm font-mono text-indigo-800 truncate">{value}</span>
          {!disabled && (
            <button
              onClick={() => { setEditing(true); setTouched(false); }}
              className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 underline"
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        /* ── Editable input ── */
        <div className="space-y-1">
          {TEXTAREA_TYPES.has(field_type as FieldType) ? (
            <textarea
              rows={field_type === 'json' ? 5 : 3}
              value={value}
              onChange={e => { setValue(e.target.value); setTouched(true); }}
              onBlur={() => setTouched(true)}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus
              className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 font-mono resize-y ${
                error ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
          ) : field_type === 'color' ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value || '#6366f1'}
                onChange={e => { setValue(e.target.value); setTouched(true); }}
                disabled={disabled}
                className="h-8 w-14 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
              />
              <input
                type="text"
                value={value}
                onChange={e => { setValue(e.target.value); setTouched(true); }}
                onBlur={() => setTouched(true)}
                placeholder="#RRGGBB"
                disabled={disabled}
                className={`flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 font-mono ${
                  error ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
                }`}
              />
            </div>
          ) : (
            <input
              type={HTML_TYPE[field_type as FieldType] ?? 'text'}
              value={value}
              onChange={e => { setValue(e.target.value); setTouched(true); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              onBlur={() => setTouched(true)}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus
              className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 ${
                error ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {!required && (
        <p className="text-[10px] uppercase tracking-wide text-indigo-400">Optional</p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs disabled:opacity-40"
          onClick={handleSubmit}
          disabled={
            disabled ||
            (required && !value.trim()) ||
            (editing && !!value.trim() && !isValid)
          }
        >
          <ChevronRight className="h-3.5 w-3.5 mr-1" /> Confirm
        </Button>
        {skipEnabled && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={handleSkip}
            disabled={disabled}
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

// ── ChoiceSelectWidget ─────────────────────────────────────────────────────

interface ChoiceSelectWidgetProps {
  props: ToolCallProps;
  onSubmit: (result: string) => void;
  disabled: boolean;
}

export function ChoiceSelectWidget({ props, onSubmit, disabled }: ChoiceSelectWidgetProps) {
  const { label = 'Choose one', options = [], multi = false, required = true } = props;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (value: string) => {
    if (disabled) return;
    setSelected(prev => {
      if (multi) {
        const next = new Set(prev);
        next.has(value) ? next.delete(value) : next.add(value);
        return next;
      }
      return new Set([value]);
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) {
      if (!required) onSubmit('<not provided>');
      return;
    }
    const chosen = options.filter(o => selected.has(o.value));
    onSubmit(chosen.map(o => `${o.label} (${o.value})`).join(', '));
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">{label}</p>
      <div className="grid grid-cols-1 gap-1">
        {options.map(opt => {
          const isSelected = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              disabled={disabled}
              className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-between gap-2 ${
                isSelected
                  ? 'border-indigo-400 bg-white shadow-sm font-medium text-indigo-700'
                  : 'border-gray-200 bg-white hover:border-indigo-300 text-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span>{opt.label}</span>
              {isSelected && <CheckCircle className="h-4 w-4 text-indigo-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      {!required && (
        <p className="text-[10px] uppercase tracking-wide text-indigo-400">Optional</p>
      )}
      <Button
        size="sm"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        onClick={handleSubmit}
        disabled={disabled || (required && selected.size === 0)}
      >
        <ChevronRight className="h-3.5 w-3.5 mr-1" />
        {multi && selected.size > 1 ? `Confirm ${selected.size} selections` : 'Confirm'}
      </Button>
    </div>
  );
}

// ── ConfirmAddStepsWidget ──────────────────────────────────────────────────

interface ConfirmStep {
  stepId: string;
  name: string;
  config?: Record<string, unknown>;
}

interface ConfirmTrigger {
  type: string;
  schedule?: string;
}

interface ConfirmAddStepsWidgetProps {
  props: ToolCallProps;
  onConfirm: (steps: ConfirmStep[], trigger: ConfirmTrigger) => void;
  onReject: () => void;
  disabled: boolean;
}

export function ConfirmAddStepsWidget({ props, onConfirm, onReject, disabled }: ConfirmAddStepsWidgetProps) {
  const {
    summary = '',
    steps = [] as ConfirmStep[],
    trigger = { type: 'webhook' } as ConfirmTrigger,
  } = props;

  const triggerIcon: Record<string, string> = {
    webhook: '🔗',
    cron:    '⏰',
    api:     '🌐',
    manual:  '▶️',
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-3">
      {summary && (
        <p className="text-xs text-indigo-800 font-medium">{summary}</p>
      )}

      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Trigger</p>
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <span>{triggerIcon[trigger.type] ?? '⚡'}</span>
          <span className="capitalize">{trigger.type}</span>
          {trigger.schedule && <code className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded">{trigger.schedule}</code>}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Steps ({(steps as ConfirmStep[]).length})</p>
        <ol className="space-y-1">
          {(steps as ConfirmStep[]).map((step, i) => (
            <li key={step.stepId + i} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <div>
                <span className="font-medium text-gray-800">{step.name}</span>
                {step.config && Object.keys(step.config).length > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {Object.entries(step.config).slice(0, 2).map(([k, v]) => (
                      <span key={k} className="mr-2">{k}: <code>{String(v)}</code></span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          onClick={() => onConfirm(steps as ConfirmStep[], trigger as ConfirmTrigger)}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add to Canvas
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={onReject}
          disabled={disabled}
        >
          Not quite
        </Button>
      </div>
    </div>
  );
}

// ── RequiredSecretsWidget ──────────────────────────────────────────────────────

interface RequiredSecretsWidgetProps {
  props: ToolCallProps & { tenantId: string; appId: string };
  onSubmit: (result: string) => void;
  disabled: boolean;
}

export function RequiredSecretsWidget({ props, onSubmit, disabled }: RequiredSecretsWidgetProps) {
  const { message = 'Your workflow needs these credentials.', tenantId, appId } = props;
  const [submitting, setSubmitting] = useState(false);

  const handleDone = async () => {
    setSubmitting(true);
    try {
      const diff = await getAppRequiredSecrets(tenantId, appId);
      const totalRequired = diff.required.length;
      const filled = diff.present.length;
      const stillMissing = diff.missing.map(s => s.key);
      const summary = stillMissing.length === 0
        ? `All ${totalRequired} required secrets are configured.`
        : `Filled ${filled} of ${totalRequired} required secrets; ${stillMissing.length} still missing: ${stillMissing.join(', ')}`;
      onSubmit(summary);
    } catch {
      onSubmit('User finished managing secrets (status unknown)');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSubmit('User deferred filling required secrets');
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">{message}</p>
      <RequiredSecretsPanel
        tenantId={tenantId}
        appId={appId}
        message={message}
      />
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          onClick={handleDone}
          disabled={disabled || submitting}
        >
          {submitting ? 'Reporting...' : 'Done'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={handleSkip}
          disabled={disabled || submitting}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

// ── GuidedFillWidget ───────────────────────────────────────────────────────

interface GuidedFillWidgetProps {
  props: ToolCallProps;
  onSubmit: (result: string) => void;
  disabled: boolean;
}

export function GuidedFillWidget({ props, onSubmit, disabled }: GuidedFillWidgetProps) {
  const {
    stepName = 'Step',
    missingFields = [],
  } = props;

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  const currentField = missingFields[currentFieldIndex] as string | undefined;

  const handleFieldSubmit = () => {
    if (!currentField) return;

    const value = fieldValues[currentField] || '';
    setFieldValues(prev => ({ ...prev, [currentField]: value }));

    if (currentFieldIndex < missingFields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    } else {
      const allValues = { ...fieldValues, [currentField]: value };
      onSubmit(JSON.stringify(allValues));
    }
  };

  const handleSkip = () => {
    onSubmit('User skipped guided fill');
  };

  if (!currentField) {
    return (
      <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-indigo-700">{stepName}</p>
        <p className="text-xs text-gray-600">No missing fields to fill.</p>
        <Button
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          onClick={() => onSubmit(JSON.stringify(fieldValues))}
          disabled={disabled}
        >
          <ChevronRight className="h-3.5 w-3.5 mr-1" />
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">{stepName}</p>
      <p className="text-xs text-gray-600">
        Field {currentFieldIndex + 1} of {missingFields.length}
      </p>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">{currentField}</label>
        <input
          type="text"
          value={fieldValues[currentField] || ''}
          onChange={e => setFieldValues(prev => ({ ...prev, [currentField]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleFieldSubmit()}
          placeholder={`Enter ${currentField}`}
          disabled={disabled}
          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          onClick={handleFieldSubmit}
          disabled={disabled}
        >
          <ChevronRight className="h-3.5 w-3.5 mr-1" />
          {currentFieldIndex < missingFields.length - 1 ? 'Next' : 'Done'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={handleSkip}
          disabled={disabled}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

// ── TestStepWidget ────────────────────────────────────────────────────────

interface TestStepWidgetProps {
  props: ToolCallProps;
  onSubmit: (result: string) => void;
  disabled: boolean;
}

export function TestStepWidget({ props, onSubmit, disabled }: TestStepWidgetProps) {
  const {
    stepName = 'Step',
    config = {},
  } = props;

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [output, setOutput] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    setOutput('');

    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      setResult(isSuccess ? 'success' : 'error');
      setOutput(
        isSuccess
          ? 'Step executed successfully. Output: {"status": "ok", "data": "test result"}'
          : 'Step execution failed: Invalid configuration or missing credentials.'
      );
      setTesting(false);
    }, 1500);
  };

  const handleSubmit = () => {
    onSubmit(result === 'success' ? 'Test passed' : `Test failed: ${output}`);
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">{stepName}</p>

      <div className="space-y-1">
        <p className="text-xs text-gray-600">Configuration:</p>
        <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-auto max-h-24">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      {!result && !testing && (
        <Button
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          onClick={handleTest}
          disabled={disabled}
        >
          <PlayCircle className="h-3.5 w-3.5 mr-1" />
          Test Step
        </Button>
      )}

      {testing && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <span className="text-xs text-gray-600">Testing step...</span>
        </div>
      )}

      {result && (
        <div className={`p-2 rounded-lg ${result === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-2">
            {result === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${result === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {result === 'success' ? 'Test Passed' : 'Test Failed'}
              </p>
              <p className="text-xs text-gray-600 mt-1 break-words">{output}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <Button
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          onClick={handleSubmit}
          disabled={disabled}
        >
          <ChevronRight className="h-3.5 w-3.5 mr-1" />
          Continue
        </Button>
      )}
    </div>
  );
}
