/**
 * Shared taxonomy for grouping catalog actions by capability and provider.
 * Used by ActionCatalogDialog, PlatformAdmin, and the AppBuilder mini panel.
 */

import {
  MessageSquare,
  Database,
  Megaphone,
  CreditCard,
  Bot,
  Zap,
  CalendarDays,
  Wrench,
  Globe,
  Cloud,
  ShoppingCart,
  Sparkles,
  Hash,
  Send,
  Mail,
  Phone,
  Video,
  FolderOpen,
  HardDrive,
  FileText,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Activity,
  AlertCircle,
  Lock,
  Shield,
  Layers,
  Server,
  GitBranch,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type { AgentAction } from './api/actions';

// ── Selection state ────────────────────────────────────────────────────────────

export type GroupSelection =
  | { mode: 'all' }
  | { mode: 'cap-group'; group: string }
  | { mode: 'cap-sub'; group: string; sub: string }
  | { mode: 'provider'; provider: string };

// ── Capability taxonomy ────────────────────────────────────────────────────────
//
// Bucket priority order matters: each action is counted in the FIRST matching
// bucket (top-down) so generic tags like "api" / "webhook" don't drown out
// specific buckets like AI or Finance.
//
// Generic catch-alls (api, webhook, auth, trigger) are intentionally NOT used
// as bucket tags — they pollute counts. They live in the catalog as searchable
// tags but don't drive the sidebar.

export interface CapabilityGroup {
  label: string;
  Icon: LucideIcon;
  tags: string[];
}

export const CAPABILITY_TAXONOMY: CapabilityGroup[] = [
  {
    label: 'AI & ML',
    Icon: Bot,
    tags: ['ai', 'llm', 'nlp', 'image', 'transcription', 'translation', 'ocr', 'vision', 'embedding', 'speech'],
  },
  {
    label: 'Communication',
    Icon: MessageSquare,
    tags: ['email', 'sms', 'voice', 'messaging', 'whatsapp', 'chat', 'notification', 'push', 'fax'],
  },
  {
    label: 'Finance',
    Icon: CreditCard,
    tags: ['payment', 'invoicing', 'ecommerce', 'accounting', 'billing', 'subscription', 'commerce', 'payroll'],
  },
  {
    label: 'CRM & Marketing',
    Icon: Megaphone,
    tags: ['crm', 'email-marketing', 'marketing', 'analytics', 'ads', 'contacts', 'leads', 'social-media'],
  },
  {
    label: 'Productivity',
    Icon: CalendarDays,
    tags: ['calendar', 'tasks', 'project-management', 'notes', 'forms', 'meetings', 'documents'],
  },
  {
    label: 'Data & Storage',
    Icon: Database,
    tags: ['database', 'file-storage', 'spreadsheet', 'cloud-storage', 'document', 'storage', 'files', 'data-warehouse'],
  },
  {
    label: 'Developer',
    Icon: Wrench,
    tags: ['git', 'ci-cd', 'monitoring', 'logging', 'observability', 'security', 'identity', 'testing', 'devops'],
  },
  {
    label: 'Automation',
    Icon: Zap,
    tags: ['schedule', 'queue', 'workflow', 'automation', 'cron'],
  },
];

// ── Known provider slugs ───────────────────────────────────────────────────────

export const PROVIDER_ICONS: Record<string, LucideIcon> = {
  // Cloud / infra
  google: Globe,
  aws: Cloud,
  azure: Cloud,
  gcp: Cloud,
  cloudflare: Cloud,
  // Comms
  twilio: Phone,
  slack: Hash,
  discord: MessageSquare,
  telegram: Send,
  teams: Video,
  zoom: Video,
  whatsapp: MessageSquare,
  // Email
  sendgrid: Mail,
  mailchimp: Mail,
  mailgun: Mail,
  resend: Mail,
  postmark: Mail,
  // Storage / files
  dropbox: FolderOpen,
  box: Package,
  onedrive: HardDrive,
  sharepoint: HardDrive,
  // CRM / business
  hubspot: Megaphone,
  salesforce: Megaphone,
  zendesk: ClipboardList,
  intercom: MessageSquare,
  // Productivity
  notion: FileText,
  airtable: Database,
  calendly: CalendarDays,
  jira: CheckSquare,
  asana: CheckSquare,
  trello: CheckSquare,
  linear: CheckSquare,
  monday: CheckSquare,
  // Commerce / finance
  shopify: ShoppingCart,
  stripe: CreditCard,
  paypal: CreditCard,
  quickbooks: CreditCard,
  xero: CreditCard,
  // AI
  openai: Sparkles,
  anthropic: Sparkles,
  mistral: Sparkles,
  cohere: Sparkles,
  // Databases
  postgres: Database,
  mysql: Database,
  mongodb: Database,
  redis: Database,
  supabase: Database,
  elasticsearch: Database,
  // Dev tools
  github: GitBranch,
  gitlab: GitBranch,
  bitbucket: GitBranch,
  jenkins: Server,
  circleci: Server,
  // Observability
  datadog: Activity,
  grafana: BarChart3,
  splunk: Activity,
  newrelic: Activity,
  sentry: AlertCircle,
  // Security
  okta: Lock,
  auth0: Shield,
  '1password': Lock,
};

export const KNOWN_PROVIDERS: string[] = Object.keys(PROVIDER_ICONS);

export function getProviderIcon(provider: string): LucideIcon {
  return PROVIDER_ICONS[provider] ?? Layers;
}

const PROVIDER_SET = new Set(KNOWN_PROVIDERS);

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getActionTags(action: AgentAction): string[] {
  return action.tags ?? [];
}

/**
 * Returns the highest-priority capability group whose tag list intersects
 * the action's tags. Used so each action is counted in exactly one bucket,
 * preventing generic capabilities from dominating counts.
 */
export function getPrimaryGroup(action: AgentAction): CapabilityGroup | null {
  const tags = getActionTags(action);
  for (const group of CAPABILITY_TAXONOMY) {
    if (group.tags.some(t => tags.includes(t))) return group;
  }
  return null;
}

export function filterBySelection(actions: AgentAction[], sel: GroupSelection): AgentAction[] {
  switch (sel.mode) {
    case 'all':
      return actions;
    case 'cap-group':
      return actions.filter(a => getPrimaryGroup(a)?.label === sel.group);
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
  // Bucket each action into its single primary group (priority order)
  const buckets = new Map<string, AgentAction[]>();
  for (const a of actions) {
    const g = getPrimaryGroup(a);
    if (!g) continue;
    const arr = buckets.get(g.label) ?? [];
    arr.push(a);
    buckets.set(g.label, arr);
  }

  return CAPABILITY_TAXONOMY.map(group => {
    const matching = buckets.get(group.label) ?? [];
    const subCounts = group.tags
      .map(tag => ({ tag, count: matching.filter(a => getActionTags(a).includes(tag)).length }))
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
