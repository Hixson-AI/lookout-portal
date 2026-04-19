/**
 * DataMappingPanel — visual source → destination field wiring.
 *
 * Shows available output fields from upstream steps on the left,
 * and a list of configurable input fields for the current step on the right.
 * Users click a source field to copy its reference path ({{stepId.field}})
 * into the focused destination field.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Copy, Check, Zap } from 'lucide-react';
import type { WorkflowStep } from '../../lib/types';

// ── Types ─────────────────────────────────────────────────────────────

interface OutputField {
  stepId: string;
  stepName: string;
  field: string;
  path: string;       // e.g. "step_1234.data.items"
  example?: string;
}

interface MappingRow {
  destKey: string;
  destLabel: string;
  value: string;
  placeholder?: string;
}

export interface DataMappingPanelProps {
  /** The step being configured */
  currentStep: WorkflowStep;
  /** All steps in the workflow (to derive upstream outputs) */
  allSteps: WorkflowStep[];
  /** The config fields for the current step type */
  mappableFields: Array<{ key: string; label: string; placeholder?: string }>;
  /** Called when a mapping changes */
  onChange: (updates: Record<string, string>) => void;
}

// ── Derive upstream output fields from step definitions ───────────────

function inferOutputFields(step: WorkflowStep): OutputField[] {
  const base = (field: string, example?: string): OutputField => ({
    stepId: step.id,
    stepName: step.name,
    field,
    path: `{{${step.id}.${field}}}`,
    example,
  });

  switch (step.stepId) {
    case 'step:http-request':
      return [
        base('body', '{ "id": 1, "name": "..." }'),
        base('status', '200'),
        base('headers', '{ "content-type": "..." }'),
        base('body.data', '[ ... ]'),
        base('body.data[0]', '{ ... }'),
      ];
    case 'step:ai-processing':
      return [
        base('output', 'AI generated text'),
        base('model', 'openai/gpt-4o-mini'),
        base('usage.total_tokens', '342'),
      ];
    case 'step:data-transform':
      return [
        base('result', '{ ... }'),
        base('result.items', '[ ... ]'),
      ];
    case 'step:condition':
      return [
        base('matched', 'true'),
        base('branch', '"true" | "false"'),
      ];
    case 'step:twilio-sms':
    case 'step:email-send':
      return [
        base('messageId', 'sm_xxxxx'),
        base('status', '"sent"'),
      ];
    default:
      return [base('output'), base('result')];
  }
}

// ── SourceField pill ──────────────────────────────────────────────────

function SourcePill({
  field,
  onInsert,
}: {
  field: OutputField;
  onInsert: (path: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(field.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
      style={{ borderColor: 'var(--border)' }}
      onClick={() => onInsert(field.path)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', field.path);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className="min-w-0 flex-1">
        <code className="text-xs font-mono text-blue-700 break-all leading-tight block" title={field.path}>{field.path}</code>
        {field.example && (
          <span className="text-[10px] text-gray-500 block mt-0.5">{field.example}</span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy reference"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
      </button>
    </div>
  );
}

// ── MappingField (right side) ─────────────────────────────────────────

function MappingField({
  row,
  isFocused,
  onFocus,
  onChange,
  onDrop,
}: {
  row: MappingRow;
  isFocused: boolean;
  onFocus: () => void;
  onChange: (val: string) => void;
  onDrop: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const val = e.dataTransfer.getData('text/plain');
    if (val) onDrop(val);
  };

  return (
    <div
      className={`rounded-lg border transition-all ${isFocused ? 'border-blue-400 ring-1 ring-blue-300' : ''}`}
      style={{ borderColor: isFocused ? undefined : 'var(--border)' }}
    >
      <label className="block text-[10px] font-semibold uppercase tracking-wide px-2 pt-1.5 pb-0.5"
        style={{ color: 'var(--text-secondary)' }}>
        {row.destLabel}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={row.value}
        placeholder={row.placeholder ?? `{{stepId.field}} or literal`}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full px-2 pb-2 text-xs font-mono bg-transparent outline-none"
      />
    </div>
  );
}

// ── DataMappingPanel ──────────────────────────────────────────────────

export function DataMappingPanel({
  currentStep,
  allSteps,
  mappableFields,
  onChange,
}: DataMappingPanelProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(
    mappableFields.length > 0 ? mappableFields[0].key : null
  );
  const [values, setValues] = useState<Record<string, string>>({});

  // Sync values when currentStep changes
  useEffect(() => {
    const cfg = (currentStep.config ?? {}) as Record<string, string>;
    setValues(Object.fromEntries(mappableFields.map(f => [f.key, cfg[f.key] ?? ''])));
  }, [currentStep, mappableFields]);

  // Upstream steps only (those before current in workflow)
  const currentIdx = allSteps.findIndex(s => s.id === currentStep.id);
  const upstreamSteps = allSteps.slice(0, currentIdx);
  const allUpstreamFields = upstreamSteps.flatMap(inferOutputFields);

  // Trigger output is always available
  const triggerFields: OutputField[] = [
    { stepId: 'trigger', stepName: 'Trigger', field: 'body', path: '{{trigger.body}}', example: 'Raw webhook payload' },
    { stepId: 'trigger', stepName: 'Trigger', field: 'body.email', path: '{{trigger.body.email}}', example: 'user@example.com' },
    { stepId: 'trigger', stepName: 'Trigger', field: 'body.name', path: '{{trigger.body.name}}', example: 'Jane Smith' },
    { stepId: 'trigger', stepName: 'Trigger', field: 'headers', path: '{{trigger.headers}}', example: '{ ... }' },
  ];

  const sourceFields = [...triggerFields, ...allUpstreamFields];

  const handleValueChange = (key: string, val: string) => {
    const next = { ...values, [key]: val };
    setValues(next);
    onChange(next);
  };

  const handleInsert = (path: string) => {
    const targetKey = focusedKey || (mappableFields.length > 0 ? mappableFields[0].key : null);
    if (!targetKey) return;
    const current = values[targetKey] ?? '';
    const next = { ...values, [targetKey]: current + path };
    setValues(next);
    onChange(next);
  };

  const rows: MappingRow[] = mappableFields.map(f => ({
    destKey: f.key,
    destLabel: f.label,
    value: values[f.key] ?? '',
    placeholder: f.placeholder,
  }));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
        <Zap className="h-3.5 w-3.5" />
        Data Mapping
        <span className="text-gray-400 font-normal">— click or drag a source field into a destination</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Left: source fields */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Available Outputs
          </p>

          {sourceFields.length === 0 && (
            <p className="text-xs text-gray-400 italic">No upstream steps yet</p>
          )}

          {/* Group by step */}
          {(() => {
            const groups = new Map<string, OutputField[]>();
            for (const f of sourceFields) {
              const key = `${f.stepId}:${f.stepName}`;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(f);
            }
            return Array.from(groups.entries()).map(([key, fields]) => {
              const [, name] = key.split(':');
              return (
                <div key={key} className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <ChevronRight className="h-2.5 w-2.5" />
                    {name}
                  </p>
                  {fields.map(f => (
                    <SourcePill key={f.path} field={f} onInsert={handleInsert} />
                  ))}
                </div>
              );
            });
          })()}
        </div>

        {/* Right: destination fields */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {focusedKey ? `→ Inserting into: ${mappableFields.find(f => f.key === focusedKey)?.label}` : 'Step Inputs'}
          </p>
          {rows.map(row => (
            <MappingField
              key={row.destKey}
              row={row}
              isFocused={focusedKey === row.destKey}
              onFocus={() => setFocusedKey(row.destKey)}
              onChange={(val) => handleValueChange(row.destKey, val)}
              onDrop={(path) => handleValueChange(row.destKey, (values[row.destKey] ?? '') + path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
