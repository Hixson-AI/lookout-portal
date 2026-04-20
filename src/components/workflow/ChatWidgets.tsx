/**
 * Inline chat widgets — React components rendered inside the builder chat
 * when the AI returns a tool_call instead of plain text.
 *
 * Each widget calls onSubmit(result: string) when the user completes it.
 * The result string is sent back to the AI as a tool message.
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { CheckCircle, Plus, ChevronRight } from 'lucide-react';
import type { ToolCallProps } from '../../lib/api/agents';

const CATEGORY_COLORS: Record<string, string> = {
  integration:   'bg-blue-100 text-blue-800',
  ai:            'bg-purple-100 text-purple-800',
  data:          'bg-green-100 text-green-800',
  logic:         'bg-yellow-100 text-yellow-800',
  communication: 'bg-pink-100 text-pink-800',
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
  const { label = 'Enter value', placeholder = '', hint } = props;
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <label className="block text-xs font-semibold text-indigo-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <Button
        size="sm"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
      >
        <ChevronRight className="h-3.5 w-3.5 mr-1" /> Confirm
      </Button>
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
  const { label = 'Choose one', options = [] } = props;
  const [selected, setSelected] = useState('');

  const handleSubmit = () => {
    if (!selected) return;
    const opt = options.find(o => o.value === selected);
    onSubmit(opt ? `${opt.label} (${opt.value})` : selected);
  };

  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-700">{label}</p>
      <div className="grid grid-cols-1 gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => !disabled && setSelected(opt.value)}
            disabled={disabled}
            className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
              selected === opt.value
                ? 'border-indigo-400 bg-white shadow-sm font-medium text-indigo-700'
                : 'border-gray-200 bg-white hover:border-indigo-300 text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        onClick={handleSubmit}
        disabled={disabled || !selected}
      >
        <ChevronRight className="h-3.5 w-3.5 mr-1" /> Confirm
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
