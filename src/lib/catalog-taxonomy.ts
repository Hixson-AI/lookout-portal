/**
 * Shared taxonomy for grouping catalog actions by capability and provider.
 * Used by ActionCatalogDialog, PlatformAdmin, and the AppBuilder mini panel.
 */

import type { AgentAction } from './api/actions';

// ── Selection state ────────────────────────────────────────────────────────────

export type GroupSelection =
  | { mode: 'all' }
  | { mode: 'cap-group'; group: string }
  | { mode: 'cap-sub'; group: string; sub: string }
  | { mode: 'provider'; provider: string };

// ── Capability taxonomy ────────────────────────────────────────────────────────

export interface CapabilityGroup {
  label: string;
  icon: string;
  tags: string[];
}

export const CAPABILITY_TAXONOMY: CapabilityGroup[] = [
  {
    label: 'Communication',
    icon: '💬',
    tags: ['email', 'sms', 'voice', 'messaging', 'whatsapp', 'chat', 'notification', 'push', 'fax'],
  },
  {
    label: 'Data & Storage',
    icon: '🗄️',
    tags: ['database', 'file-storage', 'spreadsheet', 'cloud-storage', 'document', 'storage', 'files'],
  },
  {
    label: 'CRM & Marketing',
    icon: '📊',
    tags: ['crm', 'email-marketing', 'marketing', 'analytics', 'ads', 'contacts', 'leads', 'social-media'],
  },
  {
    label: 'Finance',
    icon: '💳',
    tags: ['payment', 'invoicing', 'ecommerce', 'accounting', 'billing', 'subscription', 'commerce'],
  },
  {
    label: 'AI & ML',
    icon: '🤖',
    tags: ['ai', 'nlp', 'image', 'transcription', 'translation', 'llm', 'ocr', 'vision'],
  },
  {
    label: 'Automation',
    icon: '⚡',
    tags: ['webhook', 'trigger', 'schedule', 'queue', 'workflow', 'automation', 'cron'],
  },
  {
    label: 'Productivity',
    icon: '📅',
    tags: ['calendar', 'tasks', 'project-management', 'notes', 'forms', 'meetings', 'documents'],
  },
  {
    label: 'Developer',
    icon: '🔧',
    tags: ['git', 'ci-cd', 'monitoring', 'logging', 'api', 'security', 'auth', 'identity', 'testing'],
  },
];

// ── Known provider slugs ───────────────────────────────────────────────────────

export const KNOWN_PROVIDERS: string[] = [
  'twilio', 'google', 'aws', 'slack', 'stripe', 'github', 'gitlab',
  'hubspot', 'salesforce', 'shopify', 'zendesk', 'notion', 'airtable',
  'sendgrid', 'mailchimp', 'mailgun', 'resend', 'postmark',
  'jira', 'asana', 'trello', 'linear', 'monday',
  'dropbox', 'box', 'onedrive', 'sharepoint',
  'quickbooks', 'xero', 'paypal',
  'openai', 'anthropic', 'mistral', 'cohere',
  'postgres', 'mongodb', 'redis', 'mysql', 'supabase', 'elasticsearch',
  'discord', 'telegram', 'teams', 'zoom', 'calendly',
  'bitbucket', 'jenkins', 'circleci',
  'datadog', 'grafana', 'splunk', 'newrelic',
];

const PROVIDER_SET = new Set(KNOWN_PROVIDERS);

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getActionTags(action: AgentAction): string[] {
  return action.tags ?? [];
}

export function filterBySelection(actions: AgentAction[], sel: GroupSelection): AgentAction[] {
  switch (sel.mode) {
    case 'all':
      return actions;
    case 'cap-group': {
      const group = CAPABILITY_TAXONOMY.find(g => g.label === sel.group);
      return group ? actions.filter(a => group.tags.some(t => getActionTags(a).includes(t))) : actions;
    }
    case 'cap-sub':
      return actions.filter(a => getActionTags(a).includes(sel.sub));
    case 'provider':
      return actions.filter(a => getActionTags(a).includes(sel.provider));
  }
}

// ── Count derivation ───────────────────────────────────────────────────────────

export interface CapGroupCount {
  group: CapabilityGroup;
  count: number;
  subCounts: Array<{ tag: string; count: number }>;
}

export function getCapabilityGroupCounts(actions: AgentAction[]): CapGroupCount[] {
  return CAPABILITY_TAXONOMY.map(group => {
    const matching = actions.filter(a => group.tags.some(t => getActionTags(a).includes(t)));
    const subCounts = group.tags
      .map(tag => ({ tag, count: actions.filter(a => getActionTags(a).includes(tag)).length }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);
    return { group, count: matching.length, subCounts };
  }).filter(g => g.count > 0);
}

export interface ProviderCount {
  provider: string;
  count: number;
}

export function getProviderCounts(actions: AgentAction[]): ProviderCount[] {
  const counts: Record<string, number> = {};
  for (const action of actions) {
    for (const tag of getActionTags(action)) {
      if (PROVIDER_SET.has(tag)) counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupActionsByProvider(
  actions: AgentAction[],
): Array<{ provider: string; actions: AgentAction[] }> {
  const map: Record<string, AgentAction[]> = {};
  for (const action of actions) {
    const primary = getActionTags(action).find(t => PROVIDER_SET.has(t));
    const key = primary ?? 'other';
    (map[key] ??= []).push(action);
  }
  return Object.entries(map)
    .map(([provider, acts]) => ({ provider, actions: acts }))
    .sort((a, b) => {
      if (a.provider === 'other') return 1;
      if (b.provider === 'other') return -1;
      return b.actions.length - a.actions.length;
    });
}
