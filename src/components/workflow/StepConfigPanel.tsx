/**
 * Rich per-step-type configuration forms for the workflow builder.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Zap, Settings2, Play, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import type { WorkflowStep } from '../../lib/types';
import { DataMappingPanel } from './DataMappingPanel';

interface StepConfigPanelProps {
  step: WorkflowStep;
  allSteps?: WorkflowStep[];
  onChange: (step: WorkflowStep) => void;
  tenantId?: string;
  appId?: string;
}

// mappable fields per step type — used by DataMappingPanel
const MAPPABLE_FIELDS: Record<string, Array<{ key: string; label: string; placeholder?: string }>> = {
  'step:http-request': [
    { key: 'url', label: 'URL', placeholder: 'https://api.example.com/{{trigger.id}}' },
    { key: 'body', label: 'Request Body', placeholder: '{"id": "{{trigger.id}}"}' },
  ],
  'step:ai-processing': [
    { key: 'prompt', label: 'User Prompt', placeholder: 'Classify: {{trigger.message}}' },
    { key: 'systemPrompt', label: 'System Prompt' },
  ],
  'step:data-transform': [
    { key: 'template', label: 'Output Template', placeholder: '{"name": "{{trigger.name}}"}' },
    { key: 'jq', label: 'jq Expression', placeholder: '.data | {id, name}' },
    { key: 'inputFrom', label: 'Input Source Step ID' },
  ],
  'step:condition': [
    { key: 'condition', label: 'Condition', placeholder: '{{classify.category}} === "billing"' },
  ],
  'step:email-send': [
    { key: 'to', label: 'To Address', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: 'Re: {{trigger.subject}}' },
    { key: 'body', label: 'Body HTML', placeholder: '<p>Hello {{trigger.name}}</p>' },
  ],
  'step:twilio-sms': [
    { key: 'to', label: 'To Number', placeholder: '{{trigger.phone}}' },
    { key: 'body', label: 'Message', placeholder: 'Hi {{trigger.name}}, your ticket is {{classify.id}}' },
  ],
};

// ── Shared helpers ────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, monospace }: {
  value: string; onChange: (v: string) => void; placeholder?: string; monospace?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-lg text-sm ${monospace ? 'font-mono' : ''}`}
      style={{ borderColor: 'var(--border)' }}
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border rounded-lg text-sm"
      style={{ borderColor: 'var(--border)' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TextareaInput({ value, onChange, placeholder, rows = 4, monospace }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; monospace?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2 border rounded-lg text-sm ${monospace ? 'font-mono' : ''}`}
      style={{ borderColor: 'var(--border)' }}
    />
  );
}

function KVEditor({ label, value, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const entries = Object.entries(value);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const addEntry = () => {
    if (!newKey) return;
    onChange({ ...value, [newKey]: newVal });
    setNewKey('');
    setNewVal('');
  };

  const removeEntry = (k: string) => {
    const next = { ...value };
    delete next[k];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 items-center">
          <input value={k} readOnly className="flex-1 px-2 py-1.5 border rounded text-xs font-mono bg-gray-50" style={{ borderColor: 'var(--border)' }} />
          <input
            value={v}
            onChange={e => onChange({ ...value, [k]: e.target.value })}
            className="flex-1 px-2 py-1.5 border rounded text-xs font-mono"
            style={{ borderColor: 'var(--border)' }}
          />
          <button onClick={() => removeEntry(k)} className="p-1 text-red-400 hover:text-red-600">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2 items-center">
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder={keyPlaceholder}
          className="flex-1 px-2 py-1.5 border rounded text-xs font-mono"
          style={{ borderColor: 'var(--border)' }}
        />
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          placeholder={valuePlaceholder}
          className="flex-1 px-2 py-1.5 border rounded text-xs font-mono"
          style={{ borderColor: 'var(--border)' }}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
        />
        <button onClick={addEntry} className="p-1 text-blue-500 hover:text-blue-700">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── HTTP Request ──────────────────────────────────────────────────────

function HttpRequestConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });
  const authType = config.auth?.type || 'none';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Field label="Method">
          <SelectInput
            value={config.method || 'GET'}
            onChange={v => set('method', v)}
            options={['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map(m => ({ value: m, label: m }))}
          />
        </Field>
        <div className="col-span-3">
          <Field label="URL">
            <TextInput value={config.url || ''} onChange={v => set('url', v)} placeholder="https://api.example.com/endpoint" monospace />
          </Field>
        </div>
      </div>


      {/* Auth — shown first, most impactful */}
      <div className="space-y-3 p-3 rounded-lg border bg-gray-50" style={{ borderColor: 'var(--border)' }}>
        <Field label="Authentication">
          <SelectInput
            value={authType}
            onChange={v => set('auth', { ...config.auth, type: v })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'bearer', label: 'Bearer Token' },
              { value: 'basic', label: 'Basic Auth' },
              { value: 'api-key', label: 'API Key Header' },
              { value: 'oauth2-client-credentials', label: 'OAuth 2.0 — Client Credentials' },
              { value: 'oauth2-password', label: 'OAuth 2.0 — Password Grant' },
            ]}
          />
        </Field>
        {authType === 'bearer' && (
          <Field label="Token (use {{SECRET_NAME}} for secrets)">
            <TextInput value={config.auth?.token || ''} onChange={v => set('auth', { ...config.auth, token: v })} placeholder="{{BEARER_TOKEN}}" monospace />
          </Field>
        )}
        {authType === 'basic' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Username">
              <TextInput value={config.auth?.username || ''} onChange={v => set('auth', { ...config.auth, username: v })} placeholder="username" />
            </Field>
            <Field label="Password">
              <TextInput value={config.auth?.password || ''} onChange={v => set('auth', { ...config.auth, password: v })} placeholder="{{PASSWORD}}" monospace />
            </Field>
          </div>
        )}
        {authType === 'api-key' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Header Name">
              <TextInput value={config.auth?.headerName || 'X-API-Key'} onChange={v => set('auth', { ...config.auth, headerName: v })} monospace />
            </Field>
            <Field label="Value">
              <TextInput value={config.auth?.value || ''} onChange={v => set('auth', { ...config.auth, value: v })} placeholder="{{API_KEY}}" monospace />
            </Field>
          </div>
        )}
        {(authType === 'oauth2-client-credentials' || authType === 'oauth2-password') && (
          <div className="space-y-2">
            <Field label="Token URL">
              <TextInput value={config.auth?.tokenUrl || ''} onChange={v => set('auth', { ...config.auth, tokenUrl: v })} placeholder="https://auth.example.com/token" monospace />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Client ID">
                <TextInput value={config.auth?.clientId || ''} onChange={v => set('auth', { ...config.auth, clientId: v })} placeholder="{{OAUTH_CLIENT_ID}}" monospace />
              </Field>
              <Field label="Client Secret">
                <TextInput value={config.auth?.clientSecret || ''} onChange={v => set('auth', { ...config.auth, clientSecret: v })} placeholder="{{OAUTH_CLIENT_SECRET}}" monospace />
              </Field>
            </div>
            {authType === 'oauth2-password' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Username">
                  <TextInput value={config.auth?.username || ''} onChange={v => set('auth', { ...config.auth, username: v })} />
                </Field>
                <Field label="Password">
                  <TextInput value={config.auth?.password || ''} onChange={v => set('auth', { ...config.auth, password: v })} placeholder="{{PASSWORD}}" monospace />
                </Field>
              </div>
            )}
            <Field label="Scope (optional)">
              <TextInput value={config.auth?.scope || ''} onChange={v => set('auth', { ...config.auth, scope: v })} placeholder="read write" />
            </Field>
          </div>
        )}
      </div>

      <KVEditor
        label="Headers"
        value={config.headers || {}}
        onChange={v => set('headers', v)}
        keyPlaceholder="Header-Name"
        valuePlaceholder="value or {{SECRET_NAME}}"
      />

      <KVEditor
        label="Query Params"
        value={config.queryParams || {}}
        onChange={v => set('queryParams', v)}
        keyPlaceholder="param"
        valuePlaceholder="value"
      />

      <Field label="Content Type">
        <SelectInput
          value={config.contentType || 'application/json'}
          onChange={v => set('contentType', v)}
          options={[
            { value: 'application/json', label: 'application/json' },
            { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded' },
            { value: 'multipart/form-data', label: 'multipart/form-data' },
            { value: 'text/plain', label: 'text/plain' },
            { value: 'text/xml', label: 'text/xml' },
          ]}
        />
      </Field>

      {/* Body — always shown, most methods can send a body */}
      <Field label="Request Body" hint="Use {{stepId.fieldName}} to reference previous step outputs. Use {{SECRET_NAME}} for secrets.">
        <TextareaInput value={config.body || ''} onChange={v => set('body', v)} rows={4} monospace placeholder={'{\n  "key": "{{trigger.value}}"\n}'} />
      </Field>

      {/* Response */}
      <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Response Handling</p>
        <Field label="Response Content Type">
          <SelectInput
            value={config.responseType || 'json'}
            onChange={v => set('responseType', v)}
            options={[
              { value: 'json', label: 'JSON (auto-parsed)' },
              { value: 'text', label: 'Plain text' },
              { value: 'xml', label: 'XML' },
              { value: 'binary', label: 'Binary (base64)' },
            ]}
          />
        </Field>
        <Field label="Extract field (dot path, e.g. data.items)" hint="Leave blank to use full response">
          <TextInput value={config.extractPath || ''} onChange={v => set('extractPath', v)} placeholder="data.items" monospace />
        </Field>
        <Field label="Timeout (ms)">
          <TextInput value={String(config.timeout || 30000)} onChange={v => set('timeout', parseInt(v) || 30000)} placeholder="30000" monospace />
        </Field>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="failOnError"
            checked={config.failOnError !== false}
            onChange={e => set('failOnError', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="failOnError" className="text-sm">Fail workflow on non-2xx response</label>
        </div>
      </div>
    </div>
  );
}

// ── AI Processing ─────────────────────────────────────────────────────

function AiProcessingConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-4">
      <Field label="Model" hint="OpenRouter model ID">
        <SelectInput
          value={config.model || 'openai/gpt-4o-mini'}
          onChange={v => set('model', v)}
          options={[
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)' },
            { value: 'openai/gpt-4o', label: 'GPT-4o' },
            { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
            { value: 'anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku (fast)' },
            { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
            { value: 'google/gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro' },
            { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
            { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
          ]}
        />
      </Field>

      <Field label="System Prompt">
        <TextareaInput
          value={config.systemPrompt || ''}
          onChange={v => set('systemPrompt', v)}
          rows={5}
          placeholder="You are a helpful assistant. Analyze the following input and respond with JSON."
        />
      </Field>

      <Field label="User Prompt" hint="Use {{stepId.field}} to reference inputs. {{trigger}} = webhook payload.">
        <TextareaInput
          value={config.prompt || ''}
          onChange={v => set('prompt', v)}
          rows={5}
          placeholder="Classify this customer message: {{trigger.message}}"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max Tokens">
          <TextInput value={String(config.maxTokens || 1024)} onChange={v => set('maxTokens', parseInt(v) || 1024)} monospace />
        </Field>
        <Field label="Temperature (0–2)">
          <TextInput value={String(config.temperature ?? 0.7)} onChange={v => set('temperature', parseFloat(v) || 0.7)} monospace />
        </Field>
      </div>

      <Field label="Response Format">
        <SelectInput
          value={config.responseFormat || 'text'}
          onChange={v => set('responseFormat', v)}
          options={[
            { value: 'text', label: 'Plain text' },
            { value: 'json_object', label: 'JSON object (enforced)' },
          ]}
        />
      </Field>

      <Field label="Output Variable Name" hint="How to reference this step's output in later steps">
        <TextInput value={config.outputKey || ''} onChange={v => set('outputKey', v)} placeholder="ai_result" monospace />
      </Field>
    </div>
  );
}

// ── Data Transform ────────────────────────────────────────────────────

function DataTransformConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });
  const mappings: Array<{ from: string; to: string }> = config.mappings || [];

  const addMapping = () => onChange({ ...config, mappings: [...mappings, { from: '', to: '' }] });
  const removeMapping = (i: number) => onChange({ ...config, mappings: mappings.filter((_, idx) => idx !== i) });
  const updateMapping = (i: number, field: 'from' | 'to', val: string) => {
    const next = mappings.map((m, idx) => idx === i ? { ...m, [field]: val } : m);
    onChange({ ...config, mappings: next });
  };

  return (
    <div className="space-y-4">
      <Field label="Transform Mode">
        <SelectInput
          value={config.mode || 'map'}
          onChange={v => set('mode', v)}
          options={[
            { value: 'map', label: 'Field mapping (pick & rename fields)' },
            { value: 'jq', label: 'jq expression (full transformation)' },
            { value: 'template', label: 'Template (build new object)' },
          ]}
        />
      </Field>

      {config.mode === 'jq' && (
        <Field label="jq Expression" hint="e.g. .data.items[] | {id, name: .full_name}">
          <TextareaInput value={config.jq || ''} onChange={v => set('jq', v)} rows={4} monospace placeholder=".data | {id, name}" />
        </Field>
      )}

      {config.mode === 'template' && (
        <Field label="Output Template (JSON)" hint="Use {{stepId.field}} for interpolation">
          <TextareaInput
            value={config.template || ''}
            onChange={v => set('template', v)}
            rows={6}
            monospace
            placeholder={'{\n  "userId": "{{trigger.id}}",\n  "result": "{{classify.content}}"\n}'}
          />
        </Field>
      )}

      {(!config.mode || config.mode === 'map') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Field Mappings</label>
            <Button variant="ghost" size="sm" onClick={addMapping}><Plus className="h-3 w-3 mr-1" />Add</Button>
          </div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>From (source path) → To (output key)</div>
          {mappings.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={m.from} onChange={e => updateMapping(i, 'from', e.target.value)} placeholder="stepId.field" className="flex-1 px-2 py-1.5 border rounded text-xs font-mono" style={{ borderColor: 'var(--border)' }} />
              <span className="text-gray-400 text-xs">→</span>
              <input value={m.to} onChange={e => updateMapping(i, 'to', e.target.value)} placeholder="output_key" className="flex-1 px-2 py-1.5 border rounded text-xs font-mono" style={{ borderColor: 'var(--border)' }} />
              <button onClick={() => removeMapping(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          {mappings.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>No mappings yet. Click Add.</p>}
        </div>
      )}

      <Field label="Input Source" hint="Which step's output to transform (blank = all previous outputs)">
        <TextInput value={config.inputFrom || ''} onChange={v => set('inputFrom', v)} placeholder="stepId (e.g. classify)" monospace />
      </Field>
    </div>
  );
}

// ── Condition / Branch ────────────────────────────────────────────────

function ConditionConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-4">
      <Field label="Condition Expression" hint="JavaScript-style boolean: {{classify.urgent}} === true">
        <TextareaInput value={config.condition || ''} onChange={v => set('condition', v)} rows={3} monospace placeholder='{{classify.category}} === "billing"' />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="If True — go to step ID">
          <TextInput value={config.trueBranch || ''} onChange={v => set('trueBranch', v)} placeholder="step_id" monospace />
        </Field>
        <Field label="If False — go to step ID">
          <TextInput value={config.falseBranch || ''} onChange={v => set('falseBranch', v)} placeholder="step_id (or leave blank to end)" monospace />
        </Field>
      </div>
    </div>
  );
}

// ── Delay ─────────────────────────────────────────────────────────────

function DelayConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Duration">
          <TextInput value={String(config.duration || 5)} onChange={v => set('duration', parseInt(v) || 5)} monospace />
        </Field>
        <Field label="Unit">
          <SelectInput
            value={config.unit || 'seconds'}
            onChange={v => set('unit', v)}
            options={[
              { value: 'milliseconds', label: 'Milliseconds' },
              { value: 'seconds', label: 'Seconds' },
              { value: 'minutes', label: 'Minutes' },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Email Send ────────────────────────────────────────────────────────

function EmailSendConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-4">
      <Field label="SendGrid API Key Secret" hint="Use the secret key name you configured">
        <TextInput value={config.apiKeySecret || 'SENDGRID_API_KEY'} onChange={v => set('apiKeySecret', v)} monospace />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="From Email">
          <TextInput value={config.from || ''} onChange={v => set('from', v)} placeholder="noreply@example.com" />
        </Field>
        <Field label="From Name">
          <TextInput value={config.fromName || ''} onChange={v => set('fromName', v)} placeholder="My App" />
        </Field>
      </div>
      <Field label="To" hint="Use {{trigger.email}} for dynamic recipients">
        <TextInput value={config.to || ''} onChange={v => set('to', v)} placeholder="{{trigger.email}}" monospace />
      </Field>
      <Field label="Subject">
        <TextInput value={config.subject || ''} onChange={v => set('subject', v)} placeholder="Your inquiry has been received" />
      </Field>
      <Field label="Body (HTML supported)" hint="Use {{stepId.field}} for interpolation">
        <TextareaInput value={config.body || ''} onChange={v => set('body', v)} rows={6} placeholder="<p>Hello {{trigger.name}},</p><p>{{classify.summary}}</p>" />
      </Field>
      <Field label="Reply-To (optional)">
        <TextInput value={config.replyTo || ''} onChange={v => set('replyTo', v)} placeholder="support@example.com" />
      </Field>
    </div>
  );
}

// ── Twilio SMS ────────────────────────────────────────────────────────

function TwilioSmsConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Account SID Secret">
          <TextInput value={config.accountSidSecret || 'TWILIO_ACCOUNT_SID'} onChange={v => set('accountSidSecret', v)} monospace />
        </Field>
        <Field label="Auth Token Secret">
          <TextInput value={config.authTokenSecret || 'TWILIO_AUTH_TOKEN'} onChange={v => set('authTokenSecret', v)} monospace />
        </Field>
      </div>
      <Field label="From (Twilio number)">
        <TextInput value={config.from || ''} onChange={v => set('from', v)} placeholder="+15551234567" monospace />
      </Field>
      <Field label="To" hint="Use {{trigger.phone}} for dynamic recipients">
        <TextInput value={config.to || ''} onChange={v => set('to', v)} placeholder="{{trigger.phone}}" monospace />
      </Field>
      <Field label="Message Body" hint="Max 160 chars for single SMS">
        <TextareaInput value={config.body || ''} onChange={v => set('body', v)} rows={4} placeholder="Your inquiry ({{classify.category}}) has been received. We'll respond within 24h." />
      </Field>
      <Field label="Messaging Service SID (optional, overrides From)">
        <TextInput value={config.messagingServiceSid || ''} onChange={v => set('messagingServiceSid', v)} placeholder="MGxxxxxxxx" monospace />
      </Field>
    </div>
  );
}

// ── Fallback: raw JSON editor ─────────────────────────────────────────

function RawJsonConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(config, null, 2));
  const [parseError, setParseError] = useState(false);

  const handleChange = (val: string) => {
    setRaw(val);
    try {
      onChange(JSON.parse(val));
      setParseError(false);
    } catch {
      setParseError(true);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No dedicated form for this step type — edit config JSON directly.</p>
      <TextareaInput value={raw} onChange={handleChange} rows={12} monospace />
      {parseError && <p className="text-xs text-red-500">Invalid JSON</p>}
    </div>
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────

export function StepConfigPanel({ step, allSteps = [], onChange, tenantId, appId }: StepConfigPanelProps) {
  const config = step.config || {};
  const update = (newConfig: any) => onChange({ ...step, config: newConfig });

  const [stepName, setStepName] = useState(step.name);
  const [stepId, setStepId] = useState(step.id);
  const [tab, setTab] = useState<'config' | 'mapping'>('config');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Sync local meta state when the selected step changes (id-driven, not name)
  useEffect(() => {
    setStepName(step.name);
    setStepId(step.id);
    setTestResult(null);
    setTab('config');
  }, [step.id, step.name]);

  const commitMeta = () => onChange({ ...step, name: stepName, id: stepId });
  const mappableFields = MAPPABLE_FIELDS[step.stepId] ?? [];
  const hasMappableFields = mappableFields.length > 0;

  const testStep = async () => {
    if (!tenantId || !appId) return;
    
    setIsTesting(true);
    try {
      const result = await api.testStep(tenantId, appId, step);
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step identity */}
      <div className="grid grid-cols-2 gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Field label="Step Name">
          <TextInput value={stepName} onChange={setStepName} placeholder="My Step" />
        </Field>
        <Field label="Step ID" hint="Reference outputs as {{step_id.field}}">
          <TextInput value={stepId} onChange={setStepId} monospace placeholder="my_step" />
        </Field>
        {(stepName !== step.name || stepId !== step.id) && (
          <div className="col-span-2">
            <Button size="sm" variant="outline" onClick={commitMeta}>Apply</Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      {hasMappableFields && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setTab('config')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === 'config' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings2 className="h-3 w-3" /> Configure
          </button>
          <button
            onClick={() => setTab('mapping')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === 'mapping' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap className="h-3 w-3" /> Map Data
          </button>
        </div>
      )}

      {/* Tab content */}
      {tab === 'config' && (
        <div className="space-y-4">
          {step.stepId === 'step:http-request' && <HttpRequestConfig config={config} onChange={update} />}
          {step.stepId === 'step:ai-processing' && <AiProcessingConfig config={config} onChange={update} />}
          {step.stepId === 'step:data-transform' && <DataTransformConfig config={config} onChange={update} />}
          {step.stepId === 'step:condition' && <ConditionConfig config={config} onChange={update} />}
          {step.stepId === 'step:delay' && <DelayConfig config={config} onChange={update} />}
          {step.stepId === 'step:email-send' && <EmailSendConfig config={config} onChange={update} />}
          {step.stepId === 'step:twilio-sms' && <TwilioSmsConfig config={config} onChange={update} />}
          {!['step:http-request','step:ai-processing','step:data-transform','step:condition','step:delay','step:email-send','step:twilio-sms'].includes(step.stepId) && (
            <RawJsonConfig config={config} onChange={update} />
          )}
          
          {/* Test button after config form */}
          {tenantId && appId && (
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testStep}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Testing...
                  </>
                ) : (
                   <>
                     <Play className="h-3 w-3 mr-1" />
                     Test Step
                   </>
                )}
              </Button>
            </div>
          )}
          
          {/* Test result display */}
          {testResult && (
            <div className="pt-2">
              <div className="text-xs font-medium text-gray-700 mb-1">Test Result:</div>
              <pre className="text-xs bg-gray-50 p-2 rounded border max-h-48 overflow-auto" style={{ borderColor: 'var(--border)' }}>
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {tab === 'mapping' && hasMappableFields && (
        <DataMappingPanel
          currentStep={step}
          allSteps={allSteps}
          mappableFields={mappableFields}
          onChange={(updates) => update({ ...config, ...updates })}
        />
      )}
    </div>
  );
}
