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
  // Google Calendar
  'step:google-calendar-create-event': [
    { key: 'summary', label: 'Title', placeholder: 'Meeting: {{trigger.subject}}' },
    { key: 'start', label: 'Start (ISO)', placeholder: '{{trigger.startTime}}' },
    { key: 'end', label: 'End (ISO)', placeholder: '{{trigger.endTime}}' },
    { key: 'attendees', label: 'Attendees (comma-sep)', placeholder: '{{trigger.email}}' },
  ],
  'step:google-calendar-list-events': [
    { key: 'timeMin', label: 'From (ISO)', placeholder: '{{trigger.startTime}}' },
    { key: 'timeMax', label: 'To (ISO)', placeholder: '{{trigger.endTime}}' },
  ],
  // Gmail
  'step:google-gmail-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: 'Re: {{trigger.subject}}' },
    { key: 'body', label: 'Body (HTML)', placeholder: '<p>Hello {{trigger.name}}</p>' },
  ],
  'step:google-gmail-search': [
    { key: 'query', label: 'Search Query', placeholder: 'from:{{trigger.email}} is:unread' },
  ],
  // Google Chat
  'step:google-chat-send-message': [
    { key: 'text', label: 'Message Text', placeholder: '{{trigger.summary}} — {{classify.result}}' },
  ],
  'step:google-chat-send-card': [
    { key: 'title', label: 'Card Title', placeholder: '{{trigger.subject}}' },
    { key: 'subtitle', label: 'Subtitle', placeholder: '{{trigger.name}}' },
  ],
  // Google Drive
  'step:google-drive-upload': [
    { key: 'fileName', label: 'File Name', placeholder: '{{trigger.filename}}' },
    { key: 'content', label: 'File Content', placeholder: '{{transform.result}}' },
  ],
  // QuickBooks
  'step:quickbooks-create-invoice': [
    { key: 'customerId', label: 'Customer ID', placeholder: '{{trigger.customerId}}' },
  ],
  'step:quickbooks-send-invoice': [
    { key: 'invoiceId', label: 'Invoice ID', placeholder: '{{createInvoice.invoiceId}}' },
    { key: 'emailAddress', label: 'Override Email', placeholder: '{{trigger.email}}' },
  ],
  'step:quickbooks-create-customer': [
    { key: 'displayName', label: 'Display Name', placeholder: '{{trigger.name}}' },
    { key: 'email', label: 'Email', placeholder: '{{trigger.email}}' },
  ],
  // Twilio
  'step:twilio-send-whatsapp': [
    { key: 'to', label: 'To (whatsapp:+1...)', placeholder: '{{trigger.phone}}' },
    { key: 'body', label: 'Message', placeholder: 'Hi {{trigger.name}}' },
  ],
  'step:twilio-voice-call': [
    { key: 'to', label: 'To Number', placeholder: '{{trigger.phone}}' },
  ],
  // Email providers
  'step:resend-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: 'Re: {{trigger.subject}}' },
    { key: 'html', label: 'HTML Body', placeholder: '<p>Hello {{trigger.name}}</p>' },
  ],
  'step:sendgrid-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: '{{trigger.subject}}' },
    { key: 'html', label: 'HTML Body', placeholder: '<p>{{trigger.body}}</p>' },
  ],
  'step:sendgrid-send-template': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'templateId', label: 'Template ID', placeholder: 'd-...' },
  ],
  'step:mailgun-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: '{{trigger.subject}}' },
    { key: 'html', label: 'HTML Body', placeholder: '<p>{{trigger.body}}</p>' },
  ],
  'step:postmark-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: '{{trigger.subject}}' },
    { key: 'htmlBody', label: 'HTML Body', placeholder: '<p>Hello {{trigger.name}}</p>' },
  ],
  'step:postmark-send-template': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'templateId', label: 'Template ID or Alias' },
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

// ── Generic Integration Config ───────────────────────────────────────
//
// Schema-driven form for all new integration step types.
// Each entry defines the fields shown; falls back to RawJsonConfig if not listed.

type FieldDef = { key: string; label: string; placeholder?: string; type?: 'text' | 'textarea' | 'select'; options?: { value: string; label: string }[]; hint?: string };

const INTEGRATION_FIELD_SPECS: Record<string, FieldDef[]> = {
  // ── Google Calendar ──────────────────────────────────────────────────
  'step:google-calendar-create-event': [
    { key: 'summary', label: 'Title', placeholder: 'Team standup' },
    { key: 'start', label: 'Start (ISO 8601)', placeholder: '2024-01-15T09:00:00Z' },
    { key: 'end', label: 'End (ISO 8601)', placeholder: '2024-01-15T09:30:00Z' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Agenda...' },
    { key: 'location', label: 'Location', placeholder: 'Zoom / Room 3A' },
    { key: 'attendees', label: 'Attendees (comma-separated emails)', placeholder: 'alice@example.com, bob@example.com' },
    { key: 'calendarId', label: 'Calendar ID', placeholder: 'primary' },
  ],
  'step:google-calendar-list-events': [
    { key: 'timeMin', label: 'From (ISO 8601)', placeholder: '2024-01-15T00:00:00Z' },
    { key: 'timeMax', label: 'To (ISO 8601)', placeholder: '2024-01-22T00:00:00Z' },
    { key: 'query', label: 'Search Query', placeholder: 'standup' },
    { key: 'maxResults', label: 'Max Results', placeholder: '25' },
    { key: 'calendarId', label: 'Calendar ID', placeholder: 'primary' },
  ],
  'step:google-calendar-update-event': [
    { key: 'eventId', label: 'Event ID', placeholder: 'abc123xyz' },
    { key: 'summary', label: 'New Title', placeholder: 'Updated title' },
    { key: 'start', label: 'New Start (ISO)', placeholder: '2024-01-15T10:00:00Z' },
    { key: 'end', label: 'New End (ISO)', placeholder: '2024-01-15T10:30:00Z' },
    { key: 'calendarId', label: 'Calendar ID', placeholder: 'primary' },
  ],
  'step:google-calendar-delete-event': [
    { key: 'eventId', label: 'Event ID', placeholder: 'abc123xyz' },
    { key: 'calendarId', label: 'Calendar ID', placeholder: 'primary' },
  ],
  'step:google-calendar-find-free-slots': [
    { key: 'timeMin', label: 'From (ISO 8601)', placeholder: '2024-01-15T08:00:00Z' },
    { key: 'timeMax', label: 'To (ISO 8601)', placeholder: '2024-01-15T18:00:00Z' },
    { key: 'durationMinutes', label: 'Slot Duration (minutes)', placeholder: '30' },
    { key: 'calendars', label: 'Calendar IDs (comma-sep)', placeholder: 'primary, team@example.com' },
  ],
  // ── Gmail ────────────────────────────────────────────────────────────
  'step:google-gmail-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: 'Re: your inquiry' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: '<p>Hello {{trigger.name}}</p>' },
    { key: 'from', label: 'From (override)', placeholder: 'me' },
    { key: 'replyTo', label: 'Reply-To', placeholder: 'support@example.com' },
  ],
  'step:google-gmail-search': [
    { key: 'query', label: 'Gmail Query', placeholder: 'from:customer@example.com subject:invoice is:unread' },
    { key: 'maxResults', label: 'Max Results', placeholder: '10' },
  ],
  'step:google-gmail-read': [
    { key: 'messageId', label: 'Message ID', placeholder: '{{search.messages[0].id}}' },
    { key: 'format', label: 'Format', type: 'select', options: [{ value: 'full', label: 'Full' }, { value: 'minimal', label: 'Minimal' }, { value: 'raw', label: 'Raw' }] },
  ],
  'step:google-gmail-create-draft': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'subject', label: 'Subject', placeholder: 'Draft: ...' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: '<p>Draft content</p>' },
  ],
  'step:google-gmail-archive': [
    { key: 'messageId', label: 'Message ID', placeholder: '{{search.messages[0].id}}' },
  ],
  // ── Google Chat ──────────────────────────────────────────────────────
  'step:google-chat-send-message': [
    { key: 'text', label: 'Message Text', type: 'textarea', placeholder: 'Hello team! {{trigger.summary}}' },
    { key: 'spaceName', label: 'Space Name', placeholder: 'spaces/ABCDEF (omit for webhook)', hint: 'Leave blank to use GOOGLE_CHAT_WEBHOOK_URL secret' },
    { key: 'threadKey', label: 'Thread Key (optional)', placeholder: 'ticket-{{trigger.id}}' },
  ],
  'step:google-chat-send-card': [
    { key: 'title', label: 'Card Title', placeholder: 'Alert: {{trigger.name}}' },
    { key: 'subtitle', label: 'Subtitle', placeholder: '{{trigger.summary}}' },
    { key: 'spaceName', label: 'Space Name', placeholder: 'spaces/ABCDEF' },
  ],
  'step:google-chat-list-messages': [
    { key: 'spaceName', label: 'Space Name', placeholder: 'spaces/ABCDEF' },
    { key: 'pageSize', label: 'Page Size', placeholder: '25' },
    { key: 'filter', label: 'Filter (optional)', placeholder: 'createTime > "2024-01-01T00:00:00Z"' },
  ],
  // ── Google Drive ─────────────────────────────────────────────────────
  'step:google-drive-upload': [
    { key: 'fileName', label: 'File Name', placeholder: 'report-{{trigger.date}}.pdf' },
    { key: 'content', label: 'File Content (text or base64)', type: 'textarea', placeholder: '{{transform.output}}' },
    { key: 'mimeType', label: 'MIME Type', placeholder: 'text/plain', hint: 'e.g. application/pdf, text/csv' },
    { key: 'folderId', label: 'Parent Folder ID (optional)', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' },
  ],
  'step:google-drive-download': [
    { key: 'fileId', label: 'File ID', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' },
    { key: 'exportMimeType', label: 'Export As (Google Docs only)', placeholder: 'application/pdf', hint: 'Only needed for Google Docs/Sheets/Slides' },
  ],
  'step:google-drive-list-files': [
    { key: 'folderId', label: 'Folder ID (optional)', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' },
    { key: 'query', label: 'Query Filter', placeholder: "name contains 'report'" },
    { key: 'pageSize', label: 'Max Results', placeholder: '25' },
  ],
  'step:google-drive-share': [
    { key: 'fileId', label: 'File ID', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' },
    { key: 'emailAddress', label: 'Share With (email)', placeholder: '{{trigger.email}}' },
    { key: 'role', label: 'Permission', type: 'select', options: [{ value: 'reader', label: 'Reader' }, { value: 'commenter', label: 'Commenter' }, { value: 'writer', label: 'Writer' }] },
    { key: 'type', label: 'Grant To', type: 'select', options: [{ value: 'user', label: 'Specific User' }, { value: 'anyone', label: 'Anyone with Link' }] },
  ],
  'step:google-drive-create-folder': [
    { key: 'name', label: 'Folder Name', placeholder: 'Client — {{trigger.name}}' },
    { key: 'parentFolderId', label: 'Parent Folder ID (optional)', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' },
  ],
  // ── QuickBooks ───────────────────────────────────────────────────────
  'step:quickbooks-create-invoice': [
    { key: 'customerId', label: 'Customer ID', placeholder: '{{trigger.customerId}}' },
    { key: 'dueDate', label: 'Due Date (YYYY-MM-DD)', placeholder: '2024-02-15' },
    { key: 'memo', label: 'Memo (optional)', placeholder: 'Thank you for your business' },
  ],
  'step:quickbooks-list-invoices': [
    { key: 'status', label: 'Status Filter', type: 'select', options: [{ value: '', label: 'Any' }, { value: 'draft', label: 'Draft' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }] },
    { key: 'customerId', label: 'Customer ID (optional)', placeholder: '{{trigger.customerId}}' },
    { key: 'startDate', label: 'Start Date', placeholder: '2024-01-01' },
    { key: 'endDate', label: 'End Date', placeholder: '2024-12-31' },
    { key: 'maxResults', label: 'Max Results', placeholder: '25' },
  ],
  'step:quickbooks-send-invoice': [
    { key: 'invoiceId', label: 'Invoice ID', placeholder: '{{createInvoice.invoiceId}}' },
    { key: 'emailAddress', label: 'Override Email (optional)', placeholder: '{{trigger.email}}' },
  ],
  'step:quickbooks-create-customer': [
    { key: 'displayName', label: 'Display Name', placeholder: '{{trigger.name}}' },
    { key: 'email', label: 'Email', placeholder: '{{trigger.email}}' },
    { key: 'phone', label: 'Phone', placeholder: '{{trigger.phone}}' },
    { key: 'companyName', label: 'Company', placeholder: '{{trigger.company}}' },
  ],
  'step:quickbooks-get-customer': [
    { key: 'customerId', label: 'Customer ID (or use display name)', placeholder: '{{trigger.customerId}}' },
    { key: 'displayName', label: 'Display Name (alternative lookup)', placeholder: 'Acme Corp' },
  ],
  'step:quickbooks-record-payment': [
    { key: 'customerId', label: 'Customer ID', placeholder: '{{trigger.customerId}}' },
    { key: 'amount', label: 'Amount', placeholder: '{{trigger.amount}}' },
    { key: 'paymentDate', label: 'Payment Date (YYYY-MM-DD)', placeholder: '2024-01-15' },
    { key: 'paymentMethod', label: 'Method', type: 'select', options: [{ value: 'cash', label: 'Cash' }, { value: 'check', label: 'Check' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'ach', label: 'ACH' }, { value: 'other', label: 'Other' }] },
    { key: 'invoiceId', label: 'Apply to Invoice ID (optional)', placeholder: '{{createInvoice.invoiceId}}' },
  ],
  // ── Twilio ───────────────────────────────────────────────────────────
  'step:twilio-send-whatsapp': [
    { key: 'to', label: 'To (whatsapp:+E.164)', placeholder: 'whatsapp:+15005550006' },
    { key: 'body', label: 'Message Body', type: 'textarea', placeholder: 'Hi {{trigger.name}}, your appointment is confirmed.' },
    { key: 'mediaUrl', label: 'Media URL (optional)', placeholder: 'https://example.com/image.png' },
  ],
  'step:twilio-voice-call': [
    { key: 'to', label: 'To (E.164)', placeholder: '+15005550006' },
    { key: 'from', label: 'From (override)', placeholder: '+15005550001' },
    { key: 'twiml', label: 'TwiML', type: 'textarea', placeholder: '<Response><Say>Hello, this is an automated call.</Say></Response>' },
    { key: 'url', label: 'TwiML URL (alternative)', placeholder: 'https://example.com/twiml', hint: 'Provide either TwiML or URL, not both' },
  ],
  'step:twilio-lookup': [
    { key: 'phoneNumber', label: 'Phone Number (E.164)', placeholder: '+15005550006' },
  ],
  'step:twilio-message-status': [
    { key: 'messageSid', label: 'Message SID', placeholder: 'SM...' },
  ],
  // ── Resend ───────────────────────────────────────────────────────────
  'step:resend-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'from', label: 'From (override)', placeholder: 'noreply@example.com', hint: 'Uses RESEND_FROM_ADDRESS secret by default' },
    { key: 'subject', label: 'Subject', placeholder: 'Your order is confirmed' },
    { key: 'html', label: 'HTML Body', type: 'textarea', placeholder: '<p>Hello {{trigger.name}}</p>' },
    { key: 'text', label: 'Plain Text Body (fallback)', type: 'textarea', placeholder: 'Hello {{trigger.name}}' },
    { key: 'replyTo', label: 'Reply-To', placeholder: 'support@example.com' },
    { key: 'scheduledAt', label: 'Schedule At (ISO)', placeholder: '2024-01-20T10:00:00Z', hint: 'Leave blank to send immediately' },
  ],
  'step:resend-get-status': [
    { key: 'emailId', label: 'Email ID', placeholder: '{{sendEmail.id}}' },
  ],
  'step:resend-cancel': [
    { key: 'emailId', label: 'Email ID', placeholder: '{{sendEmail.id}}' },
  ],
  // ── SendGrid ─────────────────────────────────────────────────────────
  'step:sendgrid-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'from', label: 'From (override)', placeholder: 'noreply@example.com' },
    { key: 'subject', label: 'Subject', placeholder: 'Your order is confirmed' },
    { key: 'html', label: 'HTML Body', type: 'textarea', placeholder: '<p>Hello {{trigger.name}}</p>' },
    { key: 'text', label: 'Plain Text Fallback', type: 'textarea', placeholder: 'Hello {{trigger.name}}' },
  ],
  'step:sendgrid-send-template': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'from', label: 'From (override)', placeholder: 'noreply@example.com' },
    { key: 'templateId', label: 'Dynamic Template ID', placeholder: 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { key: 'dynamicTemplateData', label: 'Template Data (JSON)', type: 'textarea', placeholder: '{"name": "{{trigger.name}}", "orderId": "{{trigger.id}}"}' },
  ],
  'step:sendgrid-add-contact': [
    { key: 'email', label: 'Email', placeholder: '{{trigger.email}}' },
    { key: 'firstName', label: 'First Name', placeholder: '{{trigger.firstName}}' },
    { key: 'lastName', label: 'Last Name', placeholder: '{{trigger.lastName}}' },
    { key: 'listIds', label: 'List IDs (comma-sep)', placeholder: 'listid1, listid2' },
  ],
  // ── Mailgun ──────────────────────────────────────────────────────────
  'step:mailgun-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'from', label: 'From (override)', placeholder: 'noreply@mg.example.com' },
    { key: 'subject', label: 'Subject', placeholder: 'Your account update' },
    { key: 'html', label: 'HTML Body', type: 'textarea', placeholder: '<p>Hello {{trigger.name}}</p>' },
    { key: 'text', label: 'Plain Text Fallback', type: 'textarea', placeholder: 'Hello {{trigger.name}}' },
    { key: 'tags', label: 'Tags (comma-sep)', placeholder: 'transactional, billing' },
  ],
  'step:mailgun-validate-email': [
    { key: 'address', label: 'Email Address', placeholder: '{{trigger.email}}' },
  ],
  'step:mailgun-get-status': [
    { key: 'messageId', label: 'Message ID', placeholder: '{{sendEmail.id}}' },
  ],
  // ── Postmark ─────────────────────────────────────────────────────────
  'step:postmark-send': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'from', label: 'From (override)', placeholder: 'noreply@example.com' },
    { key: 'subject', label: 'Subject', placeholder: 'Your receipt' },
    { key: 'htmlBody', label: 'HTML Body', type: 'textarea', placeholder: '<p>Hello {{trigger.name}}</p>' },
    { key: 'textBody', label: 'Text Body', type: 'textarea', placeholder: 'Hello {{trigger.name}}' },
    { key: 'replyTo', label: 'Reply-To', placeholder: 'support@example.com' },
    { key: 'tag', label: 'Tag', placeholder: 'welcome-email' },
  ],
  'step:postmark-send-template': [
    { key: 'to', label: 'To', placeholder: '{{trigger.email}}' },
    { key: 'from', label: 'From (override)', placeholder: 'noreply@example.com' },
    { key: 'templateId', label: 'Template ID or Alias', placeholder: 'welcome-email' },
    { key: 'templateModel', label: 'Template Model (JSON)', type: 'textarea', placeholder: '{"name": "{{trigger.name}}", "product_url": "{{trigger.url}}"}' },
  ],
  'step:postmark-get-details': [
    { key: 'messageId', label: 'Message ID', placeholder: '{{sendEmail.messageId}}' },
  ],
};

function GenericIntegrationConfig({ stepId, config, onChange }: { stepId: string; config: any; onChange: (c: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });
  const fields = INTEGRATION_FIELD_SPECS[stepId];
  if (!fields) return <RawJsonConfig config={config} onChange={onChange} />;

  return (
    <div className="space-y-4">
      {fields.map(f => (
        <Field key={f.key} label={f.label} hint={f.hint}>
          {f.type === 'textarea' ? (
            <TextareaInput
              value={typeof config[f.key] === 'object' ? JSON.stringify(config[f.key], null, 2) : (config[f.key] || '')}
              onChange={v => {
                try { set(f.key, JSON.parse(v)); } catch { set(f.key, v); }
              }}
              rows={4}
              monospace
              placeholder={f.placeholder}
            />
          ) : f.type === 'select' && f.options ? (
            <SelectInput value={config[f.key] || ''} onChange={v => set(f.key, v)} options={[{ value: '', label: '— select —' }, ...f.options]} />
          ) : (
            <TextInput value={config[f.key] || ''} onChange={v => set(f.key, v)} placeholder={f.placeholder} monospace={!!(f.placeholder?.startsWith('{{'))} />
          )}
        </Field>
      ))}
    </div>
  );
}

// ── Raw JSON fallback ─────────────────────────────────────────────────

function RawJsonConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(config, null, 2));
  const [err, setErr] = useState('');

  const apply = () => {
    try {
      onChange(JSON.parse(raw));
      setErr('');
    } catch {
      setErr('Invalid JSON');
    }
  };

  return (
    <div className="space-y-2">
      <TextareaInput value={raw} onChange={v => { setRaw(v); setErr(''); }} rows={10} monospace />
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button
        onClick={apply}
        className="px-3 py-1.5 text-xs rounded border bg-gray-50 hover:bg-gray-100 font-medium"
        style={{ borderColor: 'var(--border)' }}
      >
        Apply JSON
      </button>
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
            <GenericIntegrationConfig stepId={step.stepId} config={config} onChange={update} />
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
